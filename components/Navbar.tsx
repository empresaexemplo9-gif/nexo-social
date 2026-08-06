'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './icons';
import LogoMark from './Logo';
import NotificationsBell from './NotificationsBell';
import { supabase } from '@/lib/supabase';
import { isPlatformAdmin } from '@/lib/auth';
import { TOPICS } from '@/lib/data';

const links = [
  { href: '/', label: 'Início', icon: 'calendar' as const },
  { href: '/agenda', label: 'Compromissos', icon: 'calendarCheck' as const },
  { href: '/#temas', label: 'Nichos', icon: 'compass' as const },
  { href: '/bom-dia', label: 'Bom Dia', icon: 'sunrise' as const },
  { href: '/questionario', label: 'Meus temas', icon: 'sparkles' as const },
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
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null));
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
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <span className="text-lg font-semibold tracking-tight text-zinc-50">
            nexo<span className="text-emerald-400">.social</span>
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          <div className="relative" onMouseLeave={() => setTopicsOpen(false)}>
            <button
              onClick={() => setTopicsOpen((v) => !v)}
              onMouseEnter={() => setTopicsOpen(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-emerald-300"
            >
              <Icon name="compass" size={16} /> Nichos
            </button>
            {topicsOpen && (
              <div className="absolute left-0 top-full w-56 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 shadow-soft">
                {TOPICS.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tema/${t.slug}`}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-50"
                  >
                    <span className={t.accent.text}>
                      <Icon name={t.icon} size={17} />
                    </span>
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {links
            .filter((l) => l.href !== '/#temas')
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition hover:bg-zinc-900 hover:text-emerald-300 ${
                  pathname === l.href ? 'text-emerald-400' : 'text-zinc-300'
                }`}
              >
                <Icon name={l.icon} size={16} /> {l.label}
              </Link>
            ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {email ? (
            <>
              <NotificationsBell />
              {admin && (
                <Link
                  href="/admin"
                  className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400"
                >
                  Painel
                </Link>
              )}
              <Link href="/conta" className="rounded-xl p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50" title="Minha conta">
                <Icon name="user" size={18} />
              </Link>
              <button onClick={handleSignOut} className="text-xs text-zinc-500 transition hover:text-zinc-200">
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-zinc-700 px-4 py-1.5 text-xs font-semibold text-zinc-100 transition hover:border-emerald-600 hover:text-emerald-300"
            >
              Entrar
            </Link>
          )}
        </div>

        <button onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-zinc-300 md:hidden" aria-label="Menu">
          <Icon name={open ? 'close' : 'menu'} size={20} />
        </button>
      </div>

      {/* Mobile */}
      {open && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-0.5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-200 transition hover:bg-zinc-900"
              >
                <Icon name={l.icon} size={17} className="text-zinc-500" /> {l.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-zinc-800" />
            {email ? (
              <>
                {admin && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-emerald-400">
                    <Icon name="plug" size={17} /> Painel
                  </Link>
                )}
                <Link href="/conta" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-200">
                  <Icon name="user" size={17} className="text-zinc-500" /> Minha conta
                </Link>
                <button onClick={handleSignOut} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-500">
                  Sair
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-emerald-400">
                <Icon name="user" size={17} /> Entrar
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
