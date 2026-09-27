'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '../icons';

/** Botão da página do link de convite, para quem já está logado. */
export default function EntrarNoGrupo({ token }: { token: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const entrar = async () => {
    setOcupado(true);
    setErro('');
    try {
      const res = await fetch('/api/comunidade/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      router.push(`/comunidade/${json.id}`);
    } catch (e: any) {
      setErro(e?.message || 'Falha ao entrar no grupo.');
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={entrar}
        disabled={ocupado}
        className="flex w-full items-center justify-center gap-2 rounded-xl action-patch action-patch--cobalt bg-emerald-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
      >
        <Icon name="thumbUp" size={16} /> {ocupado ? 'Entrando…' : 'Participar do grupo'}
      </button>
      {erro && <p className="text-xs text-clay-300">{erro}</p>}
    </div>
  );
}
