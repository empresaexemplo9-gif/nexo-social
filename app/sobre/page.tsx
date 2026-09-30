import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'nexo.social — cultura, interesses e comunidade',
  description: 'Conheça o nexo.social: conteúdos pelos seus interesses, agenda pessoal e comunidade. Saiba como usamos os dados das conexões com Google e YouTube.',
  alternates: { canonical: 'https://nexo-social.drap.app.br/' },
};

export default function SobrePage() {
  return (
    <div className="tela-sem-barra min-h-screen font-sans text-zinc-100 antialiased">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-8">
        <Link href="/sobre" className="text-2xl font-bold tracking-tight" aria-label="nexo.social — apresentação">nexo.social</Link>
        <Link href="/login" className="rounded-full border border-emerald-500/50 px-5 py-2 text-sm font-semibold text-emerald-300">Entrar</Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <section className="border-b border-zinc-800 py-12 sm:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">Cultura · Interesses · Comunidade</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">Seu mundo de interesses, mais perto de você.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">O nexo.social reúne conteúdos de cultura, música, livros, esportes e outros temas, uma agenda pessoal e espaços de comunidade. Escolha seus interesses, descubra novidades e organize os encontros que fazem parte da sua vida.</p>
          <Link href="/login" className="mt-8 inline-block rounded-full bg-emerald-400 px-7 py-3 font-semibold text-zinc-950">Entrar no nexo.social</Link>
          <p className="mt-3 text-sm text-zinc-400">O acesso à plataforma é feito por conta autorizada ou convite.</p>
        </section>
        <section className="grid gap-8 py-12 sm:grid-cols-3" aria-label="Recursos da plataforma">
          <article><h2 className="text-2xl font-semibold">Descubra</h2><p className="mt-3 leading-relaxed text-zinc-300">Explore sugestões de conteúdos, vídeos, leituras e eventos de acordo com os temas que você escolhe.</p></article>
          <article><h2 className="text-2xl font-semibold">Organize</h2><p className="mt-3 leading-relaxed text-zinc-300">Reúna compromissos, convites e eventos salvos na sua agenda pessoal.</p></article>
          <article><h2 className="text-2xl font-semibold">Conecte-se</h2><p className="mt-3 leading-relaxed text-zinc-300">Participe de grupos e conversas e compartilhe interesses com outras pessoas da comunidade.</p></article>
        </section>
        <section className="rounded-3xl border border-zinc-700 bg-zinc-900/50 p-6 sm:p-9" aria-labelledby="google-data">
          <h2 id="google-data" className="text-3xl font-semibold">Você escolhe o que conectar</h2>
          <div className="mt-5 space-y-4 leading-relaxed text-zinc-300">
            <p><strong className="text-zinc-100">Login com Google.</strong> Quando você escolhe essa opção, usamos os dados básicos autorizados, como nome, e-mail e foto, para identificar sua conta e permitir o acesso. Não recebemos sua senha do Google.</p>
            <p><strong className="text-zinc-100">YouTube, de forma opcional.</strong> Com sua autorização, consultamos inscrições e vídeos marcados com gostei para personalizar sugestões. O acesso é somente de leitura: não publicamos vídeos nem alteramos seu canal.</p>
            <p>Você pode desconectar o YouTube na plataforma ou revogar a autorização nas <a href="https://myaccount.google.com/permissions" className="text-emerald-300 underline">permissões da sua Conta Google</a>. Consulte nossa <Link href="/privacidade" className="text-emerald-300 underline">Política de Privacidade</Link> para conhecer o tratamento, armazenamento e exclusão de dados.</p>
          </div>
        </section>
      </main>
      <footer className="border-t border-zinc-800 px-6 py-8">
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-x-8 gap-y-4 text-sm" aria-label="Informações do site">
          <span className="font-semibold">nexo.social</span>
          <Link href="/privacidade" className="underline">Política de Privacidade</Link>
          <Link href="/termos" className="underline">Termos de Serviço</Link>
          <Link href="/login" className="underline">Entrar</Link>
        </nav>
      </footer>
    </div>
  );
}
