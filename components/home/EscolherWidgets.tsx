'use client';

import React, { useMemo, useState } from 'react';
import Icon from '../icons';
import { descreverWidget } from './MontarHome';
import { usePreferences } from '@/lib/preferences';
import { WIDGETS_DE_TEMA, WIDGETS_FIXOS, type TipoDeTema, type WidgetDaHome } from '@/lib/widgets';

const SUGERIDOS = ['revista', 'assistir-ler', 'shorts'];

/**
 * Primeiro acesso: a pessoa escolhe o que quer na home. Agenda, Comunidade e
 * convites já ficam fixos no topo; aqui entra só o resto. Dá para mudar
 * depois em "Montar minha home" (e arrastar para reordenar).
 */
export default function EscolherWidgets({ onPronto, inicial }: { onPronto?: () => void; inicial?: WidgetDaHome[] | null }) {
  const { prefs, save } = usePreferences();
  const [marcados, setMarcados] = useState<string[]>(() => inicial?.map((w) => w.id) ?? SUGERIDOS);
  const [salvando, setSalvando] = useState(false);

  const opcoes = useMemo(() => {
    const fixos = Object.keys(WIDGETS_FIXOS);
    const deTema = prefs.interests.flatMap((slug) => (Object.keys(WIDGETS_DE_TEMA) as TipoDeTema[]).map((tipo) => `${tipo}:${slug}`));
    return { fixos, deTema };
  }, [prefs.interests]);

  const alternar = (id: string) => setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  const concluir = async (ids: string[]) => {
    setSalvando(true);
    const lista: WidgetDaHome[] = ids.map((id) => ({ id, tamanho: WIDGETS_FIXOS[id]?.tamanhoPadrao ?? 'inteira' }));
    await save({ homeWidgets: lista });
    setSalvando(false);
    onPronto?.();
  };

  const cartao = (id: string) => {
    const info = descreverWidget(id);
    if (!info) return null;
    const on = marcados.includes(id);
    const ordem = marcados.indexOf(id) + 1;
    return (
      <button
        key={id}
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={() => alternar(id)}
        className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition duration-200 ${on ? 'border-emerald-400 bg-emerald-950/60 shadow-glow' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-600'}`}
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-emerald-400 text-zinc-950' : 'bg-zinc-900 text-emerald-400'}`}>
          <Icon name={info.icone} size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-50">{info.titulo}</span>
          <span className="block text-xs text-zinc-400">{info.descricao}</span>
        </span>
        <span className={`mt-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${on ? 'bg-emerald-400 text-zinc-950' : 'border border-zinc-700 text-transparent'}`}>
          {on ? ordem : '·'}
        </span>
      </button>
    );
  };

  return (
    <section className="card-soft space-y-5 p-5 sm:p-7" aria-labelledby="escolher-widgets">
      <div className="space-y-1.5">
        <p className="rotulo-hud">Sua home, do seu jeito</p>
        <h2 id="escolher-widgets" className="font-display text-2xl font-bold text-zinc-50 sm:text-3xl">O que você quer ver aqui?</h2>
        <p className="max-w-2xl text-sm text-zinc-400">
          Agenda, Comunidade e seus convites já ficam em destaque. Cada nicho tem a própria aba no menu — aqui entra só o que você escolher.
          A ordem é a dos números; depois é só arrastar para mudar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {opcoes.fixos.map(cartao)}
      </div>

      {opcoes.deTema.length > 0 && (
        <>
          <p className="rotulo-hud">Dos temas que você segue</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {opcoes.deTema.map(cartao)}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
        <button
          type="button"
          disabled={salvando}
          onClick={() => void concluir(marcados)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-glow transition hover:bg-emerald-300 disabled:opacity-60"
        >
          <Icon name="check" size={15} /> {marcados.length ? `Montar com ${marcados.length} ${marcados.length === 1 ? 'widget' : 'widgets'}` : 'Deixar só os destaques'}
        </button>
        <span className="text-xs text-zinc-500">Você pode mudar quando quiser em “Montar minha home”.</span>
      </div>
    </section>
  );
}
