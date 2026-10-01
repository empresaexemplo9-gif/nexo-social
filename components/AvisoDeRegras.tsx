'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { REGRAS, REGRAS_RESUMO, REGRAS_TITULO } from '@/lib/regras';

/** Páginas públicas ou de passagem: o aviso não aparece nelas. */
const FORA = /^\/(login|sobre|termos|privacidade|banido|offline|convite)(\/|$)/;

/**
 * As regras da comunidade para quem já tinha conta antes delas (quem cria
 * conta agora aceita no cadastro). Aparece uma vez e só fecha com o aceite.
 */
export default function AvisoDeRegras() {
  const pathname = usePathname() || '/';
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!supabase || FORA.test(pathname)) return;
    let vivo = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!vivo || !data.user || data.user.is_anonymous) return;
      const r = await fetch('/api/regras', { cache: 'no-store' }).catch(() => null);
      if (!vivo || !r?.ok) return;
      const j = await r.json().catch(() => ({ aceitas: true }));
      setAberto(j.aceitas === false);
    });
    return () => { vivo = false; };
  }, [pathname]);

  if (!aberto) return null;

  const aceitar = async () => {
    setEnviando(true);
    setErro('');
    try {
      const r = await fetch('/api/regras', { method: 'POST' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Não foi possível registrar agora.');
      setAberto(false);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-zinc-950/75 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="aviso-regras-titulo">
      <div className="card-soft w-full max-w-lg space-y-4 p-6">
        <p className="rotulo-hud">Novidade importante</p>
        <h2 id="aviso-regras-titulo" className="font-display text-2xl font-bold text-zinc-50">{REGRAS_TITULO}</h2>
        <p className="text-sm leading-relaxed text-zinc-300">{REGRAS_RESUMO}</p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-200">
          {REGRAS.map((r) => <li key={r}>{r}</li>)}
        </ul>
        {erro && <p role="alert" className="text-sm text-clay-400">{erro}</p>}
        <button
          type="button"
          onClick={() => void aceitar()}
          disabled={enviando}
          className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
        >
          {enviando ? 'Registrando…' : 'Li e concordo'}
        </button>
      </div>
    </div>
  );
}
