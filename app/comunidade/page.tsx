import React from 'react';
import Navbar from '@/components/Navbar';
import ComunidadeHub from '@/components/comunidade/ComunidadeHub';

export const metadata = {
  title: 'Comunidade — nexo.social',
  description: 'Conversas, opiniões, resenhas e experiências; listas e playlists com retorno de quem ouve; rodas de conversa; grupos para ouvir e assistir juntos.',
};

export default function ComunidadePage() {
  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-start gap-4 sm:items-center">
          {/* O selo NEXO dos murais, colado de leve torto. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bg/comunidade/quadros/selo-mini.webp"
            alt=""
            aria-hidden
            width={72}
            height={72}
            className="adesivo h-14 w-14 shrink-0 rounded-full object-cover shadow-[0_10px_24px_-8px_rgb(0_0_0/0.8)] ring-2 ring-white/80 sm:h-[4.5rem] sm:w-[4.5rem]"
            style={{ '--giro': '-8deg' } as React.CSSProperties}
          />
          <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-zinc-400">Nexo · Social · Cultura · Novidade</p>
          <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-zinc-50 sm:text-5xl">Comunidade</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Puxe conversa, peça e dê opiniões, conte experiências e resenhe filmes, livros, shows, jogos e esportes. Monte listas e
            playlists, abra rodas de conversa e crie grupos para ouvir e assistir junto — você escolhe se todos veem, só seus contatos ou
            um grupo.
          </p>
          </div>
        </div>
        <ComunidadeHub />
      </main>
    </div>
  );
}
