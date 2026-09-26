'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../icons';
import { usePreferences } from '@/lib/preferences';
import { getTopic } from '@/lib/data';
import {
  WIDGETS_DE_TEMA,
  WIDGETS_FIXOS,
  widgetDeTema,
  widgetsPadrao,
  type TipoDeTema,
  type WidgetDaHome,
} from '@/lib/widgets';

/** Nome e ícone de um widget, fixo ou de tema. */
export function descreverWidget(id: string) {
  const fixo = WIDGETS_FIXOS[id];
  if (fixo) return { titulo: fixo.titulo, descricao: fixo.descricao, icone: fixo.icone };
  const tema = widgetDeTema(id);
  if (!tema) return null;
  const t = getTopic(tema.tema);
  const tipo = WIDGETS_DE_TEMA[tema.tipo];
  return { titulo: tipo.titulo(t?.label ?? tema.tema), descricao: tipo.descricao, icone: t?.icon ?? tipo.icone };
}

interface Props {
  montando: boolean;
  onConcluir: () => void;
  /** O conteúdo de cada widget; `null` quando não há o que mostrar. */
  conteudo: (id: string) => React.ReactNode;
}

const BOTAO =
  'inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-50 disabled:opacity-30 disabled:hover:bg-transparent';

/**
 * A home em widgets. Fora do modo de montar, só desenha os blocos na ordem
 * escolhida. Montando, cada bloco ganha moldura com arrastar, subir/descer,
 * tamanho e esconder, e a galeria mostra o que dá para acrescentar — os blocos
 * escondidos e os widgets dos temas que a pessoa segue.
 */
