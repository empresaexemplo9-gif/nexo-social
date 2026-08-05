import React from 'react';
import Navbar from '@/components/Navbar';
import Questionnaire from '@/components/Questionnaire';

export const metadata = {
  title: 'Questionário de Interesses — Nexo Social',
  description: 'Personalize os assuntos e eventos que a plataforma entrega para você.',
};

export default function QuestionarioPage() {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Vamos personalizar sua experiência</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Responda algumas perguntas rápidas para calibrar os assuntos e eventos que você recebe.
          </p>
        </div>
        <Questionnaire />
      </main>
    </div>
  );
}
