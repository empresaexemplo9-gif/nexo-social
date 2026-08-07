'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Icon from '@/components/icons';
import InterestsView from '@/components/InterestsView';
import LiveAlerts from '@/components/LiveAlerts';
import HeritageShelf from '@/components/HeritageShelf';
import ClipsShelf from '@/components/ClipsShelf';
import InstallApp from '@/components/InstallApp';
import AgendaTimeline from '@/components/AgendaTimeline';
import { usePreferences } from '@/lib/preferences';
import type { ContentItem, EventItem } from '@/lib/data';

interface Props {
  contents: ContentItem[];
  events: EventItem[];
}

export default function HomeView({ events }: Props) {
  const { prefs } = usePreferences();
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
        {/* Convite a instalar — some sozinho quando já está instalado */}
        <InstallApp />

        {/* INTERESSES E HOBBIES — o coração da home:
            perfil, trilha do Spotify, nichos e indicações. */}
        <InterestsView events={events} />

        {/* O que está no ar agora nos temas seguidos */}
        <LiveAlerts />

        {/* Clipes do primeiro tema seguido */}
        {prefs.interests?.[0] && <ClipsShelf topic={prefs.interests[0]} />}

        {/* Acervo histórico dos temas seguidos — muda todo dia */}
        <HeritageShelf titulo="Para conhecer hoje" />

        {/* Agenda pessoal, logo abaixo — o timeline já traz o próprio cabeçalho. */}
        <AgendaTimeline events={events} />

        {/* Bom Dia */}
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-zinc-50">
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
          <h2 className="text-2xl font-semibold text-zinc-50">Receba a curadoria por e-mail</h2>
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
          <span>nexo.social — interesses e hobbies</span>
          <div className="flex gap-5">
            <Link href="/agenda" className="hover:text-zinc-300">Compromissos</Link>
            <Link href="/questionario" className="hover:text-zinc-300">Questionário</Link>
            <Link href="/conta" className="hover:text-zinc-300">Minha conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
