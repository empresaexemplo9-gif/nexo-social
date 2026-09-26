'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../icons';
import { supabase } from '@/lib/supabase';
import { salaDaLinha, youtubeIdDe, type Sala } from '@/lib/comunidade-tipos';

// Sala do grupo: todo mundo ouve a mesma música ou assiste ao mesmo clipe, no
// mesmo segundo.
//
// Como sincroniza: a sala guarda o vídeo, se está tocando e a posição NUM
// INSTANTE do relógio do servidor (community_sessions.updated_at). Cada
// aparelho corrige a diferença do próprio relógio (`offset`) e calcula onde o
// vídeo deveria estar agora; se o player local se afastar mais de ~2 s, ele
// pula para o ponto certo. Play, pausa e pulos feitos por qualquer membro —
// nos nossos botões ou nos do próprio YouTube — viram uma nova versão da sala,
// que chega aos outros pelo Realtime do Supabase (com uma consulta periódica
// de reserva).

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const TOCANDO = 1;
const PAUSADO = 2;
const CARREGANDO = 3;
const FIM = 0;

let apiDoYoutube: Promise<any> | null = null;
function carregarApiDoYoutube(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiDoYoutube) {
    apiDoYoutube = new Promise((resolve) => {
      const anterior = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        anterior?.();
        resolve(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return apiDoYoutube;
}

const EVENTO_SALA = 'nexo:sala';

/** Põe um vídeo para tocar para o grupo inteiro (usado também pelo mural). */
export async function tocarParaOGrupo(
  groupId: string,
  v: { youtubeId: string; title: string | null; kind: 'musica' | 'clipe' },
): Promise<{ ok: boolean; error?: string }> {
  return mudarSala(groupId, { ...v, isPlaying: true, positionSec: 0 });
}

async function mudarSala(groupId: string, corpo: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const t0 = Date.now();
    const res = await fetch(`/api/comunidade/grupos/${groupId}/sala`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
    window.dispatchEvent(new CustomEvent(EVENTO_SALA, { detail: { groupId, sala: json.sala, agora: json.agora, t0, t1: Date.now() } }));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Sem conexão. Tente de novo.' };
  }
}

const mmss = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

interface Achado {
  id: string;
  title: string;
  channel: string;
  thumb: string | null;
}

export default function SalaSincronizada({
  groupId,
  salaInicial,
  agoraInicial,
  meuId,
  meuNome,
  nomes,
}: {
  groupId: string;
  salaInicial: Sala | null;
  agoraInicial: string;
  meuId: string;
  meuNome: string;
  /** id → nome dos membros, para "escolhido por…". */
  nomes: Record<string, string>;
}) {
  const [sala, setSala] = useState<Sala | null>(salaInicial);
  const [precisaToque, setPrecisaToque] = useState(false);
  const [erro, setErro] = useState('');
  const [presentes, setPresentes] = useState<{ id: string; nome: string }[]>([]);
  const [agoraLocal, setAgoraLocal] = useState(0);

  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState<'musica' | 'clipe'>('musica');
  const [achados, setAchados] = useState<Achado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [avisoBusca, setAvisoBusca] = useState('');

  const caixa = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const pronto = useRef(false);
  const salaRef = useRef<Sala | null>(salaInicial);
  // Diferença do relógio do servidor para o do aparelho (ms) e o RTT da melhor medida.
  const offset = useRef(Date.parse(agoraInicial) - Date.now());
  const melhorRtt = useRef(Number.POSITIVE_INFINITY);
  // Mudanças feitas pelo código não são "a pessoa apertou play/pausa".
  const suprimirAte = useRef(0);
  const tocouDesdeQueCarregou = useRef(false);

  const medirRelogio = (agora: string | undefined, t0: number, t1: number) => {
    if (!agora) return;
    const rtt = t1 - t0;
    if (rtt <= melhorRtt.current) {
      melhorRtt.current = rtt;
      offset.current = Date.parse(agora) - (t0 + t1) / 2;
    }
  };

  const esperado = (s: Sala) =>
    s.isPlaying ? s.positionSec + Math.max(0, Date.now() + offset.current - Date.parse(s.updatedAt)) / 1000 : s.positionSec;

  const suprimir = (ms = 1500) => {
    suprimirAte.current = Date.now() + ms;
  };

  // Carimbo da última versão vinda do servidor. A ordem entre versões só usa
  // carimbos do servidor: o da mudança otimista é uma estimativa e, se ficasse
  // adiantado, faria versões legítimas dos outros parecerem velhas.
  const ultimaDoServidor = useRef(salaInicial ? Date.parse(salaInicial.updatedAt) : 0);

  /** Versão nova da sala (do Realtime, da consulta ou do mural): só aceita se for mais nova. */
  const receber = useCallback((s: Sala | null) => {
    const ts = s?.updatedAt ? Date.parse(s.updatedAt) : NaN;
    if (!s || Number.isNaN(ts) || ts <= ultimaDoServidor.current) return;
    ultimaDoServidor.current = ts;
    salaRef.current = s;
    setSala(s);
  }, []);

  const verificarAutoplay = () => {
    // Navegadores bloqueiam som sem um toque na página: aí pedimos o toque.
    setTimeout(() => {
      const p = player.current;
      const s = salaRef.current;
      if (!p || !s?.isPlaying) return;
      const st = p.getPlayerState?.();
      if (st !== TOCANDO && st !== CARREGANDO) setPrecisaToque(true);
    }, 2500);
  };

  /** Leva o player local ao estado da sala. */
  const aplicar = useCallback((s: Sala | null) => {
    const p = player.current;
    if (!p || !pronto.current || !s?.youtubeId) return;
    const alvo = esperado(s);
    suprimir();
    if (p.getVideoData?.()?.video_id !== s.youtubeId) {
      tocouDesdeQueCarregou.current = false;
      if (s.isPlaying) {
        p.loadVideoById({ videoId: s.youtubeId, startSeconds: alvo });
        verificarAutoplay();
      } else {
        p.cueVideoById({ videoId: s.youtubeId, startSeconds: alvo });
      }
      return;
    }
    const cur = p.getCurrentTime?.() || 0;
    const st = p.getPlayerState?.();
    if (s.isPlaying) {
      if (Math.abs(cur - alvo) > 1.5) p.seekTo(alvo, true);
      if (st !== TOCANDO && st !== CARREGANDO) {
        p.playVideo();
        verificarAutoplay();
      }
    } else {
      if (st === TOCANDO || st === CARREGANDO) p.pauseVideo();
      if (Math.abs(cur - alvo) > 1) p.seekTo(alvo, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Uma ação local vira a nova sala de todos. */
  const enviar = useCallback(
    async (patch: { isPlaying: boolean; positionSec: number }) => {
      const s = salaRef.current;
      if (!s) return;
      // Otimista: a sala local já muda; a do servidor confirma em seguida.
      const otimista = { ...s, ...patch, updatedAt: new Date(Date.now() + offset.current).toISOString(), updatedBy: meuId };
      salaRef.current = otimista;
      setSala(otimista);
      const r = await mudarSala(groupId, patch);
      if (!r.ok) setErro(r.error || 'Não deu para atualizar a sala.');
    },
    [groupId, meuId],
  );

  // Player do YouTube: criado quando há algo para tocar.
  const temVideo = Boolean(sala?.youtubeId);
  useEffect(() => {
    if (!temVideo || player.current) return;
    let cancelado = false;
    carregarApiDoYoutube().then((YT) => {
      if (cancelado || !caixa.current || player.current) return;
      const s = salaRef.current;
      // O YT.Player troca o elemento por um iframe: usamos um filho que o
      // React não gerencia.
      const alvo = document.createElement('div');
      caixa.current.appendChild(alvo);
      player.current = new YT.Player(alvo, {
        width: '100%',
        height: '100%',
        videoId: s?.youtubeId ?? undefined,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, start: s ? Math.floor(esperado(s)) : 0 },
        events: {
          onReady: () => {
            pronto.current = true;
            aplicar(salaRef.current);
          },
          onStateChange: (e: any) => {
            const st = e.data;
            if (st === TOCANDO) {
              tocouDesdeQueCarregou.current = true;
              setPrecisaToque(false);
            }
            const atual = salaRef.current;
            if (!atual || Date.now() < suprimirAte.current) return;
            const cur = player.current?.getCurrentTime?.() || 0;
            if (st === TOCANDO && (!atual.isPlaying || Math.abs(cur - esperado(atual)) > 2.5)) {
              enviar({ isPlaying: true, positionSec: cur });
            } else if (
              st === PAUSADO &&
              atual.isPlaying &&
              tocouDesdeQueCarregou.current &&
              // Celular pausa o vídeo quando o app vai para o fundo: isso não
              // é a pessoa pausando para todo mundo.
              document.visibilityState === 'visible'
            ) {
              enviar({ isPlaying: false, positionSec: cur });
            } else if (st === FIM && atual.isPlaying) {
              enviar({ isPlaying: false, positionSec: player.current?.getDuration?.() || cur });
            }
          },
        },
      });
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temVideo]);

  useEffect(
    () => () => {
      try {
        player.current?.destroy?.();
      } catch {
        /* já saiu da página */
      }
      player.current = null;
      pronto.current = false;
    },
    [],
  );

  // Toda versão nova da sala é aplicada no player local.
  useEffect(() => {
    salaRef.current = sala;
    aplicar(sala);
  }, [sala, aplicar]);

  // Tempo real + reserva por consulta + ações vindas do mural.
  useEffect(() => {
    const buscar = async () => {
      try {
        const t0 = Date.now();
        const res = await fetch(`/api/comunidade/grupos/${groupId}/sala`);
        const t1 = Date.now();
        if (!res.ok) return;
        const json = await res.json();
        medirRelogio(json.agora, t0, t1);
        receber(json.sala);
      } catch {
        /* tenta de novo na próxima volta */
      }
    };
    const volta = setInterval(buscar, 8000);

    const doMural = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.groupId !== groupId) return;
      medirRelogio(d.agora, d.t0, d.t1);
      receber(d.sala);
    };
    window.addEventListener(EVENTO_SALA, doMural);

    const aoVoltar = () => {
      if (document.visibilityState === 'visible') {
        buscar();
        aplicar(salaRef.current);
      }
    };
    document.addEventListener('visibilitychange', aoVoltar);

    const sb = supabase;
    const canal = sb
      ?.channel(`sala:${groupId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_sessions', filter: `group_id=eq.${groupId}` }, (p: any) =>
        receber(salaDaLinha(p.new)),
      )
      .subscribe();

    return () => {
      clearInterval(volta);
      window.removeEventListener(EVENTO_SALA, doMural);
      document.removeEventListener('visibilitychange', aoVoltar);
      if (canal && sb) sb.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, receber, aplicar]);

  // Correção de deriva: de tempos em tempos confere se ainda está no segundo certo.
  useEffect(() => {
    const t = setInterval(() => {
      setAgoraLocal(Date.now());
      const p = player.current;
      const s = salaRef.current;
      if (!p || !pronto.current || !s?.isPlaying || p.getPlayerState?.() !== TOCANDO) return;
      const alvo = esperado(s);
      if (Math.abs((p.getCurrentTime?.() || 0) - alvo) > 2) {
        suprimir();
        p.seekTo(alvo, true);
      }
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quem está na sala agora (Presence do Realtime).
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    // Canal privado: o banco só deixa entrar quem é membro (can_use_group_topic).
    let canal: ReturnType<typeof sb.channel> | null = null;
    let vivo = true;
    (async () => {
      await sb.realtime.setAuth().catch(() => undefined);
      if (!vivo) return;
      const c = sb.channel(`grupo:${groupId}:sala`, { config: { private: true, presence: { key: meuId } } });
      canal = c;
      c.on('presence', { event: 'sync' }, () => {
        const estado = c.presenceState() as Record<string, { nome?: string }[]>;
        setPresentes(Object.entries(estado).map(([id, metas]) => ({ id, nome: metas[0]?.nome || 'Alguém' })));
      }).subscribe((status) => {
        if (status === 'SUBSCRIBED') void c.track({ nome: meuNome });
      });
    })();
    return () => {
      vivo = false;
      if (canal) void sb.removeChannel(canal);
    };
  }, [groupId, meuId, meuNome]);

  const entrarNaSala = () => {
    const p = player.current;
    const s = salaRef.current;
    if (!p || !s) return;
    suprimir(2000);
    p.unMute?.();
    p.seekTo(esperado(s), true);
    p.playVideo();
    setPrecisaToque(false);
  };

  const posicaoAtual = () => player.current?.getCurrentTime?.() ?? (sala ? esperado(sala) : 0);

  const alternar = () => {
    if (!sala) return;
    const pos = posicaoAtual();
    if (!sala.isPlaying) {
      // Clique é um gesto da pessoa: aproveita para destravar o som aqui.
      suprimir();
      player.current?.unMute?.();
      player.current?.playVideo?.();
    }
    enviar({ isPlaying: !sala.isPlaying, positionSec: pos });
  };

  const pular = (seg: number) => {
    if (!sala) return;
    enviar({ isPlaying: sala.isPlaying, positionSec: Math.max(0, posicaoAtual() + seg) });
  };

  const procurar = async (e: React.FormEvent) => {
    e.preventDefault();
    const termo = busca.trim();
    if (!termo) return;
    setAvisoBusca('');
    setErro('');
    // Link colado: toca direto.
    const id = youtubeIdDe(termo);
    if (id) {
      const r = await tocarParaOGrupo(groupId, { youtubeId: id, title: null, kind: tipo });
      if (!r.ok) setErro(r.error || 'Não deu para tocar.');
      setBusca('');
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`/api/busca?q=${encodeURIComponent(termo)}&video=1`);
      const json = await res.json().catch(() => ({}));
      setAchados(json.videos || []);
      if (!json.videos?.length) setAvisoBusca(json.videoAviso || 'Nada encontrado no YouTube para esse termo.');
    } catch {
      setAvisoBusca('Sem conexão para buscar agora.');
    } finally {
      setBuscando(false);
    }
  };

  const tocar = async (a: Achado) => {
    setErro('');
    const r = await tocarParaOGrupo(groupId, { youtubeId: a.id, title: a.title, kind: tipo });
    if (!r.ok) setErro(r.error || 'Não deu para tocar.');
    else setAchados([]);
  };

  void agoraLocal; // re-renderiza o relógio da sala a cada volta da deriva
  const quem = sala?.updatedBy ? (sala.updatedBy === meuId ? 'você' : nomes[sala.updatedBy] ?? 'alguém') : null;

  return (
    <section className="card-soft overflow-hidden" aria-label="Sala do grupo">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/70 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-50">
          <Icon name="headphones" size={16} className="text-clay-400" /> Sala: ouvir e assistir juntos
        </h2>
        {presentes.length > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-400" title={presentes.map((p) => p.nome).join(', ')}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            {presentes.length === 1 ? 'Só você na sala' : `${presentes.length} na sala agora`}
            <span className="hidden max-w-[14rem] truncate text-zinc-500 sm:inline">
              · {presentes.map((p) => (p.id === meuId ? 'você' : p.nome)).join(', ')}
            </span>
          </p>
        )}
      </div>

      {/* Player */}
      <div className="relative aspect-video w-full bg-zinc-950">
        <div ref={caixa} className="absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full" />
        {!temVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Icon name="music" size={28} className="text-zinc-600" />
            <p className="text-sm font-medium text-zinc-300">Nada tocando ainda.</p>
            <p className="max-w-sm text-xs text-zinc-500">
              Busque uma música ou um clipe aqui embaixo — ou toque algo do mural. Todo mundo do grupo que estiver na sala ouve e assiste no
              mesmo segundo.
            </p>
          </div>
        )}
        {precisaToque && (
          <button
            onClick={entrarNaSala}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950/75 text-zinc-50 backdrop-blur-sm"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-soft">
              <Icon name="play" size={28} />
            </span>
            <span className="text-sm font-semibold">Entrar na sessão do grupo</span>
            <span className="text-xs text-zinc-300">O navegador pede um toque antes de tocar com som.</span>
          </button>
        )}
      </div>

      <div className="space-y-4 p-5">
        {sala?.youtubeId && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-zinc-500">
                {sala.isPlaying ? (sala.kind === 'musica' ? 'Ouvindo juntos' : 'Assistindo juntos') : 'Pausado para todos'}
                {' · '}
                {mmss(esperado(sala))}
                {quem && ` · por ${quem}`}
              </p>
              <p className="truncate text-sm font-semibold text-zinc-50">{sala.title || 'Vídeo do YouTube'}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => pular(-10)} className="rounded-xl border border-zinc-800 px-2.5 py-2 text-xs text-zinc-300 hover:text-zinc-50" title="Voltar 10 segundos para todos">
                −10s
              </button>
              <button
                onClick={alternar}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
              >
                <Icon name={sala.isPlaying ? 'pause' : 'play'} size={14} /> {sala.isPlaying ? 'Pausar para todos' : 'Tocar para todos'}
              </button>
              <button onClick={() => pular(10)} className="rounded-xl border border-zinc-800 px-2.5 py-2 text-xs text-zinc-300 hover:text-zinc-50" title="Avançar 10 segundos para todos">
                +10s
              </button>
              <button
                onClick={() => {
                  melhorRtt.current = Number.POSITIVE_INFINITY;
                  entrarNaSala();
                }}
                className="rounded-xl border border-zinc-800 p-2 text-zinc-400 hover:text-zinc-50"
                title="Ressincronizar com o grupo"
                aria-label="Ressincronizar com o grupo"
              >
                <Icon name="refresh" size={14} />
              </button>
            </div>
          </div>
        )}

        {erro && <p className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}

        {/* Escolher o que tocar */}
        <form onSubmit={procurar} className="space-y-2">
          <div className="flex gap-1.5" role="radiogroup" aria-label="O que tocar">
            {(
              [
                ['musica', 'Ouvir música', 'music'],
                ['clipe', 'Assistir clipe', 'video'],
              ] as const
            ).map(([id, rotulo, icone]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={tipo === id}
                onClick={() => setTipo(id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  tipo === id ? 'bg-emerald-500/15 text-emerald-300' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Icon name={icone} size={13} /> {rotulo}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={tipo === 'musica' ? 'Música ou artista — ou cole um link do YouTube' : 'Clipe, show, vídeo — ou cole um link do YouTube'}
              className="min-w-0 flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={buscando || !busca.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-emerald-700 disabled:opacity-50"
            >
              <Icon name="search" size={15} /> {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
        </form>
        {avisoBusca && <p className="text-xs text-zinc-500">{avisoBusca}</p>}
        {achados.length > 0 && (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {achados.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => tocar(a)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-2 text-left transition hover:border-emerald-700"
                >
                  {a.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.thumb} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                      <Icon name="video" size={16} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-xs font-medium text-zinc-100">{a.title}</span>
                    <span className="block truncate text-[11px] text-zinc-500">{a.channel}</span>
                  </span>
                  <Icon name="play" size={16} className="shrink-0 text-emerald-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
