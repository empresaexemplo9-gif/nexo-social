'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type User = { id: string; full_name: string | null; email: string | null; credits: number };

export default function AdminConvitesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState('');
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const load = async () => {
    const res = await fetch('/api/admin/invites', { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(j.error || 'Falha ao carregar usuários.'); return; }
    setUsers(j.users ?? []);
  };
  useEffect(() => { void load(); }, []);

  const add = async (userId: string) => {
    const amount = Math.max(1, Math.floor(amounts[userId] || 1));
    const res = await fetch('/api/admin/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, amount }) });
    const j = await res.json().catch(() => ({}));
    setMessage(res.ok ? `+${amount} convite(s) liberado(s).` : (j.error || 'Falha ao liberar convites.'));
    if (res.ok) await load();
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100 sm:p-8">
      <main className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold">Convites da plataforma</h1><p className="mt-1 text-sm text-zinc-400">Adicione novos convites a qualquer usuário quando quiser.</p></div>
          <Link href="/admin" className="text-sm text-emerald-400">← Painel admin</Link>
        </div>
        {message && <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm">{message}</p>}
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div><p className="font-semibold">{u.full_name || 'Sem nome'}</p><p className="text-xs text-zinc-500">{u.email}</p></div>
              <div className="text-sm"><span className="text-zinc-500">Saldo: </span><strong>{u.credits}</strong></div>
              <div className="flex gap-2">
                <input type="number" min={1} max={1000} value={amounts[u.id] ?? 1} onChange={(e) => setAmounts((a) => ({ ...a, [u.id]: Number(e.target.value) }))}
                  className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" />
                <button onClick={() => add(u.id)} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950">Adicionar</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
