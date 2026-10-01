import React from 'react';
import Link from 'next/link';
import { Selo } from '@/components/Logo';
import EncerrarSessao from './EncerrarSessao';
import { MENSAGEM_BANIMENTO, REGRAS, REGRAS_RESUMO, REGRAS_TITULO } from '@/lib/regras';

export const metadata = {
  title: 'Conta banida — nexo.social',
  robots: { index: false },
};

/** Para onde vai quem foi banido pelas regras da comunidade. A sessão é encerrada aqui. */
export default function BanidoPage() {
  return (
    <div className="tela-sem-barra flex min-h-screen items-center justify-center p-4 text-zinc-100">
      <EncerrarSessao />
      <main className="card-soft w-full max-w-lg space-y-5 p-8">
        <div className="text-center">
          <Selo size={88} textura />
          <h1 className="mt-4 font-display text-2xl font-bold text-zinc-50">Conta banida</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{MENSAGEM_BANIMENTO} O acesso não volta.</p>
        </div>
        <section aria-labelledby="regras" className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-sm leading-relaxed text-zinc-300">
          <h2 id="regras" className="font-semibold text-zinc-50">{REGRAS_TITULO}</h2>
          <p className="mt-1">{REGRAS_RESUMO}</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            {REGRAS.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>
        <p className="text-center text-xs text-zinc-500">
          Se você acredita que houve um engano, escreva para a administração da plataforma. Veja também os{' '}
          <Link href="/termos" className="underline">Termos de Serviço</Link>.
        </p>
      </main>
    </div>
  );
}
