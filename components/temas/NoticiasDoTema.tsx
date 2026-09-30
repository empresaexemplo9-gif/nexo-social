'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../icons';
import { getTopic, type CategorySlug, type Topic } from '@/lib/data';

interface Noticia {
  id: string;
  titulo: string;
  resumo: string;
  link: string;
  imagem: string | null;
  fonte: string;
  site: string;
  publicadaEm: string;
}
interface Resposta {
  itens: Noticia[];
  fontes: { nome: string; site: string; ok: boolean }[];
}

const DEZ_MIN = 10 * 60_000;
/** Quantos cards aparecem antes do "Mais notícias" (fora o destaque). */
const NA_GRADE = 8;

/** Guarda por sessão: voltar à página não refaz a busca enquanto estiver fresca. */
const guardadas = new Map<string, { r: Resposta; em: number }>();

/** "agora", "há 12 min", "há 3 h", "ontem", "há 4 dias". */
function ha(iso: string | number, agora: number): string {
  const s = Math.max(0, (agora - (typeof iso === 'number' ? iso : Date.parse(iso))) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ontem';
  return `há ${Math.floor(s / 86400)} dias`;
}

const dataCompleta = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

function Linha({ n, t, agora }: { n: Noticia; t: Topic; agora: number }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-zinc-500">
      <span className={`truncate font-semibold ${t.accent.text}`}>{n.fonte}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={n.publicadaEm} title={dataCompleta(n.publicadaEm)} className="shrink-0">
        {ha(n.publicadaEm, agora)}
      </time>
    </span>
  );
}

function Foto({ src, onFalha, className }: { src: string; onFalha: (src: string) => void; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => onFalha(src)} className={className} />
  );
}

