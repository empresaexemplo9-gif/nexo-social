'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from '../icons';
import { usePreferences } from '@/lib/preferences';
import { CHAVES_DE_PARTIDA, chavesDoPerfil } from '@/lib/interesses';
import { TOPICS } from '@/lib/data';
import { HOBBIES } from '@/lib/taxonomy';

/** Todos os interesses que viram filtro, para o painel "Todos os temas". */
const TODOS_OS_TEMAS = [
  { grupo: 'Temas', itens: TOPICS.map((t) => ({ chave: `tema:${t.slug}`, rotulo: t.label })) },
  { grupo: 'Hobbies', itens: HOBBIES.map((h) => ({ chave: `hobby:${h.id}`, rotulo: h.label })) },
];
const ROTULO_LOCAL = Object.fromEntries(TODOS_OS_TEMAS.flatMap((g) => g.itens.map((i) => [i.chave, i.rotulo])));

/**
 * Fileira de filtros que rola para os lados: setas nas pontas (só quando há
 * mais para ver) e a rodinha do mouse vira rolagem horizontal.
 */
function FileiraDeFiltros({ children }: { children: React.ReactNode }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [pontas, setPontas] = useState({ esq: false, dir: false });
  const medir = useCallback(() => {
    const el = trilho.current;
    if (!el) return;
    setPontas({ esq: el.scrollLeft > 4, dir: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    const roda = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', roda, { passive: false });
    return () => {
      obs.disconnect();
      el.removeEventListener('wheel', roda);
    };
  }, [medir, children]);
  const rolar = (dir: 1 | -1) => trilho.current?.scrollBy({ left: dir * trilho.current.clientWidth * 0.7, behavior: 'smooth' });
  const seta = 'absolute top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-200 shadow-soft transition hover:border-clay-500 hover:text-clay-400';
  return (
    <div className="relative min-w-0 flex-1">
      {pontas.esq && (
        <button type="button" onClick={() => rolar(-1)} aria-label="Ver temas anteriores" className={`${seta} left-0`}>
          <Icon name="chevronRight" size={16} className="rotate-180" />
        </button>
      )}
      <div
        ref={trilho}
        onScroll={medir}
        className={`flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] ${pontas.esq ? 'pl-10' : ''} ${pontas.dir ? 'pr-10' : ''}`}
        style={{
          maskImage: `linear-gradient(to right, ${pontas.esq ? 'transparent, #000 3rem' : '#000'}, ${pontas.dir ? '#000 calc(100% - 3rem), transparent' : '#000'})`,
        }}
      >
        {children}
      </div>
      {pontas.dir && (
        <button type="button" onClick={() => rolar(1)} aria-label="Ver mais temas" className={`${seta} right-0`}>
          <Icon name="chevronRight" size={16} />
        </button>
      )}
    </div>
  );
}

interface Short {
  id: string;
  titulo: string;
  canal: string;
  capa: string;
  de: string;
}

const SALVOS = 'nexo:shorts:salvos';

function lerSalvos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SALVOS) || '[]');
  } catch {
    return [];
  }
}

/** Comando para o player do YouTube embutido (precisa de enablejsapi=1). */
function comando(iframe: HTMLIFrameElement | null, func: string) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
}

/**
 * Feed vertical de Shorts, como no YouTube: um vídeo por tela, rolagem que
 * encaixa, o visível toca sozinho e em loop, som liga com um toque e vale para
 * os próximos. Os interesses do perfil viram filtros no topo.
 */
