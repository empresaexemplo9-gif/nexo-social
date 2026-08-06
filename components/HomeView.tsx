'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ContentCard from '@/components/ContentCard';
import TopicGrid from '@/components/TopicGrid';
import EventList from '@/components/EventList';
import Recommendations from '@/components/Recommendations';
import { usePreferences } from '@/lib/preferences';
import { TOPICS, topicLabel, type CategorySlug, type ContentItem, type EventItem } from '@/lib/data';

interface Props {
  contents: ContentItem[];
  events: EventItem[];
}

export default function HomeView({ contents, events }: Props) {
  const { prefs, ready, hasCompleted } = usePreferences();
  const [selectedCategory, setSelectedCategory] = useState<'todos' | CategorySlug>('todos');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  const interests = prefs.interests;

  const orderedContents = useMemo(() => {
    if (!interests.length) return contents;
    return [...contents].sort((a, b) => {
      const am = interests.includes(a.topic) ? 0 : 1;
      const bm = interests.includes(b.topic) ? 0 : 1;
      return am - bm;
    });
  }, [interests, contents]);

  const filteredContents =
    selectedCategory === 'todos' ? orderedContents : orderedContents.filter((c) => c.topic === selectedCategory);


  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, frequency: prefs.frequency }),
      });
      if (!res.ok) throw new Error();
      setStatus('ok');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-grain font-sans text-zinc-100 antialiased selection:bg-clay-400 selection:text-zinc-950">
      <Navbar />

      <main className="mx-auto max-w-7xl space-y-16 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="texture-grain relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-clay-950/40 via-zinc-900 to-emerald-950/30 p-8 shadow-warm md:p-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-clay-500/10 blur-3xl" />
          <div className="relative max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-clay-800/60 bg-clay-950/50 px-3 py-1 text-xs font-medium text-clay-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-clay-400" />
              Curadoria com alma — do vintage ao futuro
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-50 md:text-6xl">
              <span className="italic text-clay-300">Descoberta</span> contínua em Esporte, Cultura, Moda, Música e Tecnologia.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg">
              Conteúdos selecionados a dedo e eventos que aparecem pertinho de você — sem o ruído das redes sociais.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/questionario"
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 shadow-glow transition hover:bg-emerald-400"
              >
                {hasCompleted ? 'Ajustar meus interesses' : 'Personalizar minha experiência'}
              </Link>
              <a
                href="#temas"
                className="rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-clay-500 hover:text-clay-300"
              >
                Explorar temas
              </a>
            </div>
          </div>
        </section>

        {/* Onboarding */}
        {ready && !hasCompleted && (
          <section className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-6 md:flex-row">
            <div>
              <h2 className="text-lg font-semibold text-zinc-50">Personalize sua home em 1 minuto</h2>
              <p className="mt-1 text-sm text-zinc-300">
                Responda ao questionário para receber conteúdos e eventos alinhados aos seus interesses e à sua região.
              </p>
            </div>
            <Link
              href="/questionario"
              className="whitespace-nowrap rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              Responder questionário →
            </Link>
          </section>
        )}

        {/* Indicações automáticas (algoritmo: perfil + proximidade + tempo) */}
        <Recommendations events={events} contents={contents} />

        {/* Temas */}
        <section id="temas" className="scroll-mt-20 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-50">Explore por tema</h2>
            <p className="text-sm text-zinc-300">Cada assunto tem sua própria área com conteúdos aprofundados e agenda local.</p>
          </div>
          <TopicGrid highlight={interests} />
        </section>

        {/* Bom Dia */}
        <section id="bom-dia" className="scroll-mt-20 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 border-b border-zinc-800 pb-6 md:flex-row md:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-zinc-50">☀️ Módulo &quot;Bom Dia&quot;</h2>
              <p className="mt-1 text-sm text-zinc-300">Sua dose matinal de foco, trilhas e nutrição</p>
            </div>
            <Link
              href="/bom-dia"
              className="w-fit rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1 text-xs text-emerald-400 transition hover:bg-emerald-950"
            >
              Abrir módulo completo →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900 p-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">🎵 Trilha Matinal</span>
                <h3 className="mt-2 text-lg font-semibold text-zinc-50">Lofi Vibes &amp; Ambient Focus</h3>
                <p className="mt-1 text-xs text-zinc-400">Curadoria Agendrap • 45 min</p>
              </div>
              <Link
                href="/bom-dia#trilha"
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
              >
                ▶️ Ouvir Trilha do Dia
              </Link>
            </div>
            <Link href="/bom-dia#receita" className="group rounded-xl border border-zinc-800/80 bg-zinc-900 p-6 transition hover:border-clay-700">
              <span className="text-xs font-semibold uppercase tracking-wider text-clay-400">🥑 Nutrição Rápida</span>
              <h3 className="mt-2 text-lg font-semibold text-zinc-50 group-hover:text-clay-300">Toast de Abacate com Ovos Pochê</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">Fermentação natural, abacate, pimenta e ovos pochê. Ver receitas →</p>
            </Link>
            <Link href="/bom-dia#habito" className="group rounded-xl border border-zinc-800/80 bg-zinc-900 p-6 transition hover:border-emerald-700">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">💡 Hábito Matinal</span>
              <h3 className="mt-2 text-lg font-semibold text-zinc-50 group-hover:text-emerald-300">Primeiros 20 Minutos Sem Telas</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">Troque notificações por leitura, hidratação ou caminhada. Ver hábitos →</p>
            </Link>
          </div>
        </section>

        {/* Hub */}
        <section id="entretenimento" className="scroll-mt-20 space-y-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-50">Hub de Entretenimento</h2>
              <p className="text-sm text-zinc-300">Editorial independente e recomendações em destaque</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('todos')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                  selectedCategory === 'todos' ? 'bg-emerald-500 font-semibold text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Todos
              </button>
              {TOPICS.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => setSelectedCategory(t.slug)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                    selectedCategory === t.slug ? 'bg-emerald-500 font-semibold text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {filteredContents.slice(0, 8).map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        {/* Agenda */}
        <section id="agenda" className="scroll-mt-20 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-50">Agenda Tecnológica &amp; Cultural</h2>
            <p className="text-sm text-zinc-300">Eventos selecionados de acordo com o seu perfil e a sua proximidade.</p>
          </div>
          <EventList events={events} showFilters />
        </section>

        {/* Newsletter */}
        <section
          id="newsletter"
          className="texture-grain relative mx-auto max-w-3xl space-y-4 overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-clay-950/30 p-8 text-center md:p-12"
        >
          <h2 className="text-2xl font-semibold text-zinc-50">Receba a curadoria por e-mail</h2>
          <p className="text-sm text-zinc-300">
            Os melhores destaques de tecnologia, música, cultura, moda e esporte — na frequência que você escolher.
          </p>
          {status === 'ok' ? (
            <div className="rounded-xl border border-emerald-800 bg-emerald-950/60 p-4 text-sm font-medium text-emerald-400">
              ✓ Inscrição realizada! Você receberá a curadoria {prefs.frequency}.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="mx-auto flex max-w-md flex-col gap-3 pt-2 sm:flex-row">
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {status === 'loading' ? 'Enviando…' : 'Inscrever-se'}
              </button>
            </form>
          )}
          {status === 'error' && <p className="text-xs text-clay-300">Não foi possível concluir a inscrição. Tente novamente.</p>}
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <span>nexo-social / Agendrap — Curadoria personalizada</span>
          <div className="flex gap-4">
            <Link href="/questionario" className="hover:text-zinc-300">Questionário</Link>
            <Link href="/login" className="hover:text-zinc-300">Criar conta</Link>
            <Link href="/bom-dia" className="hover:text-zinc-300">Bom Dia</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
