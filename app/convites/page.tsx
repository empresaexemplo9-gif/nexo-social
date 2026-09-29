'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

type Invite = { id: string; link: string; status: 'pending' | 'used' | 'revoked'; created_at: string; used_at: string | null };

export default function ConvitesPage() {
  const [credits, setCredits] = useState(0);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch('/api/invites', { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(j.error || 'Não foi possível carregar seus convites.'); return; }
    setCredits(j.credits ?? 0);
    setInvites(j.invites ?? []);
  };
  useEffect(() => { void load(); }, []);

  const criar = async () => {
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/invites', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Não foi possível gerar o convite.');
      setCredits(j.credits);
      await navigator.clipboard?.writeText(j.link);
      setMessage('Convite criado. O link foi copiado para você enviar.');
      await load();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const copiar = async (link: string) => {
    await navigator.clipboard?.writeText(link);
    setMessage('Link copiado.');
  };

  return (
    <div className="min-h-screen text-zinc-100">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50">Meus convites</h1>
          <p className="mt-1 text-sm text-zinc-400">Cada link é individual e só cria uma conta. Ao gerar um link, um convite do seu saldo é consumido.</p>
        </div>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs uppercase tracking-wider text-zinc-500">Disponíveis</p><p className="text-4xl font-bold text-zinc-50">{credits}</p></div>
            <button onClick={criar} disabled={busy || credits <= 0}
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? 'Gerando…' : 'Gerar link de convite'}
            </button>
          </div>
          {credits <= 0 && <p className="mt-4 text-sm text-amber-300">Você usou seus convites. Novos convites só podem ser liberados pelo superadministrador.</p>}
          {message && <p className="mt-4 text-sm text-zinc-300">{message}</p>}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Links gerados</h2>
          {!invites.length ? <p className="text-sm text-zinc-500">Você ainda não gerou nenhum convite.</p> : invites.map((i) => (
            <div key={i.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className={i.status === 'pending' ? 'text-emerald-400 text-sm' : 'text-zinc-500 text-sm'}>
                  {i.status === 'pending' ? 'Disponível' : i.status === 'used' ? 'Usado' : 'Revogado'}
                </span>
                {i.status === 'pending' && <button onClick={() => copiar(i.link)} className="text-sm font-semibold text-emerald-400">Copiar link</button>}
              </div>
              <p className="mt-2 break-all text-xs text-zinc-500">{i.link}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
