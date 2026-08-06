import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Icon from '@/components/icons';
import { fetchBomDia } from '@/lib/repo';

export const revalidate = 300;

export const metadata = {
  title: 'Bom Dia — Nexo Social',
  description: 'Sua dose matinal de foco, trilhas sonoras e nutrição.',
};

const tracks = [
  { title: 'Ambient Focus I', artist: 'Curadoria Agendrap', duration: '6:12' },
  { title: 'Lofi Sunrise', artist: 'Curadoria Agendrap', duration: '4:48' },
  { title: 'Deep Work Pad', artist: 'Curadoria Agendrap', duration: '7:30' },
  { title: 'Morning Piano', artist: 'Curadoria Agendrap', duration: '5:05' },
  { title: 'Slow Bloom', artist: 'Curadoria Agendrap', duration: '6:40' },
];

const recipes = [
  { title: 'Bowl de Iogurte, Granola & Frutas Vermelhas', time: '5 min', steps: 'Iogurte natural, granola sem açúcar, mel, morangos e mirtilos. Proteína e fibras para começar bem.' },
  { title: 'Smoothie Verde Energético', time: '4 min', steps: 'Espinafre, banana, maçã verde, gengibre e água de coco batidos. Leve, hidratante e rico em micronutrientes.' },
];

const habits = [
  { title: 'Luz natural logo ao acordar', body: 'A exposição à luz da manhã regula o ritmo circadiano e melhora o sono na noite seguinte.' },
  { title: 'Três respirações profundas', body: 'Antes do café, faça três respirações lentas para reduzir o cortisol e ganhar clareza mental.' },
];

export default async function BomDiaPage() {
  const bomDia = await fetchBomDia();

  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-5xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="texture-grain relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-clay-500/15 via-zinc-900 to-emerald-950/30 p-8 shadow-warm md:p-12">
          <nav className="mb-4 text-xs text-zinc-400">
            <Link href="/" className="hover:text-zinc-100">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-clay-300">Bom Dia</span>
          </nav>
          <div className="text-clay-300"><Icon name="sunrise" size={44} /></div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
            Módulo <span className="italic text-clay-300">Bom Dia</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-200">
            Comece o dia com intenção: uma trilha sonora para focar, uma receita rápida e um hábito para clarear a mente.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="#trilha" className="rounded-full border border-emerald-800/50 bg-emerald-950/40 px-4 py-1.5 text-xs font-medium text-emerald-400"><span className="inline-flex items-center gap-1.5"><Icon name="headphones" size={14} /> Trilha</span></a>
            <a href="#receita" className="rounded-full border border-clay-800/50 bg-clay-950/40 px-4 py-1.5 text-xs font-medium text-clay-300"><span className="inline-flex items-center gap-1.5"><Icon name="leaf" size={14} /> Nutrição</span></a>
            <a href="#habito" className="rounded-full border border-emerald-800/50 bg-emerald-950/40 px-4 py-1.5 text-xs font-medium text-emerald-400"><span className="inline-flex items-center gap-1.5"><Icon name="bulb" size={14} /> Hábitos</span></a>
          </div>
        </section>

        {/* Trilha */}
        <section id="trilha" className="scroll-mt-24 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-50"><span className="inline-flex items-center gap-2"><Icon name="headphones" size={20} className="text-emerald-400" /> Trilha Matinal</span></h2>
            <p className="text-sm text-zinc-300">{bomDia.soundtrackTitle} — {bomDia.soundtrackArtist} • 45 min</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-4 border-b border-zinc-800 bg-gradient-to-r from-emerald-950/40 to-zinc-900 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-zinc-950"><Icon name="play" size={26} /></div>
              <div>
                <p className="text-lg font-semibold text-zinc-50">{bomDia.soundtrackTitle}</p>
                <p className="text-xs text-zinc-400">Playlist do dia • {tracks.length} faixas</p>
              </div>
            </div>
            <ul className="divide-y divide-zinc-800">
              {tracks.map((t, i) => (
                <li key={t.title} className="flex items-center justify-between px-6 py-3 transition hover:bg-zinc-800/40">
                  <div className="flex items-center gap-4">
                    <span className="w-5 text-right text-xs text-zinc-500">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{t.title}</p>
                      <p className="text-xs text-zinc-500">{t.artist}</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">{t.duration}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Receitas */}
        <section id="receita" className="scroll-mt-24 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-50"><span className="inline-flex items-center gap-2"><Icon name="leaf" size={20} className="text-clay-300" /> Nutrição Rápida</span></h2>
            <p className="text-sm text-zinc-300">Receitas de até 10 minutos para um café da manhã equilibrado.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-clay-800/50 bg-clay-950/20 p-6">
              <span className="rounded-full border border-clay-800/50 bg-clay-950/40 px-2.5 py-0.5 text-xs font-medium text-clay-300">Destaque de hoje</span>
              <h3 className="mt-3 text-lg font-semibold text-zinc-50">{bomDia.recipeTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{bomDia.recipeDescription}</p>
            </div>
            {recipes.map((r) => (
              <div key={r.title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-0.5 text-xs font-medium text-zinc-300">{r.time}</span>
                <h3 className="mt-3 text-lg font-semibold text-zinc-50">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{r.steps}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hábitos */}
        <section id="habito" className="scroll-mt-24 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-50"><span className="inline-flex items-center gap-2"><Icon name="bulb" size={20} className="text-emerald-400" /> Hábitos &amp; Foco</span></h2>
            <p className="text-sm text-zinc-300">Pequenos rituais para uma manhã mais clara e produtiva.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-6">
              <span className="text-xs font-medium text-emerald-400">Dica do dia</span>
              <p className="mt-2 text-base leading-relaxed text-zinc-100">{bomDia.quickTip}</p>
            </div>
            {habits.map((h) => (
              <div key={h.title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="text-lg font-semibold text-zinc-50">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{h.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-zinc-50">Quer o Bom Dia no seu ritmo?</h2>
          <p className="mt-1 text-sm text-zinc-300">Defina a frequência da curadoria no questionário de interesses.</p>
          <Link href="/questionario" className="mt-5 inline-block rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400">
            Personalizar →
          </Link>
        </section>
      </main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">nexo-social / Agendrap — Bom Dia</footer>
    </div>
  );
}
