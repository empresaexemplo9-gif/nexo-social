'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon, { type IconName } from '../icons';
import InlinePlayer, { type PlayRequest } from '../InlinePlayer';
import { getTopic, type CategorySlug, type Topic } from '@/lib/data';
import {
  KITS,
  type Bloco,
  type ItemGuia,
  type Receita,
  type TecnicaRespiracao,
  type TipoDeBloco,
} from '@/lib/temas/kits';

// “Só no nexo”: o kit exclusivo de cada tema — guias, glossário, checklists,
// receitas com modo cozinha, recursos, respiração guiada e jogos grátis ao
// vivo. Cada bloco vira uma aba; o conteúdo mora em lib/temas/kits.ts.

type Acento = Topic['accent'];

const ACENTO_PADRAO: Acento = {
  text: 'text-emerald-400',
  bg: 'bg-emerald-950',
  border: 'border-emerald-800',
  solid: 'bg-emerald-400',
  gradient: '',
};

const ICONE_POR_TIPO: Record<TipoDeBloco, IconName> = {
  guia: 'compass',
  glossario: 'book',
  checklist: 'calendarCheck',
  receitas: 'utensils',
  recursos: 'link',
  respiracao: 'heart',
  'jogos-gratis': 'gamepad',
};

// ---------------------------------------------------------------------------
// Utilidades

/** localStorage pode não existir (aba anônima, bloqueio, prévia) — nunca quebra. */
function lerLocal(chave: string): string | null {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravarLocal(chave: string, valor: string | null) {
  try {
    if (valor === null) window.localStorage.removeItem(chave);
    else window.localStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento: segue só na memória */
  }
}

/** Minúsculas e sem acento, para buscar “cafe” e achar “café”. */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function buscaExterna(q: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

function hostDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const atualizar = () => setReduzido(!!mq?.matches);
    atualizar();
    mq.addEventListener?.('change', atualizar);
    return () => mq?.removeEventListener?.('change', atualizar);
  }, []);
  return reduzido;
}

