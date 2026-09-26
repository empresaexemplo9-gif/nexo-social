'use client';

import React, { useEffect, useRef, useState } from 'react';

/*
 * Player embutido do Spotify comandado pela iFrame API
 * (https://open.spotify.com/embed/iframe-api/v1).
 *
 * Com a API o player deixa de ser uma janela solta: a nexo.social troca a
 * faixa sem recriar o iframe, manda tocar já no clique da lista e sabe quando
 * a faixa acabou — para seguir sozinha para a próxima. O que toca continua
 * sendo regra do Spotify: prévia de 30 s para quem não está logado; completa
 * para quem está logado no Spotify Premium neste navegador.
 *
 * Se o script não carregar (bloqueador, rede), cai no iframe simples de antes.
 */

interface EstadoDoEmbed {
  isPaused: boolean;
  isBuffering: boolean;
  /** ms */
  duration: number;
  /** ms */
  position: number;
}
interface EmbedController {
  loadUri(uri: string, preferVideo?: boolean, startAt?: number): void;
  play(): void;
  pause(): void;
  resume(): void;
  togglePlay(): void;
  seek(segundos: number): void;
  destroy(): void;
  addListener(evento: 'ready', cb: () => void): void;
  addListener(evento: 'playback_update', cb: (e: { data: EstadoDoEmbed }) => void): void;
}
interface IFrameAPI {
  createController(
    el: HTMLElement,
    opcoes: { uri: string; width?: string | number; height?: string | number },
    pronto: (c: EmbedController) => void,
  ): void;
}
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

const SCRIPT = 'https://open.spotify.com/embed/iframe-api/v1';

// O script só chama onSpotifyIframeApiReady uma vez por página: guardamos a
// promessa para todos os players que vierem depois.
let api: Promise<IFrameAPI> | null = null;
function carregarApi(): Promise<IFrameAPI> {
  if (api) return api;
  api = new Promise<IFrameAPI>((ok, falha) => {
    const anterior = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (a) => {
      anterior?.(a);
      ok(a);
    };
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onerror = () => falha(new Error('iFrame API do Spotify indisponível.'));
    document.body.appendChild(s);
    setTimeout(() => falha(new Error('iFrame API do Spotify demorou demais.')), 10_000);
  }).catch((e) => {
    api = null; // deixa a próxima montagem tentar de novo
    throw e;
  });
  return api;
}

function alturaDe(uri: string): number {
  return uri.startsWith('spotify:track:') ? 152 : 352;
}

function urlSimples(uri: string): string {
  const [, tipo, id] = uri.split(':');
  return `https://open.spotify.com/embed/${tipo}/${id}?utm_source=nexo-social`;
}

export interface PedidoDoEmbed {
  /** spotify:track:… ou spotify:playlist:… */
  uri: string;
  /** Tocar assim que carregar (veio de um clique). */
  tocar: boolean;
  /** Muda a cada pedido: pedir o mesmo URI de novo recomeça a faixa. */
  n: string;
}

interface Props {
  pedido: PedidoDoEmbed;
  titulo: string;
  /** Duração do que está carregado (ms) — ~30 s quando é prévia. */
  onDuracao?: (ms: number) => void;
  /** A faixa tocou até o fim. */
  onFim?: () => void;
}

export default function PlayerEmbutido({ pedido, titulo, onDuracao, onFim }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const controle = useRef<EmbedController | null>(null);
  const [simples, setSimples] = useState(false);

  // Sempre a versão mais recente das props, sem recriar o controle.
  const atual = useRef({ pedido, onDuracao, onFim });
  atual.current = { pedido, onDuracao, onFim };

  // Pedido de tocar ainda não atendido (o embed pode não ter carregado).
  const querTocar = useRef(false);
  const ultimo = useRef({ tocando: false, posicao: 0, duracao: 0 });

  const altura = alturaDe(pedido.uri);

  // Cria o controle uma vez; depois só trocamos o conteúdo com loadUri.
  useEffect(() => {
    let vivo = true;
    const el = caixa.current;
    if (!el) return;
    // O controle substitui este nó pelo iframe; fica fora do React.
    const alvo = document.createElement('div');
    el.appendChild(alvo);

    carregarApi()
      .then((a) => {
        if (!vivo) return;
        const inicial = atual.current.pedido;
        querTocar.current = inicial.tocar;
        a.createController(alvo, { uri: inicial.uri, width: '100%', height: alturaDe(inicial.uri) }, (c) => {
          if (!vivo) {
            c.destroy();
            return;
          }
          controle.current = c;
          c.addListener('ready', () => {
            if (querTocar.current) c.play();
          });
          c.addListener('playback_update', ({ data }) => {
            if (!data) return;
            if (!data.isPaused && data.position > 0) querTocar.current = false;
            const antes = ultimo.current;
            if (data.duration !== antes.duracao && data.duration > 0) atual.current.onDuracao?.(data.duration);
            // Fim: estava tocando e parou no fim (ou voltou ao zero logo depois
            // de chegar perto dele).
            const acabou =
              antes.tocando &&
              data.isPaused &&
              data.duration > 0 &&
              (data.position >= data.duration - 1500 || (data.position === 0 && antes.posicao >= antes.duracao - 2500));
            ultimo.current = { tocando: !data.isPaused, posicao: data.position, duracao: data.duration };
            if (acabou && atual.current.pedido.uri.startsWith('spotify:track:')) atual.current.onFim?.();
          });
        });
      })
      .catch(() => {
        if (vivo) setSimples(true);
      });

    return () => {
      vivo = false;
      controle.current?.destroy();
      controle.current = null;
      el.replaceChildren();
    };
  }, []);

  // Cada pedido novo: troca o conteúdo e, se veio de um clique, toca.
  useEffect(() => {
    const c = controle.current;
    if (!c) return; // ainda criando: a criação usa o pedido mais recente
    ultimo.current = { tocando: false, posicao: 0, duracao: 0 };
    querTocar.current = pedido.tocar;
    c.loadUri(pedido.uri);
    caixa.current?.querySelector('iframe')?.setAttribute('height', String(alturaDe(pedido.uri)));
    if (!pedido.tocar) return;
    c.play();
    // Se o conteúdo novo ainda não tinha carregado, o primeiro play se perde.
    const t = setTimeout(() => {
      if (querTocar.current) c.play();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido.n]);

  if (simples) {
    return (
      <iframe
        key={pedido.uri}
        src={urlSimples(pedido.uri)}
        width="100%"
        height={altura}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={titulo}
        className="block"
      />
    );
  }

  return (
    <div
      ref={caixa}
      title={titulo}
      style={{ minHeight: altura }}
      className="bg-zinc-900/60 transition-[min-height] [&>iframe]:block"
      data-player-spotify
    />
  );
}
