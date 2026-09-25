'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Icon from '@/components/icons';
import InterestsView, { SectionHeader } from '@/components/InterestsView';
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

      {/* Largura total: a home usa a tela inteira, com respiro só nas bordas. */}
      <main className="w-full space-y-14 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
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

        <div className="grid grid-cols-1 gap-10 xl:grid-cols-12 xl:gap-8">
          {/* Bom Dia */}
          <section className="space-y-5 xl:col-span-5">
            <SectionHeader
              label="Rotina"
              title="Bom Dia"
              icon="sunrise"
              subtitle="Como começar o dia com calma e foco."
              action={
                <Link href="/bom-dia" className="shrink-0 font-mono text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-300">
                  abrir →
                </Link>
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {[
                { href: '/bom-dia#trilha', icon: 'headphones' as const, label: 'Trilha matinal', text: 'Lofi & ambiente para focar' },
                { href: '/bom-dia#receita', icon: 'leaf' as const, label: 'Nutrição rápida', text: 'Receitas de até 10 minutos' },
                { href: '/bom-dia#habito', icon: 'bulb' as const, label: 'Hábitos', text: 'Pequenos rituais de manhã' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-emerald-500/50 hover:shadow-neon 2xl:block"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-zinc-950/70 text-emerald-300">
                    <Icon name={item.icon} size={20} />
                  </span>
                  <span className="block 2xl:mt-4">
                    <span className="block text-sm font-semibold text-zinc-50 group-hover:text-emerald-300">{item.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{item.text}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Newsletter — painel com as linhas de luz subindo ao fundo */}
          <section className="card-soft texture-grain cantos-hud relative overflow-hidden xl:col-span-7">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-linhas-luz bg-cover bg-bottom opacity-80" />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent via-zinc-950/40 to-zinc-950/90" />
            <div className="relative flex h-full flex-col justify-center p-7 text-center md:p-10">
              <p className="rotulo-hud mx-auto">Transmissão</p>
              <h2 className="mt-3 text-3xl font-semibold text-zinc-50 texto-neon">Receba a curadoria por e-mail</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-300">
                Um resumo do que vem por aí nos seus temas — na frequência que você escolher.
              </p>
              {status === 'ok' ? (
                <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-950/60 p-4 text-sm font-medium text-emerald-300">
                  <Icon name="check" size={16} /> Inscrição confirmada — você receberá a curadoria {prefs.frequency}.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="mx-auto mt-6 flex w-full max-w-lg flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 rounded-xl border border-emerald-400/20 bg-zinc-950/80 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:bg-emerald-300 disabled:opacity-60"
                  >
                    {status === 'loading' ? 'Enviando…' : 'Inscrever-se'}
                  </button>
                </form>
              )}
              {status === 'error' && <p className="mt-3 text-xs text-clay-300">Não foi possível concluir. Tente novamente.</p>}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-emerald-400/10 bg-zinc-950/60 py-8 text-xs text-zinc-500 backdrop-blur">
        <div className="flex w-full flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-10 2xl:px-14">
          <span className="font-mono uppercase tracking-widest">nexo.social — interesses e hobbies</span>
          <div className="flex gap-5">
            <Link href="/agenda" className="hover:text-emerald-300">Compromissos</Link>
            <Link href="/questionario" className="hover:text-emerald-300">Questionário</Link>
            <Link href="/conta" className="hover:text-emerald-300">Minha conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
