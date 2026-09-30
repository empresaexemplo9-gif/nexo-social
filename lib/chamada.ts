'use client';

// Chamadas de áudio e vídeo em grupo ou a dois, só com WebRTC do navegador.
//
// Sem serviço de chamada de terceiros: a voz e a imagem vão direto de um
// aparelho para o outro (malha: cada pessoa conversa com cada uma), cifradas
// de ponta a ponta pelo próprio WebRTC (DTLS-SRTP). O servidor não vê nem
// grava nada. O que passa pelo Supabase Realtime é só a apresentação entre os
// aparelhos (oferta/resposta SDP e candidatos ICE), num canal privado que o
// banco libera apenas para quem participa (can_use_group_topic).
//
// Negociação: "perfect negotiation" (padrão do W3C). Os dois lados podem
// oferecer ao mesmo tempo; o lado "educado" cede na colisão. Assim não importa
// quem entrou primeiro nem a ordem em que a presença chegou.
//
// Qualidade: câmera pedida em 1080p/30, áudio Opus a 48 kHz com cancelamento
// de eco. Na malha a banda de subida se divide entre as pessoas, então o teto
// de cada envio cai conforme a chamada cresce (tetoDeEnvio) — a dois, até
// 4 Mbps por vídeo; o controle de congestionamento do WebRTC ajusta dentro disso.

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export const MAX_PESSOAS = 8;

export type ModoChamada = { tipo: 'grupo' } | { tipo: 'dupla'; outroId: string } | { tipo: 'contato'; outroId: string };

/** Canal privado da chamada (o mesmo nome que o banco autoriza). */
export function topicoDaChamada(groupId: string, meuId: string, modo: ModoChamada): string {
  if (modo.tipo === 'grupo') return `grupo:${groupId}:chamada`;
  const [a, b] = [meuId, modo.outroId].sort();
  // Chamada entre contatos (fora de grupo): o banco autoriza só as duas pessoas.
  if (modo.tipo === 'contato') return `contato:${a}:${b}`;
  return `grupo:${groupId}:dupla:${a}:${b}`;
}

const STUN_PADRAO: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];

/** Servidores ICE: STUN (e TURN próprio, se configurado) vindos do servidor. */
export async function servidoresIce(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch('/api/chamada/ice', { cache: 'no-store' });
    if (!res.ok) return STUN_PADRAO;
    const json = await res.json();
    return Array.isArray(json.iceServers) ? json.iceServers : STUN_PADRAO;
  } catch {
    return STUN_PADRAO;
  }
}

const ehCelular = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function restricoes(video: boolean, frente: 'user' | 'environment' = 'user'): MediaStreamConstraints {
  return {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 },
    video: video
      ? {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: frente,
        }
      : false,
  };
}

/** Teto de envio de cada vídeo, pelo número de pessoas do outro lado. */
export function tetoDeEnvio(outros: number): { video: RTCRtpEncodingParameters; audioBps: number } {
  if (outros <= 1) return { video: { maxBitrate: 4_000_000, scaleResolutionDownBy: 1, maxFramerate: 30 }, audioBps: 96_000 };
  if (outros === 2) return { video: { maxBitrate: 2_500_000, scaleResolutionDownBy: 1, maxFramerate: 30 }, audioBps: 64_000 };
  if (outros <= 4) return { video: { maxBitrate: 1_200_000, scaleResolutionDownBy: 1.5, maxFramerate: 30 }, audioBps: 48_000 };
  return { video: { maxBitrate: 600_000, scaleResolutionDownBy: 2, maxFramerate: 24 }, audioBps: 40_000 };
}

export interface MetaDaPessoa {
  userId: string;
  nome: string;
  audio: boolean;
  video: boolean;
  /** Quando entrou (ms): numa chamada cheia, quem chegou por último sai. */
  desde: number;
}

export interface PessoaNaChamada {
  sessao: string;
  meta: MetaDaPessoa | null;
  stream: MediaStream | null;
  estado: RTCPeerConnectionState;
  /** "1080p · 30 fps" do que chega dela. */
  qualidade: string | null;
  /** Passando por um servidor TURN (a conexão direta não foi possível). */
  retransmitido: boolean;
  falando: boolean;
}