export default function FeedShorts() {
  const { prefs, ready } = usePreferences();
  const doPerfil = useMemo(() => chavesDoPerfil(prefs), [prefs]);
  const chaves = doPerfil.length ? doPerfil : CHAVES_DE_PARTIDA;

  const [filtro, setFiltro] = useState<string>('todos');
  // Interesse pedido pelo link (/shorts?filtro=tema:musica) que não está no perfil.
  const [extra, setExtra] = useState<string | null>(null);
  const [itens, setItens] = useState<Short[]>([]);
  const [rotulos, setRotulos] = useState<Record<string, string>>({});
  const [rodada, setRodada] = useState(0);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'vazio' | 'erro'>('carregando');
  const [ativo, setAtivo] = useState(0);
  const [mudo, setMudo] = useState(true);
  const [salvos, setSalvos] = useState<string[]>([]);
  const [aviso, setAviso] = useState('');
  const [altura, setAltura] = useState<number | null>(null);
  const [painel, setPainel] = useState(false);

  const caixa = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLIFrameElement>(null);
  const carregando = useRef(false);
  const inicial = useRef<string | null>(null);

  useEffect(() => {
    setSalvos(lerSalvos());
    const q = new URLSearchParams(window.location.search);
    inicial.current = q.get('v');
    const pedido = q.get('filtro');
    if (pedido && /^(tema|hobby|musica|filme|livro):[a-z-]{2,30}$/.test(pedido)) {
      setExtra(pedido);
      setFiltro(pedido);
    }
  }, []);

  // A tela do feed vai do topo do feed até a barra de abas (no celular) ou o
  // pé da janela — mede em vez de adivinhar a altura do cabeçalho.
  useLayoutEffect(() => {
    const medir = () => {
      const el = caixa.current;
      if (!el) return;
      const abas = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--altura-abas')) || 0;
      setAltura(Math.max(360, window.innerHeight - el.getBoundingClientRect().top - abas));
    };
    medir();
    window.addEventListener('resize', medir);
    const t = setTimeout(medir, 300);
    return () => {
      window.removeEventListener('resize', medir);
      clearTimeout(t);
    };
  }, [ready]);

  // Cada troca de filtro é um pedido novo; resposta de pedido antigo é descartada.
  const pedido = useRef(0);

  const buscar = useCallback(
    async (r: number, substituir: boolean) => {
      if (!substituir && carregando.current) return;
      const meu = ++pedido.current;
      carregando.current = true;
      if (substituir) setEstado('carregando');
      try {
        const lista = filtro === 'todos' ? chaves : [filtro];
        const res = await fetch(`/api/shorts?chaves=${encodeURIComponent(lista.join(','))}&rodada=${r}`);
        const j = await res.json().catch(() => ({}));
        if (meu !== pedido.current) return;
        if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
        setRotulos((x) => ({ ...x, ...(j.rotulos ?? {}) }));
        setItens((antes) => {
          let novos: Short[] = j.itens ?? [];
          // Link direto para um short (/shorts?v=ID): ele abre primeiro.
          if (substituir && inicial.current) {
            const v = inicial.current;
            inicial.current = null;
            const achado = novos.find((s) => s.id === v);
            novos = [achado ?? { id: v, titulo: '', canal: '', capa: `https://i.ytimg.com/vi/${v}/hqdefault.jpg`, de: '' }, ...novos.filter((s) => s.id !== v)];
          }
          const base = substituir ? [] : antes;
          const vistos = new Set(base.map((s) => s.id));
          const juntos = [...base, ...novos.filter((s) => !vistos.has(s.id))];
          setEstado(juntos.length ? 'ok' : 'vazio');
          return juntos;
        });
      } catch (e) {
        if (meu !== pedido.current) return;
        if (substituir) setEstado('erro');
        setAviso((e as Error).message);
      } finally {
        if (meu === pedido.current) carregando.current = false;
      }
    },
    [chaves, filtro],
  );

  useEffect(() => {
    if (!ready) return;
    setRodada(0);
    setAtivo(0);
    caixa.current?.scrollTo({ top: 0 });
    void buscar(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, filtro, chaves.join(',')]);

  // Qual short está na tela.
  useEffect(() => {
    const raiz = caixa.current;
    if (!raiz) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setAtivo(Number((e.target as HTMLElement).dataset.i));
      },
      { root: raiz, threshold: 0.6 },
    );
    raiz.querySelectorAll('[data-i]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [itens.length]);

  // Perto do fim, pede mais.
  useEffect(() => {
    if (estado === 'ok' && itens.length && ativo >= itens.length - 3) {
      const prox = rodada + 1;
      setRodada(prox);
      void buscar(prox, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  const irPara = useCallback((i: number) => {
    const alvo = caixa.current?.querySelector(`[data-i="${i}"]`);
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const alternarSom = useCallback(() => {
    setMudo((m) => {
      comando(player.current, m ? 'unMute' : 'mute');
      if (m) comando(player.current, 'playVideo');
      return !m;
    });
  }, []);

  // Teclado: ↓/j próximo, ↑/k anterior, m som.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        irPara(Math.min(itens.length - 1, ativo + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        irPara(Math.max(0, ativo - 1));
      } else if (e.key === 'm') alternarSom();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ativo, itens.length, irPara, alternarSom]);

  const salvar = (id: string) => {
    setSalvos((s) => {
      const novo = s.includes(id) ? s.filter((x) => x !== id) : [id, ...s].slice(0, 200);
      try {
        localStorage.setItem(SALVOS, JSON.stringify(novo));
      } catch {
        // sem armazenamento, fica só nesta visita
      }
      return novo;
    });
  };

  const compartilhar = async (s: Short) => {
    const url = `https://www.youtube.com/shorts/${s.id}`;
    try {
      if (navigator.share) await navigator.share({ title: s.titulo || 'Short', url });
      else {
        await navigator.clipboard.writeText(url);
        setAviso('Link copiado.');
        setTimeout(() => setAviso(''), 2500);
      }
    } catch {
      // a pessoa fechou a folha de compartilhar
    }
  };

  const filtros = ['todos', ...chaves, ...(extra && !chaves.includes(extra) ? [extra] : [])];
  const rotuloDe = (c: string) => (c === 'todos' ? 'Para você' : rotulos[c] ?? ROTULO_LOCAL[c] ?? c.split(':')[1]);
  const escolher = (c: string) => {
    if (c !== 'todos' && !chaves.includes(c)) setExtra(c);
    setFiltro(c);
    setPainel(false);
  };

  return (
    <div className="relative">
      {/* Filtros: os interesses do perfil + qualquer tema pelo painel */}
      <div className="flex items-start gap-2">
        <FileiraDeFiltros>
          {filtros.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => escolher(c)}
              aria-pressed={filtro === c}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filtro === c ? 'bg-zinc-50 text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-clay-500 hover:text-clay-300'
              }`}
            >
              {rotuloDe(c)}
            </button>
          ))}
        </FileiraDeFiltros>
        <button
          type="button"
          onClick={() => setPainel((v) => !v)}
          aria-expanded={painel}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            painel ? 'bg-clay-500 text-zinc-900' : 'border border-clay-500/60 bg-zinc-900 text-clay-400 hover:bg-clay-500 hover:text-zinc-900'
          }`}
        >
          <Icon name="grade" size={13} /> Todos os temas
        </button>
      </div>
      {painel && (
        <div role="dialog" aria-label="Todos os temas" className="mb-3 rounded-3xl border border-zinc-800 bg-zinc-900 p-4 shadow-soft">
          {TODOS_OS_TEMAS.map((g) => (
            <div key={g.grupo} className="mb-3 last:mb-0">
              <p className="rotulo-hud">{g.grupo}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.itens.map((i) => (
                  <button
                    key={i.chave}
                    type="button"
                    onClick={() => escolher(i.chave)}
                    aria-pressed={filtro === i.chave}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filtro === i.chave
                        ? 'bg-zinc-50 text-zinc-950'
                        : chaves.includes(i.chave)
                          ? 'border border-emerald-400/50 bg-zinc-900 text-emerald-400 hover:border-clay-500 hover:text-clay-400'
                          : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-clay-500 hover:text-clay-400'
                    }`}
                  >
                    {i.rotulo}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        ref={caixa}
        style={{ height: altura ?? '75vh' }}
        className="snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-3xl [scrollbar-width:none]"
        aria-label="Shorts"
      >
        {estado === 'carregando' && (
          <div className="flex h-full items-center justify-center">
            <div className="aspect-[9/16] h-[92%] animate-pulse rounded-3xl bg-zinc-800/70" />
          </div>
        )}
        {(estado === 'vazio' || estado === 'erro') && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <Icon name="shorts" size={36} className="text-zinc-500" />
            <p className="max-w-sm text-sm text-zinc-400">
              {estado === 'erro'
                ? `Não deu para carregar os Shorts agora (${aviso}).`
                : 'Nenhum short destes interesses por enquanto. Tente outro filtro ou volte daqui a pouco.'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => void buscar(rodada + 1, true)} className="rounded-full bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-clay-500">
                Tentar de novo
              </button>
              <button type="button" onClick={() => setPainel(true)} className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-clay-500 hover:text-clay-400">
                Escolher outro tema
              </button>
            </div>
          </div>
        )}
        {estado === 'ok' &&
          itens.map((s, i) => (
            <section key={s.id} data-i={i} className="relative flex h-full snap-start snap-always items-center justify-center gap-4 py-2">
              <div className="relative aspect-[9/16] h-full max-w-full overflow-hidden rounded-3xl bg-black shadow-soft">
                {i === ativo ? (
                  <iframe
                    ref={player}
                    key={s.id}
                    src={`https://www.youtube-nocookie.com/embed/${s.id}?autoplay=1&mute=${mudo ? 1 : 0}&loop=1&playlist=${s.id}&playsinline=1&controls=0&rel=0&modestbranding=1&enablejsapi=1`}
                    title={s.titulo || 'Short'}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    className="h-full w-full"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.capa} alt="" loading="lazy" className="h-full w-full object-cover opacity-80" />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 pr-16 text-white">
                  {s.canal && <p className="text-sm font-semibold">{s.canal}</p>}
                  {s.titulo && <p className="mt-1 line-clamp-2 text-xs text-white/85">{s.titulo}</p>}
                  {s.de && rotulos[s.de] && (
                    <p className="mt-2 inline-block rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider">{rotulos[s.de]}</p>
                  )}
                </div>

                {/* Ações, no canto como nos Shorts */}
                <div className="absolute bottom-20 right-2 flex flex-col items-center gap-3 text-white">
                  <button
                    type="button"
                    onClick={alternarSom}
                    aria-label={mudo ? 'Ligar o som' : 'Tirar o som'}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur transition hover:scale-110 hover:bg-clay-500"
                  >
                    <Icon name={mudo ? 'mudo' : 'volume'} size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => salvar(s.id)}
                    aria-pressed={salvos.includes(s.id)}
                    aria-label={salvos.includes(s.id) ? 'Tirar dos salvos' : 'Salvar'}
                    className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition hover:scale-110 ${
                      salvos.includes(s.id) ? 'bg-clay-500 text-white' : 'bg-black/45 hover:bg-clay-500'
                    }`}
                  >
                    <Icon name="heart" size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void compartilhar(s)}
                    aria-label="Compartilhar"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur transition hover:scale-110 hover:bg-emerald-400"
                  >
                    <Icon name="compartilhar" size={19} />
                  </button>
                  <a
                    href={`https://www.youtube.com/shorts/${s.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir no YouTube"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur transition hover:scale-110 hover:bg-emerald-400"
                  >
                    <Icon name="external" size={18} />
                  </a>
                </div>

                {mudo && i === ativo && (
                  <button
                    type="button"
                    onClick={alternarSom}
                    className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-clay-500"
                  >
                    Toque para ouvir
                  </button>
                )}
              </div>

              {/* No computador, setas ao lado para passar */}
              <div className="hidden flex-col gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => irPara(Math.max(0, i - 1))}
                  disabled={i === 0}
                  aria-label="Short anterior"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-emerald-400 hover:text-emerald-400 disabled:opacity-30"
                >
                  <Icon name="chevronRight" size={18} className="-rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => irPara(i + 1)}
                  disabled={i >= itens.length - 1}
                  aria-label="Próximo short"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-emerald-400 hover:text-emerald-400 disabled:opacity-30"
                >
                  <Icon name="chevronRight" size={18} className="rotate-90" />
                </button>
              </div>
            </section>
          ))}
      </div>

      {aviso === 'Link copiado.' && (
        <p role="status" className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-950">
          {aviso}
        </p>
      )}
    </div>
  );
}