/** Rola até o elemento no próximo quadro (depois de o React pintar). */
function rolarAte(el: HTMLElement | null, suave: boolean) {
  if (!el) return;
  requestAnimationFrame(() => el.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' }));
}

const botaoPrimario =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50';
const botaoSecundario =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald-400/60 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50';
const chip = (ativo: boolean) =>
  `inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
    ativo ? 'border-emerald-400 bg-emerald-400 text-zinc-950' : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-emerald-400/50 hover:text-zinc-50'
  }`;

// ---------------------------------------------------------------------------
// Componente principal

export default function KitDoTema({ tema }: { tema: CategorySlug }) {
  const kit = KITS[tema];
  const topico = getTopic(tema);
  const acento = topico?.accent ?? ACENTO_PADRAO;
  const blocos = useMemo(() => kit?.blocos ?? [], [kit]);
  const chaveAba = `nexo:kit:${tema}:aba`;

  const [ativa, setAtiva] = useState<string>(blocos[0]?.id ?? '');
  // Abas já abertas continuam montadas (escondidas): o cronômetro da receita
  // não para se a pessoa espiar o glossário.
  const [visitadas, setVisitadas] = useState<Set<string>>(() => new Set(blocos[0] ? [blocos[0].id] : []));
  const abasRef = useRef<Record<string, HTMLButtonElement | null>>({});

  // Volta para a última aba usada neste tema.
  useEffect(() => {
    const salva = lerLocal(chaveAba);
    const inicial = salva && blocos.some((b) => b.id === salva) ? salva : blocos[0]?.id ?? '';
    setAtiva(inicial);
    setVisitadas(new Set(inicial ? [inicial] : []));
  }, [chaveAba, blocos]);

  const escolher = useCallback(
    (id: string, focar = false) => {
      setAtiva(id);
      setVisitadas((v) => (v.has(id) ? v : new Set(v).add(id)));
      gravarLocal(chaveAba, id);
      if (focar) abasRef.current[id]?.focus();
    },
    [chaveAba],
  );

  const aoTeclar = (e: React.KeyboardEvent, i: number) => {
    let alvo = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') alvo = (i + 1) % blocos.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') alvo = (i - 1 + blocos.length) % blocos.length;
    else if (e.key === 'Home') alvo = 0;
    else if (e.key === 'End') alvo = blocos.length - 1;
    if (alvo < 0) return;
    e.preventDefault();
    escolher(blocos[alvo].id, true);
  };

  if (!kit || blocos.length === 0) return null;

  const idAba = (b: Bloco) => `kit-${tema}-aba-${b.id}`;
  const idPainel = (b: Bloco) => `kit-${tema}-painel-${b.id}`;

  return (
    <section aria-labelledby={`kit-${tema}-titulo`} className="min-w-0 max-w-full space-y-5">
      <header className="min-w-0">
        <p className="rotulo-hud">Só no nexo</p>
        <h2 id={`kit-${tema}-titulo`} className="mt-2 font-display text-2xl font-bold text-zinc-50 sm:text-3xl">
          {kit.titulo}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-300">{kit.apoio}</p>
      </header>

      <div
        role="tablist"
        aria-label={`Seções do ${kit.titulo}`}
        className="flex max-w-full gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible"
      >
        {blocos.map((b, i) => {
          const sel = b.id === ativa;
          return (
            <button
              key={b.id}
              ref={(el) => {
                abasRef.current[b.id] = el;
              }}
              id={idAba(b)}
              type="button"
              role="tab"
              aria-selected={sel}
              aria-controls={idPainel(b)}
              tabIndex={sel ? 0 : -1}
              onClick={() => escolher(b.id)}
              onKeyDown={(e) => aoTeclar(e, i)}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                sel ? 'border-emerald-400 bg-emerald-400 text-zinc-950 shadow-glow' : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-emerald-400/50 hover:text-zinc-50'
              }`}
            >
              <Icon name={b.icone ?? ICONE_POR_TIPO[b.tipo]} size={14} />
              {b.aba ?? b.titulo}
              {b.tipo === 'jogos-gratis' && (
                <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${sel ? 'bg-zinc-950' : 'bg-clay-500'}`} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {blocos.map((b) => {
        const sel = b.id === ativa;
        if (!visitadas.has(b.id) && !sel) return null;
        return (
          <div
            key={b.id}
            id={idPainel(b)}
            role="tabpanel"
            aria-labelledby={idAba(b)}
            tabIndex={0}
            hidden={!sel}
            className="card-soft min-w-0 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:p-6"
          >
            <div className="mb-5 flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${acento.bg} ${acento.text}`}>
                <Icon name={b.icone ?? ICONE_POR_TIPO[b.tipo]} size={19} />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-xl font-bold leading-tight text-zinc-50 sm:text-2xl">{b.titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{b.apoio}</p>
              </div>
            </div>
            <ConteudoDoBloco bloco={b} tema={tema} acento={acento} ativo={sel} />
          </div>
        );
      })}
    </section>
  );
}

function ConteudoDoBloco({ bloco, tema, acento, ativo }: { bloco: Bloco; tema: CategorySlug; acento: Acento; ativo: boolean }) {
  switch (bloco.tipo) {
    case 'guia':
      return <BlocoGuia itens={bloco.itens} acento={acento} ativo={ativo} />;
    case 'glossario':
      return <BlocoGlossario termos={bloco.termos} idBase={`kit-${tema}-${bloco.id}`} />;
    case 'checklist':
      return <BlocoChecklist grupos={bloco.grupos} chave={`nexo:kit:${tema}:${bloco.id}`} acento={acento} />;
    case 'receitas':
      return <BlocoReceitas receitas={bloco.receitas} acento={acento} ativo={ativo} />;
    case 'recursos':
      return <BlocoRecursos itens={bloco.itens} acento={acento} />;
    case 'respiracao':
      return <BlocoRespiracao tecnicas={bloco.tecnicas} acento={acento} ativo={ativo} />;
    case 'jogos-gratis':
      return <BlocoJogosGratis ativo={ativo} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Guia: cartões com vídeo aqui dentro e link oficial

const LIMITE_GUIA = 9;

function BlocoGuia({ itens, acento, ativo }: { itens: ItemGuia[]; acento: Acento; ativo: boolean }) {
  const [tocando, setTocando] = useState<{ indice: number; req: PlayRequest } | null>(null);
  const [todos, setTodos] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const reduzido = useMovimentoReduzido();

  // Saiu da aba: o vídeo para (um iframe escondido continuaria tocando).
  useEffect(() => {
    if (!ativo) setTocando(null);
  }, [ativo]);

  const visiveis = todos ? itens : itens.slice(0, LIMITE_GUIA);

  const tocar = (item: ItemGuia, indice: number) => {
    if (!item.video) return;
    setTocando({ indice, req: { titulo: item.titulo, busca: item.video, externo: buscaExterna(item.video) } });
    rolarAte(playerRef.current, !reduzido);
  };

  return (
    <div className="space-y-4">
      <div ref={playerRef} className="scroll-mt-36">
        {tocando && <InlinePlayer key={tocando.indice} req={tocando.req} onClose={() => setTocando(null)} />}
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visiveis.map((item, i) => {
          const esteTocando = tocando?.indice === i;
          return (
            <li
              key={`${item.titulo}-${i}`}
              className={`flex min-w-0 flex-col rounded-2xl border bg-zinc-900/60 p-4 transition ${
                esteTocando ? 'border-emerald-400 shadow-glow' : 'border-zinc-800 hover:border-emerald-400/40'
              }`}
            >
              {item.tag && (
                <span className={`self-start rounded-full px-2 py-0.5 text-[10.5px] font-semibold leading-snug ${acento.bg} ${acento.text}`}>{item.tag}</span>
              )}
              <h4 className="mt-2 break-words font-display text-lg font-bold leading-snug text-zinc-50">{item.titulo}</h4>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-300">{item.texto}</p>
              {(item.video || item.link) && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {item.video && (
                    <button
                      type="button"
                      onClick={() => tocar(item, i)}
                      aria-label={`Assistir aqui: ${item.titulo}`}
                      aria-pressed={esteTocando}
                      className={botaoPrimario}
                    >
                      <Icon name="play" size={11} /> {esteTocando ? 'Tocando' : 'Assistir aqui'}
                    </button>
                  )}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 transition hover:text-clay-400"
                    >
                      Site oficial ↗<span className="sr-only"> de {item.titulo} (abre em nova aba)</span>
                    </a>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {itens.length > LIMITE_GUIA && (
        <div className="text-center">
          <button type="button" onClick={() => setTodos((v) => !v)} className={botaoSecundario} aria-expanded={todos}>
            {todos ? 'Mostrar menos' : `Ver todos (${itens.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Glossário: busca + A–Z em sanfona

function BlocoGlossario({ termos, idBase }: { termos: { termo: string; definicao: string }[]; idBase: string }) {
  const [busca, setBusca] = useState('');
  const [letra, setLetra] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const inicial = (s: string) => normalizar(s).charAt(0).toUpperCase();
  const ordenados = useMemo(() => [...termos].sort((a, b) => a.termo.localeCompare(b.termo, 'pt-BR', { sensitivity: 'base' })), [termos]);
  const letras = useMemo(() => Array.from(new Set(ordenados.map((t) => inicial(t.termo)))), [ordenados]);

  const q = normalizar(busca.trim());
  const filtrados = ordenados.filter(
    (t) => (!letra || inicial(t.termo) === letra) && (!q || normalizar(`${t.termo} ${t.definicao}`).includes(q)),
  );
  const grupos = filtrados.reduce<{ letra: string; itens: typeof filtrados }[]>((acc, t) => {
    const l = inicial(t.termo);
    const ultimo = acc[acc.length - 1];
    if (ultimo && ultimo.letra === l) ultimo.itens.push(t);
    else acc.push({ letra: l, itens: [t] });
    return acc;
  }, []);

  const tudoAberto = filtrados.length > 0 && filtrados.every((t) => abertos.has(t.termo));
  const alternar = (termo: string) =>
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(termo)) n.delete(termo);
      else n.add(termo);
      return n;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar no glossário</span>
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar entre ${termos.length} termos…`}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          />
        </label>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-xs text-zinc-500" aria-live="polite">
            {filtrados.length} {filtrados.length === 1 ? 'termo' : 'termos'}
          </p>
          {!q && filtrados.length > 0 && (
            <button
              type="button"
              onClick={() => setAbertos(tudoAberto ? new Set() : new Set(filtrados.map((t) => t.termo)))}
              className="text-xs font-semibold text-emerald-400 hover:text-clay-400"
            >
              {tudoAberto ? 'Recolher tudo' : 'Abrir tudo'}
            </button>
          )}
        </div>
      </div>

      <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]" role="group" aria-label="Filtrar por letra">
        <button type="button" onClick={() => setLetra(null)} aria-pressed={letra === null} className={chip(letra === null)}>
          A–Z
        </button>
        {letras.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLetra(letra === l ? null : l)}
            aria-pressed={letra === l}
            aria-label={`Termos com a letra ${l}`}
            className={`${chip(letra === l)} min-w-[2rem] justify-center px-2`}
          >
            {l}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
          Nenhum termo encontrado{busca ? <> para “{busca}”</> : null}.
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {grupos.map((g) => (
            <div key={g.letra} className="min-w-0">
              <p className="mb-1.5 font-mono text-xs font-bold text-zinc-500" aria-hidden="true">
                {g.letra}
              </p>
              <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
                {g.itens.map((t) => {
                  // Buscando, as definições aparecem abertas: é o que a pessoa quer ver.
                  const aberto = !!q || abertos.has(t.termo);
                  const idDef = `${idBase}-${normalizar(t.termo).replace(/[^a-z0-9]+/g, '-')}`;
                  return (
                    <li key={t.termo}>
                      <button
                        type="button"
                        onClick={() => alternar(t.termo)}
                        aria-expanded={aberto}
                        aria-controls={idDef}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-zinc-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
                      >
                        <span className="min-w-0 break-words text-sm font-semibold text-zinc-100">{t.termo}</span>
                        <Icon name="chevronRight" size={15} className={`shrink-0 text-zinc-500 transition ${aberto ? 'rotate-90' : ''}`} />
                      </button>
                      <p id={idDef} hidden={!aberto} className="px-4 pb-3.5 text-sm leading-relaxed text-zinc-300">
                        {t.definicao}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checklist: marcações guardadas no aparelho

function BlocoChecklist({ grupos, chave, acento }: { grupos: { nome: string; itens: string[] }[]; chave: string; acento: Acento }) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [carregado, setCarregado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const idItem = (grupo: string, item: string) => `${grupo}::${item}`;
  const todosIds = useMemo(() => grupos.flatMap((g) => g.itens.map((i) => idItem(g.nome, i))), [grupos]);

  useEffect(() => {
    const salvo = lerLocal(chave);
    if (salvo) {
      try {
        const lista: unknown = JSON.parse(salvo);
        if (Array.isArray(lista)) setMarcados(new Set(lista.filter((x): x is string => typeof x === 'string')));
      } catch {
        /* conteúdo antigo ou corrompido: começa do zero */
      }
    }
    setCarregado(true);
  }, [chave]);

  useEffect(() => {
    if (!carregado) return;
    gravarLocal(chave, marcados.size ? JSON.stringify(Array.from(marcados)) : null);
  }, [marcados, carregado, chave]);

  const feitos = todosIds.filter((id) => marcados.has(id)).length;
  const total = todosIds.length;
  const pct = total ? Math.round((feitos / total) * 100) : 0;

  const alternar = (id: string) =>
    setMarcados((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-300">
            <b className="font-display text-2xl font-bold text-zinc-50">{feitos}</b> de {total} · {pct}%
          </p>
          {confirmando ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400">Desmarcar tudo?</span>
              <button
                type="button"
                onClick={() => {
                  setMarcados(new Set());
                  setConfirmando(false);
                }}
                className={botaoPrimario}
              >
                Sim, limpar
              </button>
              <button type="button" onClick={() => setConfirmando(false)} className={botaoSecundario}>
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmando(true)} disabled={feitos === 0} className={botaoSecundario}>
              <Icon name="refresh" size={13} /> Limpar
            </button>
          )}
        </div>
        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={feitos}
          aria-label="Progresso do checklist"
        >
          <div className={`h-full rounded-full transition-[width] duration-500 ${acento.solid}`} style={{ width: `${pct}%` }} />
        </div>
        {total > 0 && feitos === total && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
            <Icon name="check" size={16} /> Tudo marcado. Mandou bem!
          </p>
        )}
      </div>

      <div className="grid items-start gap-3 md:grid-cols-2">
        {grupos.map((g) => {
          const feitosNoGrupo = g.itens.filter((i) => marcados.has(idItem(g.nome, i))).length;
          return (
            <fieldset key={g.nome} className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <legend className="sr-only">{g.nome}</legend>
              <div className="mb-2 flex items-center justify-between gap-2" aria-hidden="true">
                <p className="font-display text-base font-bold text-zinc-50">{g.nome}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums ${acento.bg} ${acento.text}`}>
                  {feitosNoGrupo}/{g.itens.length}
                </span>
              </div>
              <ul className="space-y-0.5">
                {g.itens.map((item) => {
                  const id = idItem(g.nome, item);
                  const ok = marcados.has(id);
                  return (
                    <li key={id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1.5 py-2 transition hover:bg-zinc-950/40">
                        <input
                          type="checkbox"
                          checked={ok}
                          onChange={() => alternar(id)}
                          className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-emerald-400"
                        />
                        <span className={`text-sm leading-snug ${ok ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{item}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>
      <p className="text-[11px] text-zinc-500">As marcações ficam salvas só neste aparelho e navegador.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Receitas: seletor + modo cozinha com cronômetro

const NIVEIS: Receita['nivel'][] = ['fácil', 'médio', 'difícil'];

function BlocoReceitas({ receitas, acento, ativo }: { receitas: Receita[]; acento: Acento; ativo: boolean }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [nivel, setNivel] = useState<Receita['nivel'] | null>(null);
  const topoRef = useRef<HTMLDivElement>(null);
  const reduzido = useMovimentoReduzido();

  const receita = receitas.find((r) => r.id === aberta) ?? null;
  const niveis = NIVEIS.filter((n) => receitas.some((r) => r.nivel === n));
  const lista = nivel ? receitas.filter((r) => r.nivel === nivel) : receitas;

  const abrir = (id: string | null) => {
    setAberta(id);
    rolarAte(topoRef.current, !reduzido);
  };

  return (
    <div ref={topoRef} className="scroll-mt-36">
      {receita ? (
        <ReceitaAberta key={receita.id} receita={receita} acento={acento} ativo={ativo} onVoltar={() => abrir(null)} />
      ) : (
        <div className="space-y-4">
          {niveis.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por dificuldade">
              <button type="button" onClick={() => setNivel(null)} aria-pressed={nivel === null} className={chip(nivel === null)}>
                Todas ({receitas.length})
              </button>
              {niveis.map((n) => (
                <button key={n} type="button" onClick={() => setNivel(nivel === n ? null : n)} aria-pressed={nivel === n} className={chip(nivel === n)}>
                  {n[0].toUpperCase() + n.slice(1)}
                </button>
              ))}
            </div>
          )}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => abrir(r.id)}
                  className="group flex h-full w-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <span className={`self-start rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${acento.bg} ${acento.text}`}>{r.regiao}</span>
                  <span className="mt-2 font-display text-lg font-bold leading-snug text-zinc-50 group-hover:text-emerald-400">{r.nome}</span>
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="clock" size={12} /> {r.tempo}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="users" size={12} /> {r.rende}
                    </span>
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-2 pt-1">
                    <NivelBadge nivel={r.nivel} />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      Cozinhar <Icon name="arrowRight" size={13} className="transition group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NivelBadge({ nivel }: { nivel: Receita['nivel'] }) {
  const pontos = NIVEIS.indexOf(nivel) + 1;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">
      <span className="flex gap-0.5" aria-hidden="true">
        {NIVEIS.map((_, i) => (
          <span key={i} className={`h-1.5 w-3 rounded-full ${i < pontos ? 'bg-clay-500' : 'bg-zinc-800'}`} />
        ))}
      </span>
      {nivel[0].toUpperCase() + nivel.slice(1)}
    </span>
  );
}

interface EstadoTimer {
  passo: number;
  total: number; // ms
  restante: number; // ms
  fim: number | null; // Date.now() em que acaba, se rodando
  acabou: boolean;
}

function formatarTempo(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}` : `${m}:${String(seg).padStart(2, '0')}`;
}

type SentinelaTela = { release: () => Promise<void>; addEventListener?: (t: 'release', f: () => void) => void };

function ReceitaAberta({ receita, acento, ativo, onVoltar }: { receita: Receita; acento: Acento; ativo: boolean; onVoltar: () => void }) {
  const [separados, setSeparados] = useState<Set<number>>(new Set());
  const [passo, setPasso] = useState(0);
  const [concluida, setConcluida] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [timer, setTimer] = useState<EstadoTimer | null>(null);
  const [temWakeLock, setTemWakeLock] = useState(false);
  const [telaAcesa, setTelaAcesa] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const travaRef = useRef<SentinelaTela | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const reduzido = useMovimentoReduzido();

  // Objeto estável: o InlinePlayer resolve de novo sempre que `req` muda, e o
  // cronômetro re-renderiza este componente a cada 250 ms.
  const pedidoVideo = useMemo<PlayRequest>(
    () => ({ titulo: `${receita.nome} — preparo`, busca: receita.video, externo: buscaExterna(receita.video) }),
    [receita],
  );

  const total = receita.passos.length;
  const atual = receita.passos[passo];

  useEffect(() => {
    if (!ativo) setTocando(false);
  }, [ativo]);

  useEffect(() => {
    setTemWakeLock(typeof navigator !== 'undefined' && 'wakeLock' in navigator);
    return () => {
      travaRef.current?.release().catch(() => undefined);
      travaRef.current = null;
      audioRef.current?.close().catch(() => undefined);
      audioRef.current = null;
    };
  }, []);

  const alarme = useCallback(() => {
    try {
      navigator.vibrate?.([400, 200, 400, 200, 400]);
    } catch {
      /* sem vibração */
    }
    const ctx = audioRef.current;
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + 0.05;
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const ganho = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i % 2 ? 660 : 880;
        const t = t0 + i * 0.35;
        ganho.gain.setValueAtTime(0.0001, t);
        ganho.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
        ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        osc.connect(ganho).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } catch {
      /* sem áudio */
    }
  }, []);

  // O relógio: conta pelo horário de término, então não atrasa se a aba dormir.
  // Lê o estado por ref para o alarme tocar uma vez só, fora do setState.
  const timerRef = useRef(timer);
  timerRef.current = timer;
  useEffect(() => {
    if (!timer?.fim) return;
    const id = window.setInterval(() => {
      const t = timerRef.current;
      if (!t || !t.fim) return;
      const restante = t.fim - Date.now();
      if (restante <= 0) {
        timerRef.current = { ...t, restante: 0, fim: null, acabou: true };
        setTimer(timerRef.current);
        alarme();
      } else {
        setTimer({ ...t, restante });
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [timer?.fim, alarme]);

  const prepararAudio = () => {
    // Criado dentro do clique: navegadores só liberam som após um gesto.
    try {
      if (!audioRef.current) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) audioRef.current = new Ctx();
      }
      void audioRef.current?.resume();
    } catch {
      /* sem áudio: fica a vibração e o aviso na tela */
    }
  };

  const iniciarTimer = (indice: number, minutos: number) => {
    prepararAudio();
    const totalMs = minutos * 60_000;
    setTimer((t) => {
      // Continua de onde parou se for o mesmo passo pausado.
      const base = t && t.passo === indice && !t.acabou && t.restante > 0 ? t.restante : totalMs;
      return { passo: indice, total: totalMs, restante: base, fim: Date.now() + base, acabou: false };
    });
  };
  const pausarTimer = () => setTimer((t) => (t && t.fim ? { ...t, restante: Math.max(0, t.fim - Date.now()), fim: null } : t));
  const zerarTimer = () => setTimer(null);
  const maisUmMinuto = () =>
    setTimer((t) => {
      if (!t) return t;
      if (t.fim) return { ...t, fim: t.fim + 60_000, total: t.total + 60_000 };
      return { ...t, restante: t.restante + 60_000, total: t.total + 60_000, acabou: false };
    });

  const alternarTela = async () => {
    try {
      if (travaRef.current) {
        await travaRef.current.release();
        travaRef.current = null;
        setTelaAcesa(false);
        return;
      }
      const nav = navigator as Navigator & { wakeLock?: { request: (tipo: 'screen') => Promise<SentinelaTela> } };
      const trava = await nav.wakeLock?.request('screen');
      if (!trava) return;
      travaRef.current = trava;
      setTelaAcesa(true);
      trava.addEventListener?.('release', () => {
        travaRef.current = null;
        setTelaAcesa(false);
      });
    } catch {
      setTelaAcesa(false);
    }
  };

  const irPara = (i: number) => {
    setConcluida(false);
    setPasso(Math.min(Math.max(i, 0), total - 1));
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (passo < total - 1) irPara(passo + 1);
      else setConcluida(true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      irPara(passo - 1);
    }
  };

  const timerDeOutroPasso = timer && timer.passo !== passo ? timer : null;
  const timerDestePasso = timer && timer.passo === passo ? timer : null;

  return (
    <div className="space-y-5">
      {/* Cabeçalho da receita */}
      <div className="flex flex-col gap-3">
        <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1 self-start text-xs font-semibold text-emerald-400 hover:text-clay-400">
          <Icon name="chevronRight" size={14} className="rotate-180" /> Todas as receitas
        </button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${acento.bg} ${acento.text}`}>{receita.regiao}</span>
            <h4 className="mt-2 font-display text-2xl font-bold leading-tight text-zinc-50 sm:text-3xl">{receita.nome}</h4>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Icon name="clock" size={13} /> {receita.tempo}
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="users" size={13} /> {receita.rende}
              </span>
              <NivelBadge nivel={receita.nivel} />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setTocando(true);
                rolarAte(playerRef.current, !reduzido);
              }}
              className={botaoPrimario}
            >
              <Icon name="play" size={11} /> Ver o preparo
            </button>
            {temWakeLock && (
              <button type="button" onClick={alternarTela} aria-pressed={telaAcesa} className={botaoSecundario}>
                <Icon name="sunrise" size={13} /> {telaAcesa ? 'Tela sempre acesa: ligada' : 'Manter tela acesa'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div ref={playerRef} className="scroll-mt-36">
        {tocando && <InlinePlayer req={pedidoVideo} onClose={() => setTocando(false)} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Ingredientes */}
        <section aria-label="Ingredientes" className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-display text-lg font-bold text-zinc-50">Ingredientes</p>
            <span className="text-xs tabular-nums text-zinc-500">
              {separados.size}/{receita.ingredientes.length} separados
            </span>
          </div>
          <ul className="space-y-0.5">
            {receita.ingredientes.map((ing, i) => {
              const ok = separados.has(i);
              return (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1.5 py-2 transition hover:bg-zinc-950/40">
                    <input
                      type="checkbox"
                      checked={ok}
                      onChange={() =>
                        setSeparados((s) => {
                          const n = new Set(s);
                          if (n.has(i)) n.delete(i);
                          else n.add(i);
                          return n;
                        })
                      }
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-emerald-400"
                    />
                    <span className={`text-sm leading-snug ${ok ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{ing}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Modo cozinha */}
        <section
          aria-label="Modo cozinha"
          onKeyDown={aoTeclar}
          className="flex min-w-0 flex-col rounded-2xl border border-emerald-400/40 bg-zinc-950/60 p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="rotulo-hud">Modo cozinha</p>
            <p className="text-xs font-semibold tabular-nums text-zinc-400">
              Passo {passo + 1} de {total}
            </p>
          </div>

          <div className="mt-3 flex gap-1" aria-hidden="true">
            {receita.passos.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= passo ? acento.solid : 'bg-zinc-800'}`} />
            ))}
          </div>

          {timerDeOutroPasso && (
            <button
              type="button"
              onClick={() => irPara(timerDeOutroPasso.passo)}
              className={`mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold ${
                timerDeOutroPasso.acabou ? 'animate-pulse bg-clay-500 text-zinc-50' : 'border border-zinc-800 bg-zinc-900/70 text-zinc-300'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={13} />
                {timerDeOutroPasso.acabou ? `Tempo do passo ${timerDeOutroPasso.passo + 1} acabou!` : `Cronômetro do passo ${timerDeOutroPasso.passo + 1}`}
              </span>
              <span className="tabular-nums">{timerDeOutroPasso.acabou ? 'ver' : formatarTempo(timerDeOutroPasso.restante)}</span>
            </button>
          )}

          {concluida ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-zinc-950">
                <Icon name="check" size={24} />
              </span>
              <p className="font-display text-2xl font-bold text-zinc-50">Pronto. Bom apetite!</p>
              <button type="button" onClick={() => irPara(0)} className={botaoSecundario}>
                Voltar ao primeiro passo
              </button>
            </div>
          ) : (
            <>
              <p className="mt-4 min-h-[6.5rem] font-display text-xl font-semibold leading-snug text-zinc-50 sm:text-2xl" aria-live="polite">
                {atual.texto}
              </p>

              {atual.minutos ? (
                <Cronometro
                  minutos={atual.minutos}
                  timer={timerDestePasso}
                  acento={acento}
                  onIniciar={() => iniciarTimer(passo, atual.minutos as number)}
                  onPausar={pausarTimer}
                  onZerar={zerarTimer}
                  onMaisUm={maisUmMinuto}
                />
              ) : null}

              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <button
                  type="button"
                  onClick={() => irPara(passo - 1)}
                  disabled={passo === 0}
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/60 text-sm font-semibold text-zinc-200 transition hover:border-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="chevronRight" size={16} className="rotate-180" /> Anterior
                </button>
                <button
                  type="button"
                  onClick={() => (passo < total - 1 ? irPara(passo + 1) : setConcluida(true))}
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-400 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
                >
                  {passo < total - 1 ? (
                    <>
                      Próximo <Icon name="chevronRight" size={16} />
                    </>
                  ) : (
                    <>
                      Concluir <Icon name="check" size={16} />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          <div className="mt-4 border-t border-zinc-800 pt-3">
            <button type="button" onClick={() => setVerTodos((v) => !v)} aria-expanded={verTodos} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-clay-400">
              <Icon name="chevronRight" size={13} className={`transition ${verTodos ? 'rotate-90' : ''}`} />
              {verTodos ? 'Esconder todos os passos' : 'Ver todos os passos'}
            </button>
            {verTodos && (
              <ol className="mt-3 space-y-1.5">
                {receita.passos.map((p, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => irPara(i)}
                      className={`flex w-full gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-zinc-900/70 ${i === passo && !concluida ? 'bg-zinc-900/70 text-zinc-50' : 'text-zinc-400'}`}
                    >
                      <span className="w-5 shrink-0 font-mono text-xs font-bold leading-5 text-zinc-500">{i + 1}.</span>
                      <span className="min-w-0 leading-snug">
                        {p.texto}
                        {p.minutos ? <span className="ml-1.5 whitespace-nowrap text-xs text-zinc-500">({p.minutos} min)</span> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
      <p className="text-[11px] text-zinc-500">Dica: com o foco no modo cozinha, as setas ← e → do teclado mudam de passo.</p>
    </div>
  );
}

function Cronometro({
  minutos,
  timer,
  acento,
  onIniciar,
  onPausar,
  onZerar,
  onMaisUm,
}: {
  minutos: number;
  timer: EstadoTimer | null;
  acento: Acento;
  onIniciar: () => void;
  onPausar: () => void;
  onZerar: () => void;
  onMaisUm: () => void;
}) {
  const totalMs = timer?.total ?? minutos * 60_000;
  const restante = timer ? timer.restante : totalMs;
  const rodando = !!timer?.fim;
  const acabou = !!timer?.acabou;
  const pct = totalMs ? Math.min(100, Math.max(0, ((totalMs - restante) / totalMs) * 100)) : 0;

  return (
    <div
      className={`mt-4 rounded-2xl border p-4 transition ${acabou ? 'animate-pulse border-clay-500 bg-clay-950' : 'border-zinc-800 bg-zinc-900/70'}`}
      role="timer"
      aria-label={`Cronômetro de ${minutos} minutos`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{acabou ? 'Tempo esgotado' : 'Cronômetro'}</p>
          <p className={`font-display text-4xl font-bold tabular-nums leading-none ${acabou ? 'text-clay-300' : 'text-zinc-50'}`}>{formatarTempo(restante)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {rodando ? (
            <button type="button" onClick={onPausar} className={botaoSecundario}>
              <Icon name="pause" size={12} /> Pausar
            </button>
          ) : (
            !acabou && (
              <button type="button" onClick={onIniciar} className={botaoPrimario}>
                <Icon name="play" size={11} /> {timer && timer.restante < timer.total ? 'Continuar' : `Iniciar ${minutos} min`}
              </button>
            )
          )}
          {(rodando || acabou || (timer && timer.restante < timer.total)) && (
            <button type="button" onClick={onMaisUm} className={botaoSecundario}>
              +1 min
            </button>
          )}
          {timer && (
            <button type="button" onClick={onZerar} className={botaoSecundario}>
              <Icon name="refresh" size={12} /> {acabou ? 'Ok' : 'Zerar'}
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
        <div className={`h-full rounded-full ${acabou ? 'bg-clay-500' : acento.solid}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="sr-only" aria-live="assertive">
        {acabou ? 'O tempo deste passo acabou.' : ''}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recursos: cartões com selo Grátis/Pago

function BlocoRecursos({ itens, acento }: { itens: { nome: string; descricao: string; url: string; gratis: boolean; tag: string }[]; acento: Acento }) {
  const [tag, setTag] = useState<string | null>(null);
  const tags = useMemo(() => Array.from(new Set(itens.map((i) => i.tag))), [itens]);
  // Só filtra quando as categorias agrupam de verdade (não uma por item).
  const comFiltro = tags.length >= 3 && tags.length <= Math.floor(itens.length / 2);
  const lista = tag ? itens.filter((i) => i.tag === tag) : itens;

  return (
    <div className="space-y-4">
      {comFiltro && (
        <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]" role="group" aria-label="Filtrar por categoria">
          <button type="button" onClick={() => setTag(null)} aria-pressed={tag === null} className={chip(tag === null)}>
            Todos ({itens.length})
          </button>
          {tags.map((t) => (
            <button key={t} type="button" onClick={() => setTag(tag === t ? null : t)} aria-pressed={tag === t} className={chip(tag === t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((r) => (
          <li key={r.url + r.nome} className="min-w-0">
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:-translate-y-0.5 hover:border-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${acento.bg} ${acento.text}`}>{r.tag}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
                    r.gratis ? 'bg-emerald-400 text-zinc-950' : 'border border-zinc-700 text-zinc-300'
                  }`}
                >
                  {r.gratis ? 'Grátis' : 'Pago'}
                </span>
              </span>
              <span className="mt-2 break-words font-display text-lg font-bold leading-snug text-zinc-50 group-hover:text-emerald-400">{r.nome}</span>
              <span className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-300">{r.descricao}</span>
              <span className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-800 pt-2.5">
                <span className="min-w-0 truncate font-mono text-[11px] text-zinc-500">{hostDe(r.url)}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:text-clay-400">
                  Abrir ↗<span className="sr-only"> (abre em nova aba)</span>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Respiração guiada

const ESCALA_MIN = 0.5;
const ESCALA_MAX = 1;

type Movimento = 'sobe' | 'desce' | 'segura';
const movimentoDe = (nome: string): Movimento => (/^inspir/i.test(nome) ? 'sobe' : /^(expir|solt)/i.test(nome) ? 'desce' : 'segura');

/** Escala-alvo no fim de cada fase. Inspirações seguidas dividem a subida. */
function alvosDasFases(tecnica: TecnicaRespiracao): { inicio: number; fim: number; mov: Movimento }[] {
  const fases = tecnica.fases;
  const saida: { inicio: number; fim: number; mov: Movimento }[] = [];
  let atual = ESCALA_MIN;
  let i = 0;
  while (i < fases.length) {
    const mov = movimentoDe(fases[i].nome);
    if (mov === 'segura') {
      saida.push({ inicio: atual, fim: atual, mov });
      i++;
      continue;
    }
    let j = i;
    while (j < fases.length && movimentoDe(fases[j].nome) === mov) j++;
    const totalSeg = fases.slice(i, j).reduce((s, f) => s + f.segundos, 0) || 1;
    const destino = mov === 'sobe' ? ESCALA_MAX : ESCALA_MIN;
    const partida = atual;
    let acumulado = 0;
    for (let k = i; k < j; k++) {
      const ini = partida + (destino - partida) * (acumulado / totalSeg);
      acumulado += fases[k].segundos;
      const fim = partida + (destino - partida) * (acumulado / totalSeg);
      saida.push({ inicio: ini, fim, mov });
    }
    atual = destino;
    i = j;
  }
  return saida;
}

const suavizar = (p: number) => 0.5 - Math.cos(Math.PI * p) / 2;

function BlocoRespiracao({ tecnicas, acento, ativo }: { tecnicas: TecnicaRespiracao[]; acento: Acento; ativo: boolean }) {
  const [indice, setIndice] = useState(0);
  const [estado, setEstado] = useState<'parado' | 'rodando' | 'pausado' | 'fim'>('parado');
  const [fase, setFase] = useState(0);
  const [ciclo, setCiclo] = useState(1);
  const [segundos, setSegundos] = useState(tecnicas[0]?.fases[0]?.segundos ?? 0);
  const reduzido = useMovimentoReduzido();
  const circuloRef = useRef<HTMLDivElement>(null);
  // Motor fora do React: posição exata sem re-renderizar a cada quadro.
  const motor = useRef({ fase: 0, ciclo: 1, inicio: 0, decorridoNaPausa: 0 });

  const tecnica = tecnicas[indice];
  const alvos = useMemo(() => (tecnica ? alvosDasFases(tecnica) : []), [tecnica]);

  const pintar = useCallback(
    (escala: number) => {
      const el = circuloRef.current;
      if (!el) return;
      if (reduzido) {
        // Sem movimento: o círculo fica parado e só a intensidade muda.
        el.style.transform = 'scale(0.8)';
        el.style.opacity = String(0.25 + ((escala - ESCALA_MIN) / (ESCALA_MAX - ESCALA_MIN)) * 0.5);
      } else {
        el.style.transform = `scale(${escala})`;
        el.style.opacity = '0.45';
      }
    },
    [reduzido],
  );

  const reiniciar = useCallback(
    (novoIndice = indice) => {
      const t = tecnicas[novoIndice];
      motor.current = { fase: 0, ciclo: 1, inicio: 0, decorridoNaPausa: 0 };
      setEstado('parado');
      setFase(0);
      setCiclo(1);
      setSegundos(t?.fases[0]?.segundos ?? 0);
      pintar(ESCALA_MIN);
    },
    [indice, tecnicas, pintar],
  );

  useEffect(() => {
    pintar(ESCALA_MIN);
  }, [pintar]);

  // Pausa sozinho ao sair da aba ou esconder a página.
  useEffect(() => {
    if (!ativo && estado === 'rodando') setEstado('pausado');
  }, [ativo, estado]);
  useEffect(() => {
    const aoMudar = () => {
      if (document.visibilityState === 'hidden') setEstado((e) => (e === 'rodando' ? 'pausado' : e));
    };
    document.addEventListener('visibilitychange', aoMudar);
    return () => document.removeEventListener('visibilitychange', aoMudar);
  }, []);

  useEffect(() => {
    if (estado !== 'rodando' || !tecnica) return;
    const fases = tecnica.fases;
    const m = motor.current;
    m.inicio = performance.now() - m.decorridoNaPausa;
    let raf = 0;
    let ultimoSeg = -1;

    const quadro = (agora: number) => {
      let dur = fases[m.fase].segundos * 1000;
      while (agora - m.inicio >= dur) {
        m.inicio += dur;
        m.fase += 1;
        if (m.fase >= fases.length) {
          m.fase = 0;
          m.ciclo += 1;
          if (m.ciclo > tecnica.ciclos) {
            m.decorridoNaPausa = 0;
            pintar(ESCALA_MIN);
            setEstado('fim');
            return;
          }
          setCiclo(m.ciclo);
        }
        setFase(m.fase);
        ultimoSeg = -1;
        dur = fases[m.fase].segundos * 1000;
      }
      const decorrido = agora - m.inicio;
      m.decorridoNaPausa = decorrido;
      const alvo = alvos[m.fase];
      if (alvo) pintar(alvo.inicio + (alvo.fim - alvo.inicio) * suavizar(Math.min(1, decorrido / dur)));
      const seg = Math.max(1, Math.ceil((dur - decorrido) / 1000));
      if (seg !== ultimoSeg) {
        ultimoSeg = seg;
        setSegundos(seg);
      }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [estado, tecnica, alvos, pintar]);

  if (!tecnica) return null;
  const faseAtual = tecnica.fases[fase];
  const duracaoTotal = Math.round((tecnica.fases.reduce((s, f) => s + f.segundos, 0) * tecnica.ciclos) / 6) / 10;

  return (
    <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Técnica de respiração">
          {tecnicas.map((t, i) => (
            <button
              key={t.nome}
              type="button"
              aria-pressed={i === indice}
              onClick={() => {
                setIndice(i);
                reiniciar(i);
              }}
              className={chip(i === indice)}
            >
              {t.nome}
            </button>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">{tecnica.descricao}</p>
        <ol className="flex flex-wrap gap-1.5" aria-label="Fases de cada ciclo">
          {tecnica.fases.map((f, i) => (
            <li
              key={i}
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                estado !== 'parado' && estado !== 'fim' && i === fase ? `${acento.border} ${acento.bg} ${acento.text} font-semibold` : 'border-zinc-800 text-zinc-400'
              }`}
            >
              {f.nome} · {f.segundos}s
            </li>
          ))}
        </ol>
        <p className="text-xs text-zinc-500">
          {tecnica.ciclos} ciclos · cerca de {duracaoTotal.toLocaleString('pt-BR')} min
        </p>
      </div>

      <div className="flex min-w-0 flex-col items-center gap-4">
        <div className="relative flex aspect-square w-full max-w-[16rem] items-center justify-center sm:max-w-[18rem]">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-zinc-700" aria-hidden="true" />
          <div
            className="absolute inset-[25%] rounded-full border border-zinc-700 opacity-60"
            aria-hidden="true"
          />
          <div ref={circuloRef} className={`absolute inset-0 rounded-full will-change-transform ${acento.solid}`} style={{ transform: `scale(${ESCALA_MIN})`, opacity: 0.45 }} aria-hidden="true" />
          <div className="relative z-[1] px-4 text-center">
            {estado === 'parado' ? (
              <>
                <p className="font-display text-lg font-bold text-zinc-50">Pronto?</p>
                <p className="mt-1 text-xs text-zinc-300">Sente-se confortável e toque em começar.</p>
              </>
            ) : estado === 'fim' ? (
              <>
                <p className="font-display text-lg font-bold text-zinc-50">Muito bem.</p>
                <p className="mt-1 text-xs text-zinc-300">Perceba como você está agora.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-zinc-50">{faseAtual.nome}</p>
                <p className="font-display text-5xl font-bold tabular-nums leading-none text-zinc-50">{segundos}</p>
                <p className="mt-1 text-[11px] font-semibold text-zinc-300">
                  ciclo {Math.min(ciclo, tecnica.ciclos)} de {tecnica.ciclos}
                </p>
              </>
            )}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {estado === 'rodando' ? faseAtual.nome : estado === 'fim' ? 'Exercício concluído.' : ''}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {estado === 'rodando' ? (
            <button type="button" onClick={() => setEstado('pausado')} className={`${botaoSecundario} px-4 py-2 text-sm`}>
              <Icon name="pause" size={14} /> Pausar
            </button>
          ) : estado === 'fim' ? (
            <button
              type="button"
              onClick={() => {
                reiniciar();
                setEstado('rodando');
              }}
              className={`${botaoPrimario} px-4 py-2 text-sm`}
            >
              <Icon name="refresh" size={14} /> De novo
            </button>
          ) : (
            <button type="button" onClick={() => setEstado('rodando')} className={`${botaoPrimario} px-4 py-2 text-sm`}>
              <Icon name="play" size={13} /> {estado === 'pausado' ? 'Continuar' : 'Começar'}
            </button>
          )}
          {(estado === 'pausado' || estado === 'rodando') && (
            <button type="button" onClick={() => reiniciar()} className={`${botaoSecundario} px-4 py-2 text-sm`}>
              Recomeçar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jogos grátis ao vivo (Epic + FreeToGame, via /api/jogos-gratis)

interface JogoEpic {
  titulo: string;
  imagem: string | null;
  link: string;
  ate: string | null;
  inicio?: string | null;
  emBreve: boolean;
}
interface JogoF2P {
  titulo: string;
  imagem: string | null;
  link: string;
  genero: string;
  plataforma: string;
  resumo: string;
}
interface RespostaJogos {
  epic: JogoEpic[];
  gratis: JogoF2P[];
  falhas?: string[];
}

/** Guarda por sessão: trocar de aba não refaz a busca. */
let jogosGuardados: RespostaJogos | null = null;

function dataCurta(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function BlocoJogosGratis({ ativo }: { ativo: boolean }) {
  const [dados, setDados] = useState<RespostaJogos | null>(jogosGuardados);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async (forcar = false) => {
    if (!forcar && jogosGuardados) return;
    setCarregando(true);
    setErro(false);
    try {
      const res = await fetch('/api/jogos-gratis', { cache: forcar ? 'no-store' : 'default' });
      const json = (await res.json().catch(() => null)) as RespostaJogos | null;
      if (!json || !Array.isArray(json.epic) || !Array.isArray(json.gratis)) throw new Error('resposta inválida');
      if (!json.epic.length && !json.gratis.length && !res.ok) throw new Error('fontes fora do ar');
      jogosGuardados = json;
      setDados(json);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (ativo) void carregar();
  }, [ativo, carregar]);

  const falhou = (fonte: string) => dados?.falhas?.includes(fonte);
  const agora = dados?.epic.filter((j) => !j.emBreve) ?? [];
  const emBreve = dados?.epic.filter((j) => j.emBreve) ?? [];

  return (
    <div className="space-y-8">
      {erro && !dados && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-700 p-4">
          <p className="text-sm text-zinc-400">Não deu para buscar os jogos grátis agora.</p>
          <button type="button" onClick={() => void carregar(true)} className={botaoSecundario}>
            <Icon name="refresh" size={13} /> Tentar de novo
          </button>
        </div>
      )}

      {/* Epic Games Store */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h4 className="font-display text-lg font-bold text-zinc-50">Grátis esta semana na Epic</h4>
            <p className="text-xs text-zinc-400">Resgate na loja com a sua conta Epic e o jogo fica na sua biblioteca.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay-500" aria-hidden="true" /> ao vivo
          </span>
        </div>

        {!dados && !erro && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-zinc-900/70" />
            ))}
          </div>
        )}

        {dados && falhou('epic') && <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">A Epic Games Store não respondeu agora. Tente mais tarde.</p>}
        {dados && !falhou('epic') && dados.epic.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">Nenhuma promoção grátis ativa na Epic neste momento.</p>
        )}

        {dados && dados.epic.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...agora, ...emBreve].map((j) => (
              <li key={j.titulo + (j.inicio ?? '')} className="min-w-0">
                <a
                  href={j.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition hover:-translate-y-0.5 hover:border-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <span className="relative block aspect-video overflow-hidden bg-zinc-800">
                    {j.imagem && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={j.imagem} alt="" loading="lazy" className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${j.emBreve ? 'opacity-80 grayscale-[35%]' : ''}`} />
                    )}
                    <span
                      className={`absolute left-2 top-2 rounded-md px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        j.emBreve ? 'bg-zinc-900/95 text-zinc-300' : 'bg-emerald-400 text-zinc-950'
                      }`}
                    >
                      {j.emBreve ? 'Em breve' : 'Grátis agora'}
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-3.5">
                    <span className="font-semibold leading-snug text-zinc-50 group-hover:text-emerald-400">{j.titulo}</span>
                    <span className="mt-1 text-xs text-zinc-400">
                      {j.emBreve ? `A partir de ${dataCurta(j.inicio)}` : j.ate ? `Grátis até ${dataCurta(j.ate)}` : 'Grátis por tempo limitado'}
                    </span>
                    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-emerald-400 group-hover:text-clay-400">
                      {j.emBreve ? 'Ver na loja' : 'Resgatar na Epic'} ↗<span className="sr-only"> (abre em nova aba)</span>
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FreeToGame */}
      <div className="space-y-3">
        <div>
          <h4 className="font-display text-lg font-bold text-zinc-50">Free-to-play populares</h4>
          <p className="text-xs text-zinc-400">Jogos gratuitos para PC e navegador, dos mais jogados. Descrições em inglês, como publicadas pelo FreeToGame.</p>
        </div>

        {!dados && !erro && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-zinc-900/70" />
            ))}
          </div>
        )}
        {dados && falhou('freetogame') && <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">O FreeToGame não respondeu agora. Tente mais tarde.</p>}

        {dados && dados.gratis.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {dados.gratis.map((g) => (
              <li key={g.link} className="min-w-0">
                <a
                  href={g.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition hover:-translate-y-0.5 hover:border-emerald-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <span className="block aspect-video overflow-hidden bg-zinc-800">
                    {g.imagem && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.imagem} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col p-3">
                    <span className="line-clamp-1 text-sm font-semibold text-zinc-50 group-hover:text-emerald-400">{g.titulo}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {g.genero && <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">{g.genero}</span>}
                      {g.plataforma && <span className="rounded-full border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{g.plataforma}</span>}
                    </span>
                    {g.resumo && (
                      <span lang="en" className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-zinc-400">
                        {g.resumo}
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3 text-[11px] text-zinc-500">
        <p>
          Fontes:{' '}
          <a href="https://store.epicgames.com/pt-BR/free-games" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 hover:text-clay-400">
            Epic Games Store
          </a>{' '}
          e{' '}
          <a href="https://www.freetogame.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 hover:text-clay-400">
            FreeToGame.com
          </a>
          . Prazos e preços são definidos pelas lojas.
        </p>
        <button type="button" onClick={() => void carregar(true)} disabled={carregando} className={botaoSecundario}>
          <Icon name="refresh" size={12} className={carregando ? 'animate-spin' : ''} /> {carregando ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>
    </div>
  );
}
