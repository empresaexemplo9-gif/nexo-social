import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { INVITE_TITLE, INVITE_DESCRIPTION, INVITE_SITE, inviteImage } from '@/lib/invite-art';

type Props = { params: { token: string } };
export function generateMetadata({ params }: Props): Metadata {
  const images = [{ url: `${INVITE_SITE}${inviteImage(params.token)}`, width: 1200, height: 630, alt: INVITE_TITLE }];
  return {
    title: 'Um convite especial — Nexo Social', description: INVITE_DESCRIPTION,
    robots: { index: false, follow: false }, referrer: 'no-referrer',
    openGraph: { type: 'website', title: INVITE_TITLE, description: INVITE_DESCRIPTION, url: `${INVITE_SITE}/convite/${params.token}`, images },
    twitter: { card: 'summary_large_image', title: INVITE_TITLE, description: INVITE_DESCRIPTION, images },
  };
}

export default function Invitation({ params }: Props) {
  if (!/^[a-f0-9]{64}$/.test(params.token)) notFound();
  return <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-7 px-5 py-12">
    <p className="font-mono text-xs uppercase tracking-[.3em] text-zinc-400">Nexo Social · acesso por convite</p>
    <img src={inviteImage(params.token)} width={1200} height={630} alt="Seu jeito único tem lugar aqui. Um convite para o ecossistema Nexo Social." className="w-full rounded-2xl border border-zinc-700 shadow-2xl" />
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold sm:text-4xl">Algumas conexões começam com um sinal.</h1>
      <p className="text-lg leading-relaxed text-zinc-300">Este convite chegou até você porque seu jeito de ver o mundo é especial. Um ecossistema de pessoas, cultura e descobertas espera pela sua personalidade única.</p>
      <Link href={`/login?cadastro=1&convite=${encodeURIComponent(params.token)}`} className="inline-flex rounded-xl bg-[#e9e2d1] px-7 py-4 font-semibold text-[#141512]">Abrir meu convite ↗</Link>
      <p className="text-xs text-zinc-400">Convite pessoal, de uso único. A disponibilidade será confirmada ao abrir.</p>
    </div>
  </main>;
}
