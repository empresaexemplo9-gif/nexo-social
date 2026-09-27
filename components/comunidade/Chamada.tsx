'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../icons';
import Avatar from '../Avatar';
import { supabase } from '@/lib/supabase';
import { ChamadaMesh, MAX_PESSOAS, servidoresIce, topicoDaChamada, type ModoChamada, type PessoaNaChamada } from '@/lib/chamada';

const CLARO = 'text-[#f6f2ea]';

/** Um quadro: vídeo da pessoa, ou a foto dela quando a câmera está desligada. */
function Quadro({
  stream,
  nome,
  avatarPath,
  eu = false,
  espelhar = false,
  comVideo,
  micLigado,
  falando,
  qualidade,
  aviso,
  encaixe = 'cover',
  className = '',
}: {
  stream: MediaStream | null;
  nome: string;
  avatarPath?: string | null;
  eu?: boolean;
  espelhar?: boolean;
  comVideo: boolean;
  micLigado: boolean;
  falando: boolean;
  qualidade?: string | null;
  aviso?: string | null;
  encaixe?: 'cover' | 'contain';
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  // Até o primeiro quadro chegar, mostra a foto da pessoa (e não um retângulo vazio).
  const [comImagem, setComImagem] = useState(false);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (v.srcObject !== stream) v.srcObject = stream;
    setComImagem(v.videoWidth > 0);
    if (stream) v.play().catch(() => undefined);
  }, [stream]);
  const mostrarVideo = comVideo && comImagem;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#1b1c20] transition-shadow ${
        falando ? 'shadow-[0_0_0_3px_rgba(106,140,192,0.95)]' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.06)]'
      } ${className}`}
    >
      {/* O <video> fica sempre montado: é ele que toca o áudio da pessoa. */}
      <video
        ref={video}
        autoPlay
        playsInline
        muted={eu}
        onLoadedData={() => setComImagem(true)}
        onResize={() => setComImagem(true)}
        className={`h-full w-full ${encaixe === 'contain' ? 'object-contain' : 'object-cover'} ${espelhar ? '-scale-x-100' : ''} ${
          comVideo ? '' : 'invisible'
        }`}
      />
      {!mostrarVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Avatar nome={nome} path={avatarPath} tamanho={88} />
          {comVideo && <span className="h-1.5 w-10 animate-pulse rounded-full bg-white/20" aria-label="carregando o vídeo" />}
        </div>
      )}
      <div className={`absolute inset-x-2 bottom-2 flex items-center gap-1.5 text-xs ${CLARO}`}>
        <span className="flex min-w-0 items-center gap-1.5 rounded-lg bg-black/55 px-2 py-1">
          {!micLigado && (
            <span role="img" aria-label="microfone desligado" className="shrink-0">
              <Icon name="micOff" size={13} className="text-[#fca5a5]" />
            </span>
          )}
          <span className="truncate">{eu ? `${nome} (você)` : nome}</span>
        </span>
        {qualidade && <span className="ml-auto rounded-lg bg-black/55 px-2 py-1 font-mono text-[10px] opacity-80">{qualidade}</span>}
      </div>
      {aviso && (
        <div className={`absolute inset-x-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-[11px] ${CLARO}`}>{aviso}</div>
      )}
    </div>
  );
}

function Botao({
  onClick,
  ativo = true,
  perigo = false,
  rotulo,
  icone,
}: {
  onClick: () => void;
  ativo?: boolean;
  perigo?: boolean;
  rotulo: string;
  icone: Parameters<typeof Icon>[0]['name'];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={!perigo ? !ativo : undefined}
      className={"action-collage " + (`flex h-12 w-12 items-center justify-center rounded-full transition sm:h-14 sm:w-14 ${
        perigo ? 'bg-[#dc2626] text-white hover:bg-[#ef4444]' : ativo ? 'bg-white/10 text-[#f6f2ea] hover:bg-white/20' : 'bg-[#f6f2ea] text-[#16181d]'
      }`)}
    >
      <Icon name={icone} size={22} />
    </button>
  );
}

const tempo = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * A chamada em tela cheia. A dois: a outra pessoa grande e você no canto. Em
 * grupo: todo mundo em grade. Sair (ou fechar a página) encerra a sua parte.
 */
export default function Chamada({
  groupId,
  titulo,
  meuId,
  meuNome,
  modo,
  comVideo,
  pessoas,
  onSair,
}: {
  groupId: string;
  titulo: string;
  meuId: string;
  meuNome: string;
  modo: ModoChamada;
  comVideo: boolean;
  /** id → nome e foto, para os quadros sem câmera. */
  pessoas: Record<string, { name: string; avatarPath: string | null }>;
  onSair: () => void;
}) {
  const [fase, setFase] = useState<'entrando' | 'na-chamada' | 'erro'>('entrando');
  const [erro, setErro] = useState('');
  const [, setVersao] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [variasCameras, setVariasCameras] = useState(false);
  const mesh = useRef<ChamadaMesh | null>(null);
  const tela = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = supabase;
    if (!sb) {
      setErro('Chamadas precisam do Supabase configurado.');
      setFase('erro');
      return;
    }
    let vivo = true;
    let m: ChamadaMesh | null = null;
    (async () => {
      try {
        const ice = await servidoresIce();
        if (!vivo) return;
        m = new ChamadaMesh(sb, topicoDaChamada(groupId, meuId, modo), { userId: meuId, nome: meuNome }, ice, () => setVersao((v) => v + 1));
        mesh.current = m;
        await m.entrar(comVideo);
        if (!vivo) return;
        setFase('na-chamada');
        const dispositivos = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        setVariasCameras(dispositivos.filter((d) => d.kind === 'videoinput').length > 1);
      } catch (e: any) {
        if (!vivo) return;
        setErro(e?.message || 'Não deu para entrar na chamada.');
        setFase('erro');
        void m?.sair();
      }
    })();
    const aoFechar = () => void m?.sair();
    window.addEventListener('pagehide', aoFechar);
    return () => {
      vivo = false;
      window.removeEventListener('pagehide', aoFechar);
      void m?.sair();
      mesh.current = null;
    };
    // A chamada vive enquanto a tela estiver aberta: não reinicia por props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fase !== 'na-chamada') return;
    const inicio = Date.now();
    const t = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(t);
  }, [fase]);

  // Esc não fecha a chamada por engano; a tela cheia sai sozinha com Esc.
  const telaCheia = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void tela.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  const sair = async () => {
    await mesh.current?.sair();
    onSair();
  };

  const m = mesh.current;
  const outros: PessoaNaChamada[] = m?.pessoas() ?? [];
  const nomeDe = (p: PessoaNaChamada) => p.meta?.nome ?? pessoas[p.meta?.userId ?? '']?.name ?? 'Alguém';
  const fotoDe = (p: PessoaNaChamada) => pessoas[p.meta?.userId ?? '']?.avatarPath ?? null;
  const avisoDe = (p: PessoaNaChamada) =>
    p.estado === 'failed'
      ? 'Não conectou: a rede de um dos dois bloqueia a conexão direta.'
      : p.estado === 'new' || p.estado === 'connecting'
        ? 'Conectando…'
        : p.retransmitido
          ? 'Via servidor TURN'
          : null;
  const temVideo = (p: PessoaNaChamada) => Boolean(p.meta?.video && p.stream?.getVideoTracks().length);

  const meuQuadro = (classe: string, encaixe: 'cover' | 'contain' = 'cover') => (
    <Quadro
      stream={m?.local ?? null}
      nome={meuNome}
      avatarPath={pessoas[meuId]?.avatarPath}
      eu
      espelhar={m?.frente === 'user'}
      comVideo={Boolean(m?.video)}
      micLigado={m?.audio ?? true}
      falando={Boolean(m?.meFalando)}
      encaixe={encaixe}
      className={classe}
    />
  );
  const quadroDe = (p: PessoaNaChamada, classe: string, encaixe: 'cover' | 'contain' = 'cover') => (
    <Quadro
      key={p.sessao}
      stream={p.stream}
      nome={nomeDe(p)}
      avatarPath={fotoDe(p)}
      comVideo={temVideo(p)}
      micLigado={p.meta?.audio ?? true}
      falando={p.falando}
      qualidade={p.qualidade}
      aviso={avisoDe(p)}
      encaixe={encaixe}
      className={classe}
    />
  );

  const total = outros.length + 1;
  const colunas = total <= 2 ? 'sm:grid-cols-2' : total <= 4 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';

  // Direto no <body>: fora de qualquer espaçamento ou empilhamento da página.
  return createPortal(
    <div
      ref={tela}
      className={`fixed inset-0 z-[75] flex flex-col bg-[#0b0b0c] ${CLARO}`}
      role="dialog"
      aria-modal="true"
      aria-label="Chamada"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{titulo}</p>
          <p className="text-[11px] opacity-70">
            {fase === 'entrando'
              ? 'Entrando…'
              : fase === 'erro'
                ? 'Chamada encerrada'
                : `${tempo(segundos)} · ${total} ${total === 1 ? 'pessoa' : 'pessoas'} · ponta a ponta, sem servidor de mídia`}
          </p>
        </div>
        <button onClick={telaCheia} className="action-collage action-collage--paper rounded-xl p-2 opacity-80 hover:bg-white/10" aria-label="Tela cheia" title="Tela cheia">
          <Icon name="maximize" size={18} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 px-3 pb-3">
        {fase === 'erro' || m?.cheia ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Icon name="alert" size={28} className="opacity-70" />
            <p className="max-w-sm text-sm">{m?.cheia ? `A chamada está cheia (até ${MAX_PESSOAS} pessoas).` : erro}</p>
            <button onClick={onSair} className="action-collage rounded-xl bg-white/15 px-4 py-2 text-sm hover:bg-white/25">
              Fechar
            </button>
          </div>
        ) : outros.length === 0 ? (
          <div className="relative h-full">
            {meuQuadro('h-full w-full')}
            <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 text-center">
              <span className="h-3 w-3 animate-ping rounded-full bg-[#6a8cc0]" />
              <p className="rounded-xl bg-black/50 px-3 py-1.5 text-sm">
                {fase === 'entrando'
                  ? 'Preparando câmera e microfone…'
                  : modo.tipo === 'dupla'
                    ? `Chamando ${pessoas[modo.outroId]?.name ?? 'a pessoa'}…`
                    : 'Aguardando o grupo entrar…'}
              </p>
            </div>
          </div>
        ) : outros.length === 1 ? (
          <div className="relative h-full">
            {quadroDe(outros[0], 'h-full w-full', 'contain')}
            {/* Você no canto (o quadro é relative; quem posiciona é o invólucro). */}
            <div className="absolute bottom-3 right-3 aspect-[3/4] w-28 sm:aspect-video sm:w-56">{meuQuadro('h-full w-full')}</div>
          </div>
        ) : (
          <div className={`grid h-full auto-rows-fr grid-cols-1 gap-2 ${colunas}`}>
            {meuQuadro('h-full min-h-0 w-full')}
            {outros.map((p) => quadroDe(p, 'h-full min-h-0 w-full'))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-4 pb-4 pt-1 sm:gap-4">
        {fase === 'na-chamada' && m && !m.cheia && (
          <>
            <Botao
              onClick={() => m.alternarAudio()}
              ativo={m.audio}
              rotulo={m.audio ? 'Desligar microfone' : 'Ligar microfone'}
              icone={m.audio ? 'mic' : 'micOff'}
            />
            <Botao
              onClick={() => void m.alternarVideo().catch((e) => setErro(e?.message || 'Câmera indisponível.'))}
              ativo={m.video}
              rotulo={m.video ? 'Desligar câmera' : 'Ligar câmera'}
              icone={m.video ? 'video' : 'videoOff'}
            />
            {variasCameras && m.video && <Botao onClick={() => void m.trocarCamera()} rotulo="Trocar câmera" icone="cameraSwitch" />}
          </>
        )}
        <Botao onClick={() => void sair()} perigo rotulo="Sair da chamada" icone="phoneOff" />
      </div>
    </div>,
    document.body,
  );
}

/**
 * Quem está na chamada do grupo agora — sem entrar nela (assiste à presença do
 * canal privado sem se anunciar). Desligado enquanto a própria pessoa está na
 * chamada: um tópico, um canal por cliente.
 */
export function usePresencaDaChamada(groupId: string, ligado: boolean) {
  const [presentes, setPresentes] = useState<{ userId: string; nome: string }[]>([]);
  useEffect(() => {
    const sb = supabase;
    if (!sb || !ligado) {
      setPresentes([]);
      return;
    }
    let vivo = true;
    let canal: ReturnType<typeof sb.channel> | null = null;
    (async () => {
      await sb.realtime.setAuth().catch(() => undefined);
      if (!vivo) return;
      canal = sb.channel(`grupo:${groupId}:chamada`, { config: { private: true } });
      canal
        .on('presence', { event: 'sync' }, () => {
          const estado = canal!.presenceState() as Record<string, { userId?: string; nome?: string }[]>;
          const porPessoa = new Map<string, string>();
          for (const metas of Object.values(estado)) {
            const m = metas[metas.length - 1];
            if (m?.userId) porPessoa.set(m.userId, m.nome ?? 'Alguém');
          }
          setPresentes(Array.from(porPessoa.entries()).map(([userId, nome]) => ({ userId, nome })));
        })
        .subscribe();
    })();
    return () => {
      vivo = false;
      if (canal) void sb.removeChannel(canal);
    };
  }, [groupId, ligado]);
  return presentes;
}