/** Painel de leitura: a notícia aberta aqui dentro, com o link para a matéria original em nova aba. */
function Leitura({
  n,
  t,
  foto,
  agora,
  onFalha,
  onFechar,
  onAnterior,
  onProxima,
}: {
  n: Noticia;
  t: Topic;
  foto: string | null;
  agora: number;
  onFalha: (src: string) => void;
  onFechar: () => void;
  onAnterior: (() => void) | null;
  onProxima: (() => void) | null;
}) {
  const painel = useRef<HTMLDivElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;
  const jaAberto = useRef(false);

  // Ao abrir, o foco vai para o painel; ao trocar de notícia (anterior/próxima),
  // só volta ao "Fechar" se o botão usado ficou desabilitado.
  useEffect(() => {
    painel.current?.querySelector('[data-rolagem]')?.scrollTo({ top: 0 });
    const ativo = document.activeElement as HTMLButtonElement | null;
    if (!jaAberto.current || !ativo || !painel.current?.contains(ativo) || ativo.disabled) botaoFechar.current?.focus();
    jaAberto.current = true;
  }, [n.id]);

  // Esc fecha, Tab fica preso no painel e a página de trás não rola.
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar.current();
        return;
      }
      if (e.key !== 'Tab' || !painel.current) return;
      const focaveis = Array.from(painel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      if (!focaveis.length) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && (document.activeElement === primeiro || !painel.current.contains(document.activeElement))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !painel.current.contains(document.activeElement))) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
    };
  }, []);

  const idTitulo = `noticia-${n.id}-titulo`;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
      <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" onClick={onFechar} />
      <div ref={painel} className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-soft sm:rounded-3xl">
        <div data-rolagem className="min-h-0 overflow-y-auto">
          {foto && (
            <div className="relative aspect-[16/9] bg-zinc-800">
              <Foto src={foto} onFalha={onFalha} className="absolute inset-0 h-full w-full object-cover" />
            </div>
          )}
          <div className="p-5 sm:p-7">
            <Linha n={n} t={t} agora={agora} />
            <h3 id={idTitulo} className="mt-3 pr-8 font-display text-2xl font-extrabold leading-tight text-zinc-50 sm:text-3xl">
              {n.titulo}
            </h3>
            {n.resumo ? (
              <p className="mt-4 text-[0.98rem] leading-relaxed text-zinc-200">{n.resumo}</p>
            ) : (
              <p className="mt-4 text-sm text-zinc-400">O veículo não publicou um resumo desta notícia.</p>
            )}
            <p className="mt-5 text-xs leading-relaxed text-zinc-500">
              Publicada em {dataCompleta(n.publicadaEm)}. Resumo de {n.fonte} — o texto completo fica no site do veículo.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 p-4 sm:px-7">
          <a
            href={n.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            Ler a matéria completa em {n.fonte} <span aria-hidden="true">↗</span>
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
          <span className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={onAnterior ?? undefined}
              disabled={!onAnterior}
              aria-label="Notícia anterior"
              className="rounded-xl border border-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
            >
              <Icon name="chevronRight" size={16} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={onProxima ?? undefined}
              disabled={!onProxima}
              aria-label="Próxima notícia"
              className="rounded-xl border border-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
            >
              <Icon name="chevronRight" size={16} />
            </button>
          </span>
        </div>
        <button
          ref={botaoFechar}
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute right-3 top-3 rounded-xl bg-zinc-900/90 p-2 text-zinc-400 shadow-soft transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Notícias ao vivo do tema: as manchetes dos feeds dos veículos (g1, Folha,
 * Estadão, revistas especializadas…), atualizadas ao longo do dia. Carrega
 * quando chega perto da tela e se renova a cada 10 minutos enquanto está
 * visível. A notícia abre num painel aqui dentro; a matéria original, em nova aba.
 */
export default function NoticiasDoTema({ tema }: { tema: CategorySlug }) {
  const t = getTopic(tema);
  const caixa = useRef<HTMLElement>(null);
  const temaAtual = useRef(tema);
  const tentativa = useRef(0);
  const focoAnterior = useRef<HTMLElement | null>(null);
  const [dados, setDados] = useState<{ r: Resposta; em: number } | null>(guardadas.get(tema) ?? null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [perto, setPerto] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [filtro, setFiltro] = useState<string | null>(null);
  const [todas, setTodas] = useState(false);
  const [aberta, setAberta] = useState<Noticia | null>(null);
  const [quebradas, setQuebradas] = useState<ReadonlySet<string>>(() => new Set());

  // Troca de tema sem desmontar: começa do zero (ou do que já estava guardado).
  useEffect(() => {
    temaAtual.current = tema;
    setDados(guardadas.get(tema) ?? null);
    setErro(false);
    setFiltro(null);
    setTodas(false);
    setAberta(null);
  }, [tema]);

  const carregar = useCallback(async () => {
    const pedido = tema;
    tentativa.current = Date.now();
    setCarregando(true);
    try {
      const res = await fetch(`/api/noticias?tema=${encodeURIComponent(pedido)}`);
      if (!res.ok) throw new Error(String(res.status));
      const r = (await res.json()) as Resposta;
      if (!Array.isArray(r?.itens) || !Array.isArray(r?.fontes)) throw new Error('Resposta inesperada');
      const d = { r, em: Date.now() };
      guardadas.set(pedido, d);
      if (temaAtual.current !== pedido) return;
      setDados(d);
      setErro(false);
      setAgora(Date.now());
    } catch {
      if (temaAtual.current === pedido) setErro(true);
    } finally {
      if (temaAtual.current === pedido) setCarregando(false);
    }
  }, [tema]);

  // Perto da tela (400 px de folga) = visível para efeito de carga e renovação.
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setPerto(true);
      return;
    }
    const obs = new IntersectionObserver((e) => setPerto(e[0].isIntersecting), { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!perto) return;
    const guardada = guardadas.get(tema);
    if (!guardada || Date.now() - guardada.em >= DEZ_MIN) void carregar();
    else {
      tentativa.current = Math.max(tentativa.current, guardada.em);
      setAgora(Date.now());
    }
    const relogio = window.setInterval(() => {
      setAgora(Date.now());
      if (document.visibilityState === 'visible' && Date.now() - tentativa.current >= DEZ_MIN) void carregar();
    }, 60_000);
    return () => window.clearInterval(relogio);
  }, [perto, tema, carregar]);

  const falhou = useCallback((src: string) => {
    setQuebradas((s) => {
      if (s.has(src)) return s;
      const nova = new Set(s);
      nova.add(src);
      return nova;
    });
  }, []);

  const abrir = useCallback((n: Noticia) => {
    focoAnterior.current = document.activeElement as HTMLElement | null;
    setAberta(n);
  }, []);
  const fechar = useCallback(() => {
    setAberta(null);
    // Devolve o foco ao card que abriu o painel.
    window.requestAnimationFrame(() => focoAnterior.current?.focus());
  }, []);

  if (!t) return null;

  const itens = dados?.r.itens ?? [];
  const fontesComNoticia = (dados?.r.fontes ?? []).map((f) => f.nome).filter((nome) => itens.some((n) => n.fonte === nome));
  const fontesNoAr = (dados?.r.fontes ?? []).filter((f) => f.ok).map((f) => f.nome);
  const filtroValido = filtro && fontesComNoticia.includes(filtro) ? filtro : null;
  const lista = filtroValido ? itens.filter((n) => n.fonte === filtroValido) : itens;
  const [destaque, ...resto] = lista;
  const naGrade = todas ? resto : resto.slice(0, NA_GRADE);
  const foto = (n: Noticia) => (n.imagem && !quebradas.has(n.imagem) ? n.imagem : null);

  const posicao = aberta ? lista.findIndex((n) => n.id === aberta.id) : -1;
  const anterior = posicao > 0 ? lista[posicao - 1] : null;
  const proxima = posicao >= 0 && posicao < lista.length - 1 ? lista[posicao + 1] : null;

  return (
    <section ref={caixa} id="noticias" aria-labelledby={`noticias-${tema}-titulo`} className="scroll-mt-32 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="rotulo-hud">
            Ao vivo
            <span className="relative inline-flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-clay-500" />
            </span>
          </p>
          <h2 id={`noticias-${tema}-titulo`} className="mt-2 font-display text-3xl font-bold text-zinc-50 md:text-4xl">
            Notícias de {t.label}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            As manchetes dos veículos, atualizadas ao longo do dia. Abra aqui para ler o resumo sem sair da plataforma.
          </p>
        </div>
        {dados && (
          <div className="flex min-w-0 max-w-full flex-col gap-1 text-xs text-zinc-500 sm:max-w-sm sm:items-end sm:text-right">
            <span className="inline-flex items-center gap-2">
              <span aria-live="polite">{carregando ? 'atualizando…' : `atualizado ${ha(dados.em, agora)}`}</span>
              <button
                type="button"
                onClick={() => void carregar()}
                disabled={carregando}
                aria-label="Atualizar notícias"
                className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
              >
                <Icon name="refresh" size={13} className={carregando ? 'animate-spin' : ''} />
              </button>
            </span>
            {fontesNoAr.length > 0 && <span className="leading-relaxed">Fontes: {fontesNoAr.join(', ')}</span>}
          </div>
        )}
      </div>

      {/* Carregando */}
      {!dados && !erro && (
        <div className="space-y-4" aria-busy="true" aria-label="Carregando notícias">
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="h-64 animate-pulse rounded-3xl bg-zinc-800/60 lg:col-span-3 lg:h-80" />
            <div className="hidden space-y-3 lg:col-span-2 lg:block">
              <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-800/60" />
              <div className="h-10 animate-pulse rounded bg-zinc-800/60" />
              <div className="h-10 w-4/5 animate-pulse rounded bg-zinc-800/60" />
              <div className="h-20 animate-pulse rounded bg-zinc-800/40" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-zinc-800/40" />
            ))}
          </div>
        </div>
      )}

      {/* Erro sem nada guardado */}
      {!dados && erro && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-400">
          <p>As notícias de {t.label} não carregaram agora.</p>
          <button
            type="button"
            onClick={() => void carregar()}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition hover:border-zinc-500 disabled:opacity-50"
          >
            <Icon name="refresh" size={13} /> Tentar de novo
          </button>
        </div>
      )}

      {/* Nada nas últimas semanas */}
      {dados && itens.length === 0 && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-400">
          {fontesNoAr.length
            ? `Nenhuma notícia de ${t.label} nas últimas três semanas. Volte mais tarde.`
            : `As fontes de notícias de ${t.label} estão fora do ar agora. Tentamos de novo em alguns minutos.`}
        </p>
      )}

      {/* Filtro por veículo */}
      {fontesComNoticia.length > 1 && (
        <div role="group" aria-label="Filtrar por veículo" className="flex flex-wrap gap-2">
          {[null, ...fontesComNoticia].map((nome) => {
            const ativo = filtroValido === nome;
            const quantas = nome ? itens.filter((n) => n.fonte === nome).length : itens.length;
            return (
              <button
                key={nome ?? '*'}
                type="button"
                aria-pressed={ativo}
                onClick={() => {
                  setFiltro(nome);
                  setTodas(false);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  ativo ? `${t.accent.border} ${t.accent.bg} ${t.accent.text}` : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-100'
                }`}
              >
                {nome ?? 'Todas'} <span className="text-zinc-500">{quantas}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Destaque */}
      {destaque && (
        <button
          type="button"
          onClick={() => abrir(destaque)}
          className="card-soft levanta group grid w-full overflow-hidden text-left lg:grid-cols-5"
        >
          {foto(destaque) && (
            <span className="relative block aspect-[16/9] overflow-hidden bg-zinc-800 lg:col-span-3 lg:aspect-auto lg:min-h-[20rem]">
              <Foto
                src={foto(destaque)!}
                onFalha={falhou}
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded-md bg-clay-500 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-900">
                Destaque
              </span>
            </span>
          )}
          <span className={`flex min-w-0 flex-col p-6 ${foto(destaque) ? 'lg:col-span-2' : 'lg:col-span-5'}`}>
            <Linha n={destaque} t={t} agora={agora} />
            <span className="mt-3 font-display text-3xl font-extrabold leading-[1.02] text-zinc-50 group-hover:text-emerald-400 md:text-4xl">
              {destaque.titulo}
            </span>
            {destaque.resumo && <span className="mt-3 line-clamp-4 text-sm leading-relaxed text-zinc-300">{destaque.resumo}</span>}
            <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-emerald-400 group-hover:text-clay-400">
              Ler aqui <Icon name="arrowRight" size={15} className="transition group-hover:translate-x-1" />
            </span>
          </span>
        </button>
      )}

      {/* Grade */}
      {naGrade.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {naGrade.map((n) => {
            const src = foto(n);
            return (
              <li key={n.id} className="min-w-0">
                <button type="button" onClick={() => abrir(n)} className="card-soft levanta group flex h-full w-full flex-col overflow-hidden text-left">
                  {src && (
                    <span className="relative block aspect-[16/9] w-full overflow-hidden bg-zinc-800">
                      <Foto src={src} onFalha={falhou} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </span>
                  )}
                  <span className="flex flex-1 flex-col p-4">
                    <Linha n={n} t={t} agora={agora} />
                    <span className="mt-2 font-display text-lg font-bold leading-snug text-zinc-50 group-hover:text-emerald-400">{n.titulo}</span>
                    {n.resumo && <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">{n.resumo}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!todas && resto.length > NA_GRADE && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setTodas(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
          >
            Mais notícias <span className="text-zinc-500">({resto.length - NA_GRADE})</span>
          </button>
        </div>
      )}

      {aberta && (
        <Leitura
          n={aberta}
          t={t}
          foto={foto(aberta)}
          agora={agora}
          onFalha={falhou}
          onFechar={fechar}
          onAnterior={anterior ? () => setAberta(anterior) : null}
          onProxima={proxima ? () => setAberta(proxima) : null}
        />
      )}
    </section>
  );
}