interface Par {
  sessao: string;
  pc: RTCPeerConnection;
  polido: boolean;
  fazendoOferta: boolean;
  ignorandoOferta: boolean;
  pendentes: RTCIceCandidateInit[];
  meta: MetaDaPessoa | null;
  stream: MediaStream | null;
  qualidade: string | null;
  retransmitido: boolean;
  falando: boolean;
  medidor?: { fonte: MediaStreamAudioSourceNode; analisador: AnalyserNode };
}

interface Sinal {
  de: string;
  para: string;
  descricao?: RTCSessionDescriptionInit;
  candidato?: RTCIceCandidateInit;
}

const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/** VP9 primeiro no computador (mais nitidez por bit); no celular, o padrão (H.264 por hardware). */
function preferirCodecs(tr: RTCRtpTransceiver) {
  if (ehCelular() || typeof RTCRtpSender === 'undefined' || !RTCRtpSender.getCapabilities || !tr.setCodecPreferences) return;
  const caps = RTCRtpSender.getCapabilities('video')?.codecs;
  if (!caps?.some((c) => c.mimeType === 'video/VP9')) return;
  const ordem = [...caps].sort((a, b) => Number(b.mimeType === 'video/VP9') - Number(a.mimeType === 'video/VP9'));
  try {
    tr.setCodecPreferences(ordem);
  } catch {
    /* navegador não aceita: fica o padrão */
  }
}