export default function MontarHome({ montando, onConcluir, conteudo }: Props) {
  const { prefs, save } = usePreferences();
  const salvo = prefs.homeWidgets ?? widgetsPadrao();
  const [lista, setLista] = useState<WidgetDaHome[]>(salvo);
  const [galeria, setGaleria] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [recemChegado, setRecemChegado] = useState<string | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout>>();

  // A conta pode trazer outro arranjo depois de abrir: adota, a menos que a
  // pessoa esteja mexendo agora.
  const chaveSalva = JSON.stringify(prefs.homeWidgets);
  useEffect(() => {
    if (!montando) setLista(prefs.homeWidgets ?? widgetsPadrao());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveSalva]);

  // Saindo da página com uma mudança ainda na espera: grava na hora.
  const pendente = useRef<WidgetDaHome[] | null>(null);
  const salvar = useRef(save);
  salvar.current = save;
  useEffect(
    () => () => {
      clearTimeout(espera.current);
      if (pendente.current) void salvar.current({ homeWidgets: pendente.current });
    },
    [],
  );

  /** Aplica na hora e grava (aparelho + conta) um instante depois. */
  const mudar = (nova: WidgetDaHome[]) => {
    setLista(nova);
    pendente.current = nova;
    clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      pendente.current = null;
      void save({ homeWidgets: nova });
    }, 500);
  };

  const mover = (id: string, destino: number) => {
    const de = lista.findIndex((w) => w.id === id);
    if (de < 0 || destino < 0 || destino >= lista.length || de === destino) return;
    const nova = [...lista];
    const [w] = nova.splice(de, 1);
    nova.splice(destino, 0, w);
    mudar(nova);
  };

  const alternarTamanho = (id: string) =>
    mudar(lista.map((w) => (w.id === id ? { ...w, tamanho: w.tamanho === 'inteira' ? 'metade' : 'inteira' } : w)));

  const esconder = (id: string) => mudar(lista.filter((w) => w.id !== id));

  const adicionar = (id: string, tamanho: WidgetDaHome['tamanho']) => {
    mudar([...lista, { id, tamanho }]);
    setRecemChegado(id);
    requestAnimationFrame(() =>
      document.querySelector(`[data-widget="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
  };

  // O que ainda dá para pôr na home.
  const disponiveis = useMemo(() => {
    const presentes = new Set(lista.map((w) => w.id));
    const fixos = Object.entries(WIDGETS_FIXOS)
      .filter(([id]) => !presentes.has(id))
      .map(([id, t]) => ({ id, tamanho: t.tamanhoPadrao }));
    const deTema = prefs.interests.flatMap((slug) =>
      (Object.keys(WIDGETS_DE_TEMA) as TipoDeTema[])
        .map((tipo) => `${tipo}:${slug}`)
        .filter((id) => !presentes.has(id))
        .map((id) => ({ id, tamanho: 'inteira' as const })),
    );
    return { fixos, deTema };
  }, [lista, prefs.interests]);

  return (
    <div className="space-y-6">
      {montando && (
        <div className="sticky top-16 z-30 space-y-3 lg:top-3">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-clay-500/40 bg-zinc-900/95 p-3 pl-4 shadow-neon backdrop-blur">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-clay-500 text-zinc-900">
              <Icon name="palette" size={18} />
            </span>
            <p className="min-w-[12rem] flex-1 text-sm text-zinc-300">
              <span className="font-semibold text-zinc-50">Montando sua home.</span> Arraste os blocos, mude o tamanho, esconda ou
              acrescente widgets dos seus interesses.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setGaleria((g) => !g)}
                aria-expanded={galeria}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-100 transition hover:border-emerald-400 hover:text-emerald-400"
              >
                <Icon name="plus" size={14} /> Adicionar widget
              </button>
              <button
                type="button"
                onClick={() => mudar(widgetsPadrao())}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-400 transition hover:text-zinc-50"
              >
                <Icon name="refresh" size={13} /> Restaurar padrão
              </button>
              <button
                type="button"
                onClick={() => {
                  setGaleria(false);
                  onConcluir();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-zinc-950 shadow-glow transition hover:bg-emerald-300"
              >
                <Icon name="check" size={14} /> Concluir
              </button>
            </div>
          </div>

          {galeria && (
            <div className="widget-entra max-h-[60vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 shadow-soft backdrop-blur">
              {disponiveis.fixos.length === 0 && disponiveis.deTema.length === 0 && (
                <p className="text-sm text-zinc-400">Todos os widgets já estão na sua home.</p>
              )}
              {disponiveis.fixos.length > 0 && (
                <>
                  <p className="rotulo-hud">Blocos escondidos</p>
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {disponiveis.fixos.map((w) => (
                      <CartaoDaGaleria key={w.id} id={w.id} onAdicionar={() => adicionar(w.id, w.tamanho)} />
                    ))}
                  </div>
                </>
              )}
              <p className="rotulo-hud mt-5">Dos seus interesses</p>
              {prefs.interests.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-400">Siga temas no questionário para montar widgets com eles.</p>
              ) : disponiveis.deTema.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-400">Os widgets de todos os seus temas já estão na home.</p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {disponiveis.deTema.map((w) => (
                    <CartaoDaGaleria key={w.id} id={w.id} onAdicionar={() => adicionar(w.id, w.tamanho)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-8 gap-y-14 xl:grid-cols-2">
        {lista.map((w, i) => {
          const corpo = conteudo(w.id);
          const info = descreverWidget(w.id);
          if (!info || (!corpo && !montando)) return null;
          const largura = w.tamanho === 'inteira' ? 'xl:col-span-2' : '';

          if (!montando) {
            return (
              <div
                key={w.id}
                data-widget={w.id}
                className={`widget-entra min-w-0 ${largura}`}
                style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
              >
                {corpo}
              </div>
            );
          }

          return (
            <div
              key={w.id}
              data-widget={w.id}
              draggable
              onDragStart={(e) => {
                setArrastando(w.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', w.id);
              }}
              onDragOver={(e) => {
                if (!arrastando) return;
                e.preventDefault();
                if (alvo !== w.id) setAlvo(w.id);
              }}
              onDragLeave={() => setAlvo((a) => (a === w.id ? null : a))}
              onDrop={(e) => {
                e.preventDefault();
                if (arrastando) mover(arrastando, i);
                setArrastando(null);
                setAlvo(null);
              }}
              onDragEnd={() => {
                setArrastando(null);
                setAlvo(null);
              }}
              className={`relative min-w-0 rounded-3xl border-2 border-dashed p-3 pt-12 transition duration-300 ${largura} ${
                alvo === w.id && arrastando !== w.id
                  ? 'border-clay-500 bg-clay-950/80 ring-4 ring-clay-500/15'
                  : 'border-emerald-400/35 bg-emerald-950/50'
              } ${arrastando === w.id ? 'scale-[0.98] opacity-50' : ''} ${recemChegado === w.id ? 'widget-entra' : ''}`}
            >
              <div className="absolute inset-x-3 top-2.5 z-20 flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 px-1.5 py-1 shadow-soft">
                <span className="flex cursor-grab items-center gap-2 px-1.5 text-zinc-500 active:cursor-grabbing" title="Arraste para mudar de lugar">
                  <Icon name="menu" size={15} />
                  <Icon name={info.icone} size={15} className="text-emerald-400" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-100">{info.titulo}</span>
                <button type="button" className={BOTAO} onClick={() => mover(w.id, i - 1)} disabled={i === 0} aria-label={`Subir ${info.titulo}`}>
                  <Icon name="chevronRight" size={14} className="-rotate-90" />
                </button>
                <button
                  type="button"
                  className={BOTAO}
                  onClick={() => mover(w.id, i + 1)}
                  disabled={i === lista.length - 1}
                  aria-label={`Descer ${info.titulo}`}
                >
                  <Icon name="chevronRight" size={14} className="rotate-90" />
                </button>
                <button
                  type="button"
                  className={`${BOTAO} hidden xl:inline-flex`}
                  onClick={() => alternarTamanho(w.id)}
                  aria-label={`Tamanho de ${info.titulo}: ${w.tamanho === 'inteira' ? 'inteira' : 'metade'}`}
                >
                  <span className="flex h-3.5 w-5 overflow-hidden rounded-[3px] border border-current">
                    <span className={`bg-current ${w.tamanho === 'inteira' ? 'w-full' : 'w-1/2'}`} />
                  </span>
                  {w.tamanho === 'inteira' ? 'Inteira' : 'Metade'}
                </button>
                <button
                  type="button"
                  className={`${BOTAO} hover:!bg-clay-950 hover:!text-clay-300`}
                  onClick={() => esconder(w.id)}
                  aria-label={`Esconder ${info.titulo}`}
                >
                  <Icon name="close" size={14} /> <span className="hidden sm:inline">Esconder</span>
                </button>
              </div>
              {/* Miniatura: montando, cada bloco fica baixo para caberem vários na
                  tela e dar para arrastar de um ponto a outro sem rolar muito. */}
              <div
                className="pointer-events-none relative max-h-56 select-none overflow-hidden opacity-80 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
                aria-hidden
              >
                {corpo ?? (
                  <p className="rounded-2xl bg-zinc-900/70 p-6 text-center text-sm text-zinc-500">
                    Este widget aparece quando houver conteúdo para ele.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!montando && lista.length === 0 && (
        <p className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">
          Sua home está vazia — toque em <span className="font-semibold text-zinc-100">Montar minha home</span> para escolher os widgets.
        </p>
      )}
    </div>
  );
}

function CartaoDaGaleria({ id, onAdicionar }: { id: string; onAdicionar: () => void }) {
  const info = descreverWidget(id);
  if (!info) return null;
  return (
    <button
      type="button"
      onClick={onAdicionar}
      className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-zinc-900 hover:shadow-soft"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 transition group-hover:-rotate-6 group-hover:bg-clay-500 group-hover:text-zinc-900">
        <Icon name={info.icone} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-50">{info.titulo}</span>
        <span className="block text-xs text-zinc-400">{info.descricao}</span>
      </span>
      <Icon name="plus" size={16} className="mt-1 text-zinc-500 transition group-hover:rotate-90 group-hover:text-emerald-400" />
    </button>
  );
}
