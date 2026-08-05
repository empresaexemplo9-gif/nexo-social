'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isPlatformAdmin } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import { topicLabel } from '@/lib/data';

interface Account {
  email: string | null;
  fullName: string | null;
  tenantName: string | null;
  accountType: string | null;
}

export default function ContaPage() {
  const { prefs, ready, hasCompleted, reset } = usePreferences();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setAccount({
          email: u.email ?? null,
          fullName: (u.user_metadata?.full_name as string) ?? null,
          tenantName: (u.user_metadata?.tenant_name as string) ?? null,
          accountType: (u.user_metadata?.account_type as string) ?? null,
        });
      }
      setLoading(false);
    });
  }, []);

  const admin = isPlatformAdmin(account?.email);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Minha Conta</h1>
          <p className="mt-1 text-sm text-zinc-400">Gerencie sua identidade e suas preferências de curadoria.</p>
        </div>

        {/* Identidade */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white">Identidade &amp; Tenant</h2>
          {loading ? (
            <p className="mt-3 text-sm text-zinc-400">Carregando…</p>
          ) : !isSupabaseConfigured ? (
            <p className="mt-3 text-sm text-amber-300/80">
              Modo demonstração: sem Supabase configurado, não há sessão. Suas preferências ficam salvas apenas neste dispositivo.
            </p>
          ) : !account ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-zinc-400">Você não está autenticado.</p>
              <Link href="/login" className="inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950">Entrar</Link>
            </div>
          ) : (
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Nome" value={account.fullName ?? '—'} />
              <Row label="E-mail" value={account.email ?? '—'} />
              <Row label="Tipo de conta" value={account.accountType === 'organizacao' ? 'Organização' : 'Pessoal'} />
              <Row label="Tenant" value={account.tenantName ?? '—'} />
              <Row label="Perfil" value={admin ? 'Administrador da plataforma' : 'Membro'} />
            </dl>
          )}
          {admin && (
            <Link href="/admin" className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950">
              Abrir Painel Admin →
            </Link>
          )}
        </section>

        {/* Preferências */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Preferências de curadoria</h2>
            <Link href="/questionario" className="text-xs text-emerald-400 hover:underline">
              {hasCompleted ? 'Refazer questionário' : 'Responder questionário'}
            </Link>
          </div>
          {ready && (
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Interesses" value={prefs.interests.length ? prefs.interests.map(topicLabel).join(', ') : 'Nenhum definido'} />
              <Row label="Cidade" value={prefs.city ?? 'Não definida'} />
              <Row label="Raio de eventos" value={`${prefs.radiusKm} km`} />
              <Row label="Frequência" value={prefs.frequency} />
            </dl>
          )}
          <button onClick={reset} className="mt-4 text-xs text-zinc-500 underline hover:text-white">
            Limpar preferências deste dispositivo
          </button>
        </section>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-800/60 pb-2">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-right font-medium text-white">{value}</dd>
    </div>
  );
}
