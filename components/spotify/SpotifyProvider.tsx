'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../icons';
import BarraDoPlayer from './BarraDoPlayer';

/*
 * Player do Spotify dentro da nexo.social.
 *
 * Três jeitos de ouvir, do Spotify e não nossos:
 *   - sem conta: o player embutido toca prévias de 30 s;
 *   - conta grátis: completas, com anúncios, no app do Spotify (o Spotify não
 *     libera o player dentro de outros sites para o plano grátis);
 *   - Premium: a pessoa entra com o Spotify aqui e o Web Playback SDK toca as
 *     faixas completas, sem anúncios, sem sair da plataforma.
 *
 * Fica no layout raiz para a música seguir tocando entre as páginas.
 */

/* Tipos mínimos do Web Playback SDK (https://sdk.scdn.co/spotify-player.js). */
interface SdkFaixa {
  uri: string;
  id: string | null;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  linked_from?: { id: string | null; uri: string | null };
}
interface SdkEstado {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: SdkFaixa | null; previous_tracks: SdkFaixa[]; next_tracks: SdkFaixa[] };
}
interface SdkPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(evento: string, cb: (arg: any) => void): boolean; // eslint-disable-line @typescript-eslint/no-explicit-any
  togglePlay(): Promise<void>;
  pause(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  seek(ms: number): Promise<void>;
  activateElement?(): Promise<void>;
}
declare global {
  interface Window {
    Spotify?: {
      Player: new (o: { name: string; getOAuthToken: (cb: (token: string) => void) => void; volume?: number }) => SdkPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export type StatusSpotify =
  /** sem conta do Spotify ligada (ou login não configurado) */
  | 'desligado'
  /** conta ligada, carregando o player */
  | 'conectando'
  /** Premium: toca aqui dentro, completo e sem anúncios */
  | 'pronto'
  /** conta grátis: o Spotify não libera o player fora do app */
  | 'sem-premium'
  /** navegador sem o necessário (comum no celular) */
  | 'sem-suporte';

export interface FaixaTocando {
  /** id da faixa como pedimos (antes de o Spotify trocar por outra edição) */
  id: string | null;
  nome: string;
  artista: string;
  imagem: string | null;
  duracao: number;
}

export interface Reproducao {
  faixa: FaixaTocando;
  pausado: boolean;
  /** posição (ms) no instante `em` */
  posicao: number;
  em: number;
  temProxima: boolean;
  temAnterior: boolean;
}

/** O que tocar: uma lista de faixas (começando por `inicio`) ou uma playlist. */
export interface AlvoDeReproducao {
  uris?: string[];
  contexto?: string;
  inicio?: string;
}

interface Contexto {
  status: StatusSpotify;
  nome: string | null;
  reproducao: Reproducao | null;
  entrar: (volta?: string) => void;
  sair: () => Promise<void>;
  tocar: (alvo: AlvoDeReproducao) => Promise<boolean>;
  alternar: () => void;
  proxima: () => void;
  anterior: () => void;
  buscar: (ms: number) => void;
  fechar: () => void;
}

const SpotifyCtx = createContext<Contexto | null>(null);

export function useSpotify(): Contexto {
  const ctx = useContext(SpotifyCtx);
  if (!ctx) throw new Error('useSpotify precisa do <SpotifyProvider>.');
  return ctx;
}

const SDK = 'https://sdk.scdn.co/spotify-player.js';
const API = 'https://api.spotify.com/v1';

/** Como o login no Spotify terminou (a rota de retorno põe ?spotify= na URL). */
const AVISOS: Record<string, { texto: string; erro: boolean }> = {
  conectado: { texto: 'Spotify conectado.', erro: false },
  recusado: { texto: 'Login no Spotify cancelado — nada foi ligado.', erro: true },
  'nao-liberado': {
    texto:
      'Sua conta do Spotify ainda não foi liberada no app da nexo.social. Enquanto o app estiver no modo de desenvolvimento do Spotify, só entram as contas cadastradas no painel do Spotify.',
    erro: true,
  },
  falhou: { texto: 'Não deu para conectar ao Spotify agora. Tente de novo.', erro: true },
  off: { texto: 'O login com Spotify ainda não foi configurado na plataforma.', erro: true },
};

/** O servidor deixa este cookie (sem nada secreto) quando há conta ligada. */
function temContaLigada(): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith('nexo_spotify_on='));
}

function carregarSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  return new Promise((ok, falha) => {
    window.onSpotifyWebPlaybackSDKReady = () => ok();
    if (document.querySelector(`script[src="${SDK}"]`)) return;
    const s = document.createElement('script');
    s.src = SDK;
    s.async = true;
    s.onerror = () => falha(new Error('Não foi possível carregar o player do Spotify.'));
    document.body.appendChild(s);
  });
}

