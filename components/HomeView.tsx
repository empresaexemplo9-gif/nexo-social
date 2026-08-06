'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Icon from '@/components/icons';
import AgendaTimeline from '@/components/AgendaTimeline';
import TopicGrid from '@/components/TopicGrid';
import { usePreferences } from '@/lib/preferences';
import type { ContentItem, EventItem } from '@/lib/data';

interface Props {
  contents: ContentItem[];
  events: EventItem[];
}

export default function HomeView({ events }: Props) {
  const { prefs, ready, hasCompleted } = usePreferences();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

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
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />

      <main className="mx-auto max-w-5xl space-y-14 px-4 py-8 sm:px-6 lg:px-8">
        {/* Convite ao questionário (só enquanto não respondido) */}
        {ready && !hasCompleted && (
          <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-emerald-900/50 bg-emerald-950/20 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-emerald-400">
                <Icon name="sparkles" size={20} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-zinc-50">Deixe a agenda com a sua cara</h2>
                <p className="mt-0.5 text-sm text-zinc-300">
                  Escolha seus temas e a sua região — leva menos de um minuto.
                </p>
              </div>
            </div>
            <Link
              href="/questionario"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-glow transition hover:bg-emerald-400"
            >
              Começar <Icon name="arrowRight" size={16} />
            </Link>
          </section>
        )}

        {/* AGENDA PESSOAL — o coração da home */}
        <AgendaTimeline events={events} />

        {/* Nichos: as indicações de cada tema ficam dentro do próprio botão */}
        <section id="temas" className="scroll-mt-20 space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-50">Seus nichos</h2>
              <p className="mt-1 text-sm text-zinc-300">Toque em um tema para ver as indicações dele.</p>
            </div>
            <Link href="/questionario" className="shrink-0 text-xs text-emerald-400 hover:underline">
              editar
            </Link>
          </div>
          <TopicGrid events={events} />
        </section>

        {/* Bom Dia */}
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-zinc-50">
                <span className="text-clay-300">
                  <Icon name="sunrise" size={22} />
                </span>
                Bom Dia
              </h2>
              <p className="mt-1 text-sm text-zinc-300">Como começar o dia com calma e foco.</p>
            </div>
            <Link href="/bom-dia" className="shrink-0 text-xs text-emerald-400 hover:underline">
              abrir
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { href: '/bom-dia#trilha', icon: 'headphones' as const, label: 'Trilha matinal', text: 'Lofi & ambiente para focar' },
              { href: '/bom-dia#receita', icon: 'leaf' as const, label: 'Nutrição rápida', text: 'Receitas de até 10 minutos' },
              { href: '/bom-dia#habito', icon: 'bulb' as const, label: 'Hábitos', text: 'Pequenos rituais de manhã' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-3xl border border-zinc-800/80 bg-zinc-900/50 p-5 transition hover:border-emerald-800/60 hover:bg-zinc-900"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/60 text-emerald-400">
                  <Icon name={item.icon} size={20} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-zinc-50 group-hover:text-emerald-300">{item.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{item.text}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="card-soft texture-grain relative overflow-hidden p-7 text-center md:p-10">
          <h2 className="text-2xl font-semibold text-zinc-50">Receba a agenda por e-mail</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-300">
            Um resumo do que vem por aí nos seus temas — na frequência que você escolher.
          </p>
          {status === 'ok' ? (
            <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-emerald-800 bg-emerald-950/50 p-4 text-sm font-medium text-emerald-300">
              <Icon name="check" size={16} /> Inscrição confirmada — você receberá a curadoria {prefs.frequency}.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="mx-auto mt-5 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {status === 'loading' ? 'Enviando…' : 'Inscrever-se'}
              </button>
            </form>
          )}
          {status === 'error' && <p className="mt-3 text-xs text-clay-300">Não foi possível concluir. Tente novamente.</p>}
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
          <span>nexo.social — sua agenda pessoal</span>
          <div className="flex gap-5">
            <Link href="/questionario" className="hover:text-zinc-300">Questionário</Link>
            <Link href="/bom-dia" className="hover:text-zinc-300">Bom Dia</Link>
            <Link href="/conta" className="hover:text-zinc-300">Minha conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