export class ChamadaMesh {
  readonly sessao: string = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2);
  local: MediaStream | null = null;
  audio = true;
  video = true;
  frente: 'user' | 'environment' = 'user';
  cheia = false;
  meFalando = false;

  private canal: RealtimeChannel | null = null;
  private pares = new Map<string, Par>();
  private relogio: ReturnType<typeof setInterval> | null = null;
  private medidores: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;
  private meuMedidor?: AnalyserNode;
  private saiu = false;
  private desde = Date.now();

  constructor(
    private sb: SupabaseClient,
    private topico: string,
    private eu: { userId: string; nome: string },
    private ice: RTCIceServer[],
    private aoMudar: () => void,
  ) {}

  /** Pede câmera/microfone e entra no canal. Sem câmera (ou negada), entra só com voz. */
  async entrar(comVideo: boolean) {
    this.video = comVideo;
    try {
      this.local = await navigator.mediaDevices.getUserMedia(restricoes(comVideo, this.frente));
    } catch (e) {
      if (!comVideo) throw erroDeMidia(e);
      // Câmera negada ou ocupada: segue só com o microfone.
      this.local = await navigator.mediaDevices.getUserMedia(restricoes(false)).catch((e2) => {
        throw erroDeMidia(e2);
      });
      this.video = false;
    }
    if (this.saiu) return this.pararMidia();
    this.local.getVideoTracks().forEach((t) => (t.contentHint = 'motion'));
    this.local.getAudioTracks().forEach((t) => (t.contentHint = 'speech'));
    this.medirMinhaVoz();

    // Um canal por tópico no cliente: se o observador da chamada ainda está
    // saindo, espera ele sair para não herdar o canal dele.
    for (let i = 0; i < 20 && this.sb.getChannels().some((c) => c.topic === `realtime:${this.topico}`); i++) await espera(100);
    for (const c of this.sb.getChannels().filter((c) => c.topic === `realtime:${this.topico}`)) await this.sb.removeChannel(c);

    await this.sb.realtime.setAuth();
    const canal = this.sb.channel(this.topico, {
      config: { private: true, broadcast: { self: false }, presence: { key: this.sessao } },
    });
    canal.on('presence', { event: 'sync' }, () => this.sincronizar());
    canal.on('broadcast', { event: 'sinal' }, ({ payload }) => void this.aoSinal(payload as Sinal));
    this.canal = canal;
    await new Promise<void>((ok, falha) => {
      const limite = setTimeout(() => falha(new Error('A chamada não conectou. Verifique a internet e tente de novo.')), 15_000);
      canal.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(limite);
          await canal.track(this.meta());
          ok();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(limite);
          falha(new Error('Sem permissão para entrar nesta chamada (ou o canal não respondeu).'));
        }
      });
    });
    this.relogio = setInterval(() => void this.medirQualidade(), 3000);
  }

  pessoas(): PessoaNaChamada[] {
    return Array.from(this.pares.values()).map((p) => ({
      sessao: p.sessao,
      meta: p.meta,
      stream: p.stream,
      estado: p.pc.connectionState,
      qualidade: p.qualidade,
      retransmitido: p.retransmitido,
      falando: p.falando,
    }));
  }

  private meta(): MetaDaPessoa {
    return { userId: this.eu.userId, nome: this.eu.nome, audio: this.audio, video: this.video, desde: this.desde };
  }

  private sincronizar() {
    if (!this.canal || this.saiu) return;
    const estado = this.canal.presenceState<MetaDaPessoa>();
    const presentes = new Map<string, MetaDaPessoa>();
    for (const [sessao, metas] of Object.entries(estado)) {
      const m = metas[metas.length - 1] as unknown as MetaDaPessoa | undefined;
      if (m) presentes.set(sessao, m);
    }
    // Cheia: quem chegou por último sai (a malha pesa demais além disso).
    if (presentes.size > MAX_PESSOAS) {
      const ordem = Array.from(presentes.entries())
        .sort(([a, ma], [b, mb]) => (ma.desde ?? 0) - (mb.desde ?? 0) || a.localeCompare(b))
        .map(([s]) => s);
      if (ordem.indexOf(this.sessao) >= MAX_PESSOAS) {
        this.cheia = true;
        this.aoMudar();
        void this.sair();
        return;
      }
    }
    for (const [sessao, meta] of Array.from(presentes.entries())) {
      if (sessao === this.sessao) continue;
      const par = this.pares.get(sessao) ?? this.criarPar(sessao);
      par.meta = meta;
    }
    for (const sessao of Array.from(this.pares.keys())) if (!presentes.has(sessao)) this.fecharPar(sessao);
    this.aplicarTetos();
    this.aoMudar();
  }

  private criarPar(sessao: string): Par {
    const pc = new RTCPeerConnection({ iceServers: this.ice, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' });
    const par: Par = {
      sessao,
      pc,
      polido: this.sessao > sessao,
      fazendoOferta: false,
      ignorandoOferta: false,
      pendentes: [],
      meta: null,
      stream: null,
      qualidade: null,
      retransmitido: false,
      falando: false,
    };
    this.pares.set(sessao, par);

    const local = this.local!;
    for (const t of local.getTracks()) pc.addTrack(t, local);
    // Entrou só com voz: reserva o vídeo (recebe o dos outros e liga a própria
    // câmera depois sem renegociar).
    if (!local.getVideoTracks().length) pc.addTransceiver('video', { direction: 'sendrecv', streams: [local] });
    pc.getTransceivers().filter((t) => t.receiver.track.kind === 'video').forEach(preferirCodecs);

    pc.ontrack = (e) => {
      const faixas = (par.stream?.getTracks() ?? []).filter((t) => t.kind !== e.track.kind);
      par.stream = new MediaStream([...faixas, e.track]);
      if (e.track.kind === 'audio') this.medirVoz(par);
      e.track.onunmute = () => this.aoMudar();
      this.aoMudar();
    };
    pc.onnegotiationneeded = async () => {
      try {
        par.fazendoOferta = true;
        await pc.setLocalDescription();
        this.enviar({ para: sessao, descricao: pc.localDescription!.toJSON() });
      } catch (e) {
        console.warn('[chamada] oferta', e);
      } finally {
        par.fazendoOferta = false;
      }
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.enviar({ para: sessao, candidato: candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') pc.restartIce();
      if (pc.connectionState === 'connected') this.aplicarTetos();
      this.aoMudar();
    };
    return par;
  }

  private async aoSinal(s: Sinal) {
    if (this.saiu || s.para !== this.sessao || s.de === this.sessao) return;
    let par = this.pares.get(s.de);
    if (!par) {
      if (s.descricao?.type !== 'offer') return;
      par = this.criarPar(s.de);
    }
    const pc = par.pc;
    try {
      if (s.descricao) {
        const colisao = s.descricao.type === 'offer' && (par.fazendoOferta || pc.signalingState !== 'stable');
        par.ignorandoOferta = !par.polido && colisao;
        if (par.ignorandoOferta) return;
        await pc.setRemoteDescription(s.descricao);
        for (const c of par.pendentes.splice(0)) await pc.addIceCandidate(c).catch(() => undefined);
        if (s.descricao.type === 'offer') {
          await pc.setLocalDescription();
          this.enviar({ para: s.de, descricao: pc.localDescription!.toJSON() });
        }
      } else if (s.candidato) {
        if (!pc.remoteDescription) {
          par.pendentes.push(s.candidato);
          return;
        }
        await pc.addIceCandidate(s.candidato).catch((e) => {
          if (!par!.ignorandoOferta) console.warn('[chamada] candidato', e);
        });
      }
    } catch (e) {
      console.warn('[chamada] sinal', e);
    }
  }

  private enviar(s: Omit<Sinal, 'de'>) {
    void this.canal?.send({ type: 'broadcast', event: 'sinal', payload: { ...s, de: this.sessao } });
  }

  private fecharPar(sessao: string) {
    const par = this.pares.get(sessao);
    if (!par) return;
    par.medidor?.fonte.disconnect();
    par.pc.close();
    this.pares.delete(sessao);
  }

  /** Tetos de envio conforme o tamanho da chamada. */
  private aplicarTetos() {
    const teto = tetoDeEnvio(this.pares.size);
    for (const par of Array.from(this.pares.values())) {
      for (const sender of par.pc.getSenders()) {
        const kind = sender.track?.kind;
        if (!kind) continue;
        const p = sender.getParameters();
        if (!p.encodings?.length) continue;
        if (kind === 'video') {
          p.encodings[0] = { ...p.encodings[0], ...teto.video };
          // Na chamada, melhor perder resolução que travar o movimento.
          (p as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = 'balanced';
        } else {
          p.encodings[0] = { ...p.encodings[0], maxBitrate: teto.audioBps };
        }
        sender.setParameters(p).catch(() => undefined);
      }
    }
  }

  private async medirQualidade() {
    for (const par of Array.from(this.pares.values())) {
      try {
        const stats = await par.pc.getStats();
        let q: string | null = null;
        let retransmitido = false;
        const candidatos = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
        stats.forEach((r: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (r.type === 'inbound-rtp' && r.kind === 'video' && r.frameHeight) {
            q = `${r.frameHeight}p${r.framesPerSecond ? ` · ${Math.round(r.framesPerSecond)} fps` : ''}`;
          }
          if (r.type === 'local-candidate' || r.type === 'remote-candidate') candidatos.set(r.id, r);
        });
        stats.forEach((r: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') {
            retransmitido = candidatos.get(r.localCandidateId)?.candidateType === 'relay' || candidatos.get(r.remoteCandidateId)?.candidateType === 'relay';
          }
        });
        par.qualidade = q;
        par.retransmitido = retransmitido;
      } catch {
        /* conexão fechando */
      }
    }
    this.aoMudar();
  }

  // --- Quem está falando (destaque no quadro) ------------------------------
  private contexto(): AudioContext | null {
    if (this.audioCtx) return this.audioCtx;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    this.audioCtx = new Ctx();
    this.medidores = setInterval(() => this.lerMedidores(), 250);
    return this.audioCtx;
  }

  private analisador(stream: MediaStream) {
    const ctx = this.contexto();
    if (!ctx || !stream.getAudioTracks().length) return null;
    const fonte = ctx.createMediaStreamSource(stream);
    const analisador = ctx.createAnalyser();
    analisador.fftSize = 512;
    fonte.connect(analisador);
    return { fonte, analisador };
  }

  private medirMinhaVoz() {
    if (this.local) this.meuMedidor = this.analisador(this.local)?.analisador;
  }

  private medirVoz(par: Par) {
    par.medidor?.fonte.disconnect();
    par.medidor = (par.stream && this.analisador(par.stream)) || undefined;
  }

  private lerMedidores() {
    const nivel = (a?: AnalyserNode) => {
      if (!a) return 0;
      const dados = new Uint8Array(a.fftSize);
      a.getByteTimeDomainData(dados);
      let soma = 0;
      for (let i = 0; i < dados.length; i++) soma += ((dados[i] - 128) / 128) ** 2;
      return Math.sqrt(soma / dados.length);
    };
    let mudou = false;
    const eu = this.audio && nivel(this.meuMedidor) > 0.04;
    if (eu !== this.meFalando) {
      this.meFalando = eu;
      mudou = true;
    }
    for (const par of Array.from(this.pares.values())) {
      const f = nivel(par.medidor?.analisador) > 0.04;
      if (f !== par.falando) {
        par.falando = f;
        mudou = true;
      }
    }
    if (mudou) this.aoMudar();
  }

  // --- Controles --------------------------------------------------------------
  alternarAudio() {
    this.audio = !this.audio;
    this.local?.getAudioTracks().forEach((t) => (t.enabled = this.audio));
    void this.canal?.track(this.meta());
    this.aoMudar();
  }

  private transceptoresDeVideo() {
    return Array.from(this.pares.values()).flatMap((p) => p.pc.getTransceivers().filter((t) => t.receiver.track.kind === 'video'));
  }

  async alternarVideo() {
    if (!this.local) return;
    if (this.video) {
      // Desligar solta a câmera de verdade (a luz dela apaga).
      for (const t of this.local.getVideoTracks()) {
        t.stop();
        this.local.removeTrack(t);
      }
      await Promise.all(this.transceptoresDeVideo().map((tr) => tr.sender.replaceTrack(null)));
      this.video = false;
    } else {
      const s = await navigator.mediaDevices.getUserMedia({ video: restricoes(true, this.frente).video });
      const t = s.getVideoTracks()[0];
      t.contentHint = 'motion';
      this.local.addTrack(t);
      await Promise.all(this.transceptoresDeVideo().map((tr) => tr.sender.replaceTrack(t)));
      this.video = true;
    }
    void this.canal?.track(this.meta());
    this.aplicarTetos();
    this.aoMudar();
  }

  /** Câmera da frente ↔ traseira (celular). */
  async trocarCamera() {
    if (!this.local || !this.video) return;
    this.frente = this.frente === 'user' ? 'environment' : 'user';
    const s = await navigator.mediaDevices.getUserMedia({ video: restricoes(true, this.frente).video });
    const nova = s.getVideoTracks()[0];
    nova.contentHint = 'motion';
    for (const antiga of this.local.getVideoTracks()) {
      antiga.stop();
      this.local.removeTrack(antiga);
    }
    this.local.addTrack(nova);
    await Promise.all(this.transceptoresDeVideo().map((tr) => tr.sender.replaceTrack(nova)));
    this.aoMudar();
  }

  private pararMidia() {
    this.local?.getTracks().forEach((t) => t.stop());
  }

  async sair() {
    if (this.saiu) return;
    this.saiu = true;
    if (this.relogio) clearInterval(this.relogio);
    if (this.medidores) clearInterval(this.medidores);
    for (const s of Array.from(this.pares.keys())) this.fecharPar(s);
    this.pararMidia();
    void this.audioCtx?.close().catch(() => undefined);
    const canal = this.canal;
    this.canal = null;
    if (canal) {
      await canal.untrack().catch(() => undefined);
      await this.sb.removeChannel(canal).catch(() => undefined);
    }
  }
}

function erroDeMidia(e: unknown): Error {
  const nome = (e as { name?: string })?.name;
  if (nome === 'NotAllowedError') return new Error('Permita o uso do microfone (e da câmera) para entrar na chamada.');
  if (nome === 'NotFoundError') return new Error('Nenhum microfone encontrado neste aparelho.');
  if (nome === 'NotReadableError') return new Error('O microfone ou a câmera estão sendo usados por outro app.');
  return new Error('Não deu para acessar o microfone e a câmera.');
}
