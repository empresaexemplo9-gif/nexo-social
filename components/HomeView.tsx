'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Icon from '@/components/icons';
import { AssistirLerWidget, HeroDoPerfil, NichosWidget, SectionHeader, TrilhaWidget } from '@/components/InterestsView';
import LiveAlerts from '@/components/LiveAlerts';
import HeritageShelf from '@/components/HeritageShelf';
import ClipsShelf from '@/components/ClipsShelf';
import InstallApp from '@/components/InstallApp';
import BomDiaWidget from '@/components/bom-dia/BomDiaWidget';
import AgendaTimeline from '@/components/AgendaTimeline';
import MontarHome from '@/components/home/MontarHome';
import EscolherWidgets from '@/components/home/EscolherWidgets';
import { ComunidadeDestaque, ConvitesDestaque } from '@/components/home/Destaques';
import EventosDoTema from '@/components/home/EventosDoTema';
import { GratisWidget, RevistaWidget, ShortsWidget } from '@/components/home/WidgetsDeMidia';
import { usePreferences } from '@/lib/preferences';
import { getTopic, type ContentItem, type EventItem } from '@/lib/data';
import { widgetDeTema } from '@/lib/widgets';

interface Props {
  contents: ContentItem[];
  events: EventItem[];
}

export default function HomeView({ events }: Props) {
  const { prefs, ready, checked } = usePreferences();
  const [montando, setMontando] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  // Primeiro acesso: ainda não escolheu os widgets (e a conta já respondeu,
  // para não perguntar de novo a quem escolheu em outro aparelho).
  const primeiroAcesso = ready && checked && prefs.homeWidgets === null;

  const alternarMontagem = () => {
    setMontando((m) => !m);
    requestAnimationFrame(() => document.getElementById('widgets')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  /** O que cada widget mostra; `null` quando não há o que mostrar. */
  const conteudo = useCallback(
    (id: string): React.ReactNode => {
      switch (id) {
        case 'trilha':
          return <TrilhaWidget />;
        case 'assistir-ler':
          return <AssistirLerWidget />;
        case 'shorts':
          return <ShortsWidget />;
        case 'gratis':
          return <GratisWidget />;
        case 'revista':
          return <RevistaWidget />;
        case 'nichos':
          return <NichosWidget events={events} />;
        case 'ao-vivo':
          return <LiveAlerts />;
        case 'clipes':
          return prefs.interests?.[0] ? <ClipsShelf topic={prefs.interests[0]} /> : null;
        case 'conhecer-hoje':
          return <HeritageShelf titulo="Para conhecer hoje" />;
        case 'bom-dia':
          return <BomDiaWidget />;
        case 'newsletter':
          return <NewsletterWidget />;
      }
      const tema = widgetDeTema(id);
      if (!tema || !getTopic(tema.tema)) return null;
      if (tema.tipo === 'clipes') return <ClipsShelf topic={tema.tema} />;
      if (tema.tipo === 'acervo') return <HeritageShelf topic={tema.tema} titulo={`Para conhecer: ${getTopic(tema.tema)!.label}`} />;
      return <EventosDoTema tema={tema.tema} events={events} />;
    },
    [events, prefs.interests],
  );

  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />

      {/* Largura total: a home usa a tela inteira, com respiro só nas bordas. */}
      <main className="w-full space-y-12 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
        {/* Convite a instalar — some sozinho quando já está instalado */}
        <InstallApp />

        <HeroDoPerfil onMontar={alternarMontagem} montando={montando} />

        {/* Sempre em evidência: Agenda, Comunidade e os convites ainda não usados */}
        <AgendaTimeline events={events} />
        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="min-w-0 xl:flex-1"><ComunidadeDestaque /></div>
          <ConvitesDestaqueCaixa />
        </div>

        {/* Os widgets, na ordem e no tamanho que a pessoa escolheu */}
        <div id="widgets" className="scroll-mt-20">
          {(primeiroAcesso || escolhendo) ? (
            <EscolherWidgets
              inicial={prefs.homeWidgets}
              onPronto={() => {
                setEscolhendo(false);
                setMontando(false);
              }}
            />
          ) : (
            ready && (
              <MontarHome
                montando={montando}
                onConcluir={() => setMontando(false)}
                onEscolher={() => {
                  setMontando(false);
                  setEscolhendo(true);
                }}
                conteudo={conteudo}
              />
            )
          )}
        </div>

        {!montando && !escolhendo && !primeiroAcesso && ready && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={alternarMontagem}
              className="action-collage action-collage--paper action-collage--seal group inline-flex items-center gap-2 rounded-full border border-dashed border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-clay-500 hover:text-clay-300"
            >
              <Icon name="palette" size={15} className="transition duration-500 group-hover:rotate-45" /> Montar minha home
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-900/60 py-8 text-xs text-zinc-500 backdrop-blur">
        <div className="flex w-full flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-10 2xl:px-14">
          <span className="font-mono uppercase tracking-widest">nexo.social — cultura • novidade</span>
          <div className="flex gap-5">
            <Link href="/agenda" className="hover:text-clay-400">Agenda</Link>
            <Link href="/questionario" className="hover:text-clay-400">Questionário</Link>
            <Link href="/conta" className="hover:text-clay-400">Minha conta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Convites ocupam meia largura ao lado da Comunidade — e somem quando acabam. */
function ConvitesDestaqueCaixa() {
  return (
    <div className="min-w-0 empty:hidden xl:flex-1">
      <ConvitesDestaque />
    </div>
  );
}

/** Widget: inscrição na curadoria por e-mail. */
function NewsletterWidget() {
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
    <section className="card-soft texture-grain cantos-hud relative h-full overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linhas-luz bg-cover bg-bottom opacity-30" />
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-clay-500/15 blur-3xl motion-safe:animate-deriva" />
      <div className="relative flex h-full flex-col justify-center p-7 text-center md:p-10">
        <p className="rotulo-hud mx-auto">Transmissão</p>
        <h2 className="mt-3 text-4xl font-bold text-zinc-50">
          Receba a <span className="texto-neon">curadoria</span> por e-mail
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          Um resumo do que vem por aí nos seus temas — na frequência que você escolher.
        </p>
        {status === 'ok' ? (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-950 p-4 text-sm font-medium text-emerald-300">
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
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-500 transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-400/10"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-xl action-patch action-patch--cobalt bg-emerald-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:-translate-y-0.5 hover:bg-emerald-300 disabled:opacity-60"
            >
              {status === 'loading' ? 'Enviando…' : 'Inscrever-se'}
            </button>
          </form>
        )}
        {status === 'error' && <p className="mt-3 text-xs text-clay-300">Não foi possível concluir. Tente novamente.</p>}
      </div>
    </section>
  );
}
