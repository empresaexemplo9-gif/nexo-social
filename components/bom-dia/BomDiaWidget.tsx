'use client';
import React from 'react';
import Link from 'next/link';
import Icon from '@/components/icons';
import { SectionHeader } from '@/components/InterestsView';
import { useBomDia } from './useBomDia';

export default function BomDiaWidget() {
  const { day, round, selection, next } = useBomDia();
  return <section className="space-y-5">
    <SectionHeader label="Rotina" title="Bom Dia" icon="sunrise" subtitle="Receitas, movimento e ideias que mudam todos os dias."
      action={<Link href={`/bom-dia?rodada=${round}`} className="text-xs font-semibold text-emerald-400 underline">Abrir Bom Dia →</Link>} />
    {!day ? <p role="status">Preparando as ideias de hoje…</p> : <>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: `/bom-dia?rodada=${round}#receita`, icon: 'leaf' as const, label: 'Na cozinha', text: selection.recipes[0].title },
          { href: `/bom-dia?rodada=${round}#treino`, icon: 'activity' as const, label: `${selection.routine.minutes} min de movimento`, text: selection.routine.title },
          { href: `/bom-dia?rodada=${round}#habito`, icon: 'bulb' as const, label: 'Para experimentar', text: selection.tips[0].title },
        ].map(item => <Link key={item.href} href={item.href} className="card-soft block p-5">
          <Icon name={item.icon} size={24} className="text-emerald-400" />
          <span className="mt-3 block text-xs text-zinc-400">{item.label}</span>
          <span className="mt-1 block text-sm font-semibold">{item.text}</span>
        </Link>)}
      </div>
      <button type="button" onClick={next} className="text-sm font-semibold text-emerald-400 underline">Ver outras ideias</button>
    </>}
  </section>;
}
