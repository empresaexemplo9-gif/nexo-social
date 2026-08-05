'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isPlatformAdmin } from '@/lib/auth';
import { TOPICS } from '@/lib/data';

const navLinks = [
  { href: '/#temas', label: 'Temas' },
  { href: '/bom-dia', label: 'Bom Dia' },
  { href: '/#agenda', label: 'Agenda' },
  { href: '/questionario', label: 'Questionário' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setEmail(null);
    window.location.href = '/';
  };

  const admin = isPlatformAdmin(email);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            nexo<span className="text-emerald-400">.social</span>
          </Link>
          <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 font-mono text-xs text-zinc-300">
            Agendrap
          </span>
        </div>

        {/* Navegação desktop */}
        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <div className="relative" onMouseLeave={() => setTopicsOpen(false)}>
            <button
              onClick={() => setTopicsOpen((v) => !v)}
              onMouseEnter={() => setTopicsOpen(true)}
              className="transition hover:text-emerald-400"
            >
              Temas ▾
            </button>
            {topicsOpen && (
              <div className="absolute left-0 top-full w-52 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
                {TOPICS.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tema/${t.slug}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  >
                    <span>{t.icon}</span> {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/bom-dia" className="transition hover:text-emerald-400">Bom Dia</Link>
          <Link href="/#agenda" className="transition hover:text-emerald-400">Agenda</Link>
          <Link href="/questionario" className="transition hover:text-emerald-400">Questionário</Link>
        </nav>

        {/* Conta */}
        <div className="hidden items-center gap-3 md:flex">
          {email ? (
            <>
              {admin && (
                <Link
                  href="/admin"
                  className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
                >
                  Painel Admin
                </Link>
              )}
              <Link href="/conta" className="text-xs text-zinc-300 transition hover:text-white">
                {admin ? 'Admin' : 'Minha Conta'}
              </Link>
              <button onClick={handleSignOut} className="text-xs text-zinc-500 transition hover:text-white">
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-zinc-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:border-emerald-500 hover:text-emerald-400"
            >
              Entrar
            </Link>
          )}
        </div>

        {/* Botão mobile */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-zinc-300 md:hidden"
          aria-label="Abrir menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-900 ${
                  pathname === l.href ? 'text-emerald-400' : 'text-zinc-300'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="my-2 border-t border-zinc-800" />
            {email ? (
              <>
                {admin && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-emerald-400">
                    Painel Admin
                  </Link>
                )}
                <Link href="/conta" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-zinc-300">
                  Minha Conta
                </Link>
                <button onClick={handleSignOut} className="rounded-lg px-3 py-2 text-left text-sm text-zinc-500">
                  Sair
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-emerald-400">
                Entrar
              </Link>
            )}
          </div>
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="bg-amber-950/40 px-4 py-1 text-center text-[11px] text-amber-300/80">
          Modo demonstração — configure o Supabase para ativar contas multi-tenant e persistência.
        </div>
      )}
    </header>
  );
}
