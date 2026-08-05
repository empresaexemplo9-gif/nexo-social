import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

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
  {
    title: 'Toast de Abacate com Ovos Pochê',
    time: '10 min',
    steps: 'Pão de fermentação natural, abacate amassado com azeite extra virgem, pimenta preta e dois ovos pochê. Finalize com sementes de gergelim.',
  },
  {
    title: 'Bowl de Iogurte, Granola & Frutas Vermelhas',
    time: '5 min',
    steps: 'Iogurte natural, granola sem açúcar, mel, morangos e mirtilos. Uma dose de proteína e fibras para começar bem.',
  },
  {
    title: 'Smoothie Verde Energético',
    time: '4 min',
    steps: 'Espinafre, banana, maçã verde, gengibre e água de coco batidos. Leve, hidratante e rico em micronutrientes.',
  },
];

const habits = [
  {
    title: 'Primeiros 20 minutos sem telas',
    body: 'Troque a checagem imediata de notificações por leitura, hidratação ou uma caminhada ao ar livre.',
  },
  {
    title: 'Luz natural logo ao acordar',
    body: 'A exposição à luz da manhã regula o ritmo circadiano e melhora o sono na noite seguinte.',
  },
  {
    title: 'Três respirações profundas',
    body: 'Antes do café, faça três respirações lentas para reduzir o cortisol e ganhar clareza mental.',
  },
];

export default function BomDiaPage() {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
      <Navbar />

      <main className="mx-auto max-w-5xl space-y-14 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-emerald-950/30 p-8 md:p-12">
          <nav className="mb-4 text-xs text-zinc-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-amber-400">Bom Dia</span>
          </nav>
          <div className="text-5xl">☀️</div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">Módulo &quot;Bom Dia&quot;</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-300">
            Comece o dia com intenção: uma trilha sonora para focar, uma receita rápida e um hábito para clarear a mente.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href="#trilha" className="rounded-full border border-emerald-800/50 bg-emerald-950/50 px-4 py-1.5 text-xs font-medium text-emerald-400">🎵 Trilha</a>
            <a href="#receita" className="rounded-full border border-amber-800/50 bg-amber-950/40 px-4 py-1.5 text-xs font-medium text-amber-400">🥑 Nutrição</a>
            <a href="#habito" className="rounded-full border border-indigo-800/50 bg-indigo-950/40 px-4 py-1.5 text-xs font-medium text-indigo-400">💡 Hábitos</a>
          </div>
        </section>

        {/* Trilha */}
        <section id="trilha" className="scroll-mt-24 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">🎵 Trilha Matinal</h2>
            <p className="text-sm text-zinc-400">Lofi Vibes &amp; Ambient Focus — Curadoria Agendrap • 45 min</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-4 border-b border-zinc-800 bg-gradient-to-r from-emerald-950/40 to-zinc-900 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-2xl text-zinc-950">▶</div>
              <div>
                <p className="text-lg font-semibold text-white">Lofi Vibes &amp; Ambient Focus</p>
                <p className="text-xs text-zinc-400">Playlist do dia • 5 faixas</p>
              </div>
            </div>
            <ul className="divide-y divide-zinc-800">
              {tracks.map((t, i) => (
                <li key={t.title} className="flex items-center justify-between px-6 py-3 transition hover:bg-zinc-800/40">
                  <div className="flex items-center gap-4">
                    <span className="w-5 text-right text-xs text-zinc-500">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{t.title}</p>
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
            <h2 className="text-2xl font-bold text-white">🥑 Nutrição Rápida</h2>
            <p className="text-sm text-zinc-400">Receitas de até 10 minutos para um café da manhã equilibrado.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {recipes.map((r) => (
              <div key={r.title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <span className="rounded-full border border-amber-800/50 bg-amber-950/40 px-2.5 py-0.5 text-xs font-medium text-amber-400">{r.time}</span>
                <h3 className="mt-3 text-lg font-semibold text-white">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{r.steps}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hábitos */}
        <section id="habito" className="scroll-mt-24 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">💡 Hábitos &amp; Foco</h2>
            <p className="text-sm text-zinc-400">Pequenos rituais para uma manhã mais clara e produtiva.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {habits.map((h) => (
              <div key={h.title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="text-lg font-semibold text-white">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{h.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
          <h2 className="text-xl font-bold text-white">Quer o Bom Dia no seu ritmo?</h2>
          <p className="mt-1 text-sm text-zinc-400">Defina a frequência da curadoria no questionário de interesses.</p>
          <Link href="/questionario" className="mt-5 inline-block rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400">
            Personalizar →
          </Link>
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-600">
        nexo-social / Agendrap — Bom Dia
      </footer>
    </div>
  );
}
