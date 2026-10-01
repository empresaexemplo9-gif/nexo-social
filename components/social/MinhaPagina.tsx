'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import { CAMPO } from './util';
import { LEMBRETE_DAS_REGRAS } from '@/lib/regras';

type Vis = 'todos' | 'contatos';

const OPCOES: { id: Vis; rotulo: string; icone: 'globe' | 'users' }[] = [
  { id: 'todos', rotulo: 'Todos da plataforma', icone: 'globe' },
  { id: 'contatos', rotulo: 'Só meus contatos', icone: 'users' },
];

function Escolha({ valor, aoMudar, rotulo }: { valor: Vis; aoMudar: (v: Vis) => void; rotulo: string }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-semibold text-zinc-300">{rotulo}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {OPCOES.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={valor === o.id}
            onClick={() => aoMudar(o.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              valor === o.id ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-800 text-zinc-300 hover:text-zinc-50'
            }`}
          >
            <Icon name={o.icone} size={12} /> {o.rotulo}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** "Minha página" em Minha conta: a bio e quem vê a página e as publicações (por padrão). */
export default function MinhaPagina() {
  const [bio, setBio] = useState('');
  const [perfil, setPerfil] = useState<Vis>('contatos');
  const [padrao, setPadrao] = useState<Vis>('todos');
  const [userId, setUserId] = useState<string | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'off'>('carregando');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch('/api/perfil', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (j.indisponivel) return setEstado('off');
        setBio(j.bio ?? '');
        setPerfil(j.visibilidadePerfil);
        setPadrao(j.visibilidadePadrao);
        setUserId(j.userId ?? null);
        setEstado('ok');
      })
      .catch(() => setEstado('off'));
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setAviso('');
    try {
      const res = await fetch('/api/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, visibilidadePerfil: perfil, visibilidadePadrao: padrao }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 403 && j.banido) {
        window.location.href = '/banido';
        return;
      }
      if (!res.ok) throw new Error(j.error || 'Não foi possível salvar.');
      setAviso('Salvo.');
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  if (estado === 'off') return null;

  return (
    <section id="minha-pagina" className="card-soft scroll-mt-24 space-y-4 p-5" aria-labelledby="minha-pagina-titulo">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="minha-pagina-titulo" className="text-lg font-semibold text-zinc-50">Minha página</h2>
        {userId && <Link href={`/pessoa/${userId}`} className="text-xs font-semibold text-emerald-400 hover:text-clay-400">Ver como os outros veem →</Link>}
      </div>
      <p className="text-xs text-zinc-400">Você decide quem vê a sua página e o que você publica. Em cada publicação, dá para trocar na hora.</p>
      {estado === 'carregando' ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : (
        <form onSubmit={salvar} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-300">Sobre você</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={280} placeholder="O que você gosta de ler, ouvir, assistir…" className={CAMPO} />
            <span className="block text-right text-[10px] text-zinc-500">{bio.length}/280 · {LEMBRETE_DAS_REGRAS}</span>
          </label>
          <Escolha rotulo="Quem abre a minha página" valor={perfil} aoMudar={setPerfil} />
          <Escolha rotulo="Quem vê o que eu publico (padrão)" valor={padrao} aoMudar={setPadrao} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={salvando} className="rounded-2xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            {aviso && <span role="status" className="text-xs text-zinc-400">{aviso}</span>}
          </div>
        </form>
      )}
    </section>
  );
}
