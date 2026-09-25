import React from 'react';
import Navbar from '@/components/Navbar';
import Questionnaire from '@/components/Questionnaire';

export const metadata = {
  title: 'Questionário de Interesses — Nexo Social',
  description: 'Personalize os assuntos e eventos que a plataforma entrega para você.',
};

export default function QuestionarioPage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">
        {/* Cabeçalho com a rede de conexões ao fundo */}
        <header className="card-soft texture-grain cantos-hud relative mb-6 overflow-hidden p-6 md:p-10 lg:mb-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-rede bg-cover bg-center opacity-70" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/60 to-transparent" />
          <div className="relative max-w-2xl">
            <p className="rotulo-hud">Calibragem do perfil</p>
            <h1 className="mt-3 text-3xl font-bold uppercase tracking-tight text-zinc-50 md:text-5xl">
              Vamos <span className="texto-degrade">personalizar</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300 md:text-base">
              Todas as opções estão nesta página. Marque o que combina com você e salve — dá para voltar e ajustar
              quando quiser.
            </p>
          </div>
        </header>
        <Questionnaire />
      </main>
    </div>
  );
}