function converter(s: SdkEstado | null): Reproducao | null {
  const f = s?.track_window?.current_track;
  if (!s || !f) return null;
  return {
    faixa: {
      id: f.linked_from?.id || f.id,
      nome: f.name,
      artista: f.artists.map((a) => a.name).join(', '),
      imagem: f.album.images[0]?.url ?? null,
      duracao: s.duration || f.duration_ms,
    },
    pausado: s.paused,
    posicao: s.position,
    em: Date.now(),
    temProxima: s.track_window.next_tracks.length > 0,
    temAnterior: s.track_window.previous_tracks.length > 0,
  };
}

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<StatusSpotify>('desligado');
  const [nome, setNome] = useState<string | null>(null);
  const [reproducao, setReproducao] = useState<Reproducao | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  const player = useRef<SdkPlayer | null>(null);
  const dispositivo = useRef<string | null>(null);
  const token = useRef<{ valor: string; expiraEm: number } | null>(null);

  /** Token da pessoa, renovado pelo servidor quando está para vencer. */
  const pegarToken = useCallback(async (): Promise<string | null> => {
    if (token.current && token.current.expiraEm > Date.now() + 60_000) return token.current.valor;
    try {
      const res = await fetch('/api/spotify/token', { cache: 'no-store' });
      const json = await res.json();
      if (!json.conectado) {
        token.current = null;
        setStatus('desligado');
        return null;
      }
      token.current = { valor: json.token, expiraEm: json.expiraEm };
      setNome(json.nome ?? null);
      return json.token;
    } catch {
      return null;
    }
  }, []);

  // Aviso do login que acabou de terminar — e limpa a URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    const desfecho = url.searchParams.get('spotify');
    if (!desfecho) return;
    url.searchParams.delete('spotify');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    if (AVISOS[desfecho]) setAviso(AVISOS[desfecho]);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), aviso.erro ? 12_000 : 5_000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Liga o player quando há conta do Spotify ligada neste navegador.
  useEffect(() => {
    if (!temContaLigada()) return;
    let vivo = true;
    let espera: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const t = await pegarToken();
      if (!t || !vivo) return;
      setStatus('conectando');
      try {
        await carregarSdk();
      } catch {
        if (vivo) setStatus('sem-suporte');
        return;
      }
      if (!vivo || !window.Spotify) return;

      const p = new window.Spotify.Player({
        name: 'nexo.social',
        getOAuthToken: (cb) => {
          void pegarToken().then((v) => v && cb(v));
        },
        volume: 0.8,
      });
      p.addListener('ready', ({ device_id }: { device_id: string }) => {
        dispositivo.current = device_id;
        clearTimeout(espera);
        setStatus('pronto');
      });
      p.addListener('not_ready', () => {
        dispositivo.current = null;
      });
      // Navegador sem DRM (Widevine) ou sem suporte — comum no celular.
      p.addListener('initialization_error', () => setStatus('sem-suporte'));
      p.addListener('authentication_error', () => {
        token.current = null;
        setStatus('desligado');
      });
      // O Spotify só libera o player fora do app para Premium.
      p.addListener('account_error', () => {
        clearTimeout(espera);
        setStatus('sem-premium');
      });
      p.addListener('playback_error', () => setAviso({ texto: 'O Spotify não conseguiu tocar esta faixa.', erro: true }));
      p.addListener('player_state_changed', (s: SdkEstado | null) => setReproducao(converter(s)));

      player.current = p;
      const ok = await p.connect();
      if (!vivo) return;
      if (!ok) {
        setStatus('sem-suporte');
        return;
      }
      // Se o player não ficar pronto, o navegador não dá conta — não deixa
      // a pessoa esperando para sempre.
      espera = setTimeout(() => setStatus((s) => (s === 'conectando' ? 'sem-suporte' : s)), 15_000);
    })();

    return () => {
      vivo = false;
      clearTimeout(espera);
      player.current?.disconnect();
      player.current = null;
      dispositivo.current = null;
    };
  }, [pegarToken]);

  const entrar = useCallback((volta?: string) => {
    const destino = volta ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `/api/spotify/entrar?volta=${encodeURIComponent(destino)}`;
  }, []);

  const sair = useCallback(async () => {
    player.current?.disconnect();
    player.current = null;
    dispositivo.current = null;
    token.current = null;
    setReproducao(null);
    setNome(null);
    setStatus('desligado');
    await fetch('/api/spotify/sair', { method: 'POST' }).catch(() => undefined);
  }, []);

  const tocar = useCallback(
    async (alvo: AlvoDeReproducao): Promise<boolean> => {
      const p = player.current;
      const id = dispositivo.current;
      if (!p || !id) return false;
      // Precisa acontecer ainda dentro do clique: sem isso Safari e celulares
      // bloqueiam o áudio.
      void p.activateElement?.();

      const t = await pegarToken();
      if (!t) return false;
      const corpo = alvo.contexto
        ? { context_uri: alvo.contexto, ...(alvo.inicio ? { offset: { uri: alvo.inicio } } : {}) }
        : { uris: alvo.uris ?? [], ...(alvo.inicio ? { offset: { uri: alvo.inicio } } : {}) };
      const pedir = () =>
        fetch(`${API}/me/player/play?device_id=${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
        });

      try {
        let res = await pedir();
        // Player recém-criado às vezes ainda não aparece para a API: transfere
        // a reprodução para ele e tenta de novo.
        if (res.status === 404) {
          await fetch(`${API}/me/player`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_ids: [id], play: false }),
          });
          res = await pedir();
        }
        if (res.status === 403) {
          setStatus('sem-premium');
          return false;
        }
        if (!res.ok) {
          setAviso({ texto: 'O Spotify não conseguiu tocar agora. Tente de novo.', erro: true });
          return false;
        }
        return true;
      } catch {
        setAviso({ texto: 'Sem conexão com o Spotify agora.', erro: true });
        return false;
      }
    },
    [pegarToken],
  );

  const alternar = useCallback(() => {
    void player.current?.activateElement?.();
    void player.current?.togglePlay();
  }, []);
  const proxima = useCallback(() => void player.current?.nextTrack(), []);
  const anterior = useCallback(() => void player.current?.previousTrack(), []);
  const buscar = useCallback((ms: number) => void player.current?.seek(ms), []);
  const fechar = useCallback(() => {
    void player.current?.pause();
    setReproducao(null);
  }, []);

  const valor = useMemo<Contexto>(
    () => ({ status, nome, reproducao, entrar, sair, tocar, alternar, proxima, anterior, buscar, fechar }),
    [status, nome, reproducao, entrar, sair, tocar, alternar, proxima, anterior, buscar, fechar],
  );

  return (
    <SpotifyCtx.Provider value={valor}>
      {children}
      {status === 'pronto' && reproducao && <BarraDoPlayer />}
      {aviso && (
        <div
          role="status"
          className={`fixed inset-x-4 top-4 z-[70] mx-auto flex max-w-lg items-start gap-3 rounded-2xl border p-4 text-sm shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-6 ${
            aviso.erro ? 'border-clay-500/40 bg-zinc-950/95 text-clay-100' : 'border-emerald-400/40 bg-zinc-950/95 text-emerald-100'
          }`}
        >
          <Icon name={aviso.erro ? 'alert' : 'headphones'} size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1 leading-relaxed">{aviso.texto}</p>
          <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso" className="text-zinc-400 hover:text-zinc-100">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </SpotifyCtx.Provider>
  );
}
