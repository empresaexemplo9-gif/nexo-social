'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '../icons';
import { usePreferences } from '@/lib/preferences';
import { APARENCIA_PADRAO, OPCOES_DE_BOTAO, OPCOES_DE_FUNDO, muralDoFundo, type OpcaoDeFundo } from '@/lib/aparencia';

/**
 * O fundo de uma opção: a cor (ou o degradê) do tema, a textura e o mural de
 * colagens por cima, esmaecido e misturado à cor. `tela`: o fundo da home
 * inteira — como no papel padrão, o mural quase some no meio e ganha cor nas
 * bordas. Sem `tela`, a amostra do seletor (o mural inteiro, em miniatura).
 */
export function AmostraDeFundo({ opcao, tela = false, className = '' }: { opcao: OpcaoDeFundo | null; tela?: boolean; className?: string }) {
  const modo = tela ? '' : ' mural-fundo--amostra';
  if (!opcao) {
    return (
      <span className={`relative isolate block overflow-hidden bg-zinc-950 ${className}`} style={{ backgroundImage: 'var(--grao)' }}>
        <span aria-hidden className={`mural-fundo${modo}`} style={{ backgroundImage: 'url(/bg/mural.webp)' }} />
      </span>
    );
  }
  return (
    <span className={`relative isolate block overflow-hidden ${className}`} style={{ background: opcao.gradiente ?? opcao.cor }}>
      {opcao.textura && <span aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${opcao.textura})`, opacity: opcao.opacidade }} />}
      <span
        aria-hidden
        className={`mural-fundo mural-fundo--${opcao.muralEscuro ? 'escuro' : 'claro'}${modo}`}
        style={{ backgroundImage: `url(${muralDoFundo(opcao, !tela)})` }}
      />
    </span>
  );
}

/**
 * Personalizar a aparência: a cor e a textura do fundo da home e a cor dos
 * botões e destaques da plataforma — cada uma independente da outra, com as
 * opções dos temas dos convites. A escolha vale na hora e fica na conta.
 */
export default function PersonalizarAparencia({ onFechar }: { onFechar: () => void }) {
  const { prefs, save } = usePreferences();
  const aparencia = prefs.aparencia ?? APARENCIA_PADRAO;
  const [aba, setAba] = useState<'fundo' | 'botoes'>('fundo');
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    painel.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onFechar]);

  const escolher = (mudanca: Partial<typeof aparencia>) => void save({ aparencia: { ...aparencia, ...mudanca } });

  const abaBtn = (id: typeof aba, rotulo: string, icone: 'image' | 'palette') => (
    <button
      type="button"
      role="tab"
      aria-selected={aba === id}
      onClick={() => setAba(id)}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${aba === id ? 'bg-emerald-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}
    >
      <Icon name={icone} size={14} /> {rotulo}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end sm:items-stretch" role="dialog" aria-modal="true" aria-labelledby="personalizar-titulo">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/30" />
      <div
        ref={painel}
        tabIndex={-1}
        className="relative flex max-h-[82vh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl outline-none sm:max-h-none sm:w-[26rem] sm:rounded-none sm:rounded-l-3xl"
      >
        <header className="flex items-start gap-3 border-b border-zinc-800 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400">
            <Icon name="palette" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="rotulo-hud">Sua estética</p>
            <h2 id="personalizar-titulo" className="font-display text-xl font-bold text-zinc-50">Personalizar cores</h2>
            <p className="mt-1 text-xs text-zinc-400">As cores e texturas dos adesivos dos convites. O fundo da home e os botões mudam separados — escolha um, o outro ou os dois.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-full p-2 text-zinc-500 hover:text-zinc-100">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div role="tablist" aria-label="O que personalizar" className="mx-5 mt-4 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
          {abaBtn('fundo', 'Fundo da home', 'image')}
          {abaBtn('botoes', 'Botões e destaques', 'palette')}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {aba === 'fundo' ? (
            <>
              <p className="mb-3 text-xs text-zinc-500">A cor, a textura e o mural de colagens atrás dos cartões da home. Os cartões continuam claros; em fundos escuros, os títulos ficam claros sozinhos.</p>
              <ul className="grid grid-cols-3 gap-2.5">
                <li>
                  <button type="button" onClick={() => escolher({ fundo: null })} aria-pressed={!aparencia.fundo} className="group block w-full text-left">
                    <AmostraDeFundo opcao={null} className={`aspect-square rounded-xl border-2 ${!aparencia.fundo ? 'border-emerald-400' : 'border-zinc-800'}`} />
                    <span className="mt-1 block truncate text-[11px] font-semibold text-zinc-300">Papel (padrão)</span>
                  </button>
                </li>
                {OPCOES_DE_FUNDO.map((o) => {
                  const ativo = aparencia.fundo === o.id;
                  return (
                    <li key={o.id}>
                      <button type="button" onClick={() => escolher({ fundo: o.id })} aria-pressed={ativo} title={o.nome} className="group block w-full text-left">
                        <span className={`relative block rounded-xl border-2 p-0.5 transition ${ativo ? 'border-emerald-400' : 'border-transparent group-hover:border-zinc-700'}`}>
                          <AmostraDeFundo opcao={o} className="aspect-square rounded-[0.6rem]" />
                          {ativo && (
                            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-zinc-950">
                              <Icon name="check" size={12} />
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-zinc-400">{o.nome}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <p className="mb-3 text-xs text-zinc-500">A cor dos botões, abas, filtros, links de destaque e do menu, na plataforma inteira. O tecido e a costura dos botões continuam.</p>
              <ul className="grid grid-cols-2 gap-2.5">
                <li>
                  <button type="button" onClick={() => escolher({ botoes: null })} aria-pressed={!aparencia.botoes} className={`flex w-full items-center gap-2 rounded-xl border-2 p-2 text-left ${!aparencia.botoes ? 'border-emerald-400' : 'border-zinc-800 hover:border-zinc-700'}`}>
                    <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: '#2b5288', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }} />
                    <span className="min-w-0 text-[11px] font-semibold text-zinc-300">Azul nexo (padrão)</span>
                  </button>
                </li>
                {OPCOES_DE_BOTAO.map((o) => {
                  const ativo = aparencia.botoes === o.id;
                  return (
                    <li key={o.id}>
                      <button type="button" onClick={() => escolher({ botoes: o.id })} aria-pressed={ativo} title={`${o.nome} · ${o.origem}`} className={`flex w-full items-center gap-2 rounded-xl border-2 p-2 text-left transition ${ativo ? 'border-emerald-400' : 'border-zinc-800 hover:border-zinc-700'}`}>
                        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg" style={{ background: o.cor, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.2)' }}>
                          <span aria-hidden className="absolute inset-[3px] rounded-[5px] border border-dashed border-white/50" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-semibold text-zinc-200">{o.nome}</span>
                          <span className="block truncate text-[10px] text-zinc-500">{o.origem}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-zinc-800 p-4">
          <button
            type="button"
            onClick={() => escolher({ fundo: null, botoes: null })}
            disabled={!aparencia.fundo && !aparencia.botoes}
            className="text-xs font-semibold text-zinc-400 hover:text-clay-300 disabled:opacity-40"
          >
            Voltar ao padrão
          </button>
          <button type="button" onClick={onFechar} className="action-patch rounded-xl bg-emerald-400 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300">
            Pronto
          </button>
        </footer>
      </div>
    </div>
  );
}
