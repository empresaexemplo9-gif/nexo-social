'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import Avatar from '../Avatar';
import MuralSocial from './MuralSocial';

interface Pessoa {
  id: string;
  nome: string;
  avatarPath: string | null;
  bio: string | null;
  visibilidadePerfil: 'todos' | 'contatos';
  contato: 'eu' | 'aceito' | 'enviado' | 'recebido' | 'nenhum';
  conexaoId: string | null;
  podeVer: boolean;
  banida: boolean;
}

/**
 * A página de uma pessoa: quem é, o vínculo com você e o que ela publicou —
 * aberta a todos ou só aos contatos, como ela escolheu.
 */
export default function PerfilView({ id }: { id: string }) {
  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/pessoa/${id}`, { cache: 'no-store' });
    if (!res.ok) return setEstado('erro');
    setPessoa((await res.json()).pessoa);
    setEstado('ok');
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const contato = async (acao: 'pedir' | 'aceitar') => {
    setOcupado(true);
    setAviso('');
    try {
      const res =
        acao === 'pedir'
          ? await fetch('/api/comunidade/contatos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id }) })
          : await fetch('/api/comunidade/contatos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pessoa?.conexaoId, action: 'accept' }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Não deu certo.');
      setAviso(acao === 'pedir' ? 'Pedido de contato enviado.' : 'Agora vocês são contatos.');
      await carregar();
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  if (estado === 'carregando') return <div className="h-48 animate-pulse rounded-3xl bg-zinc-800/50" aria-busy="true" />;
  if (estado === 'erro' || !pessoa) {
    return <p className="card-soft p-8 text-center text-sm text-zinc-400">Esta pessoa não foi encontrada.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="card-soft flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar nome={pessoa.nome} path={pessoa.avatarPath} tamanho={88} className="ring-4 ring-emerald-400/20" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold text-zinc-50">{pessoa.nome}</h1>
          {pessoa.bio && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{pessoa.bio}</p>}
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Icon name={pessoa.visibilidadePerfil === 'todos' ? 'globe' : 'users'} size={12} />
            {pessoa.visibilidadePerfil === 'todos' ? 'Página aberta a todos' : 'Página aberta só aos contatos'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {pessoa.contato === 'eu' && (
            <Link href="/conta#minha-pagina" className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-zinc-500">
              <Icon name="user" size={14} /> Editar minha página
            </Link>
          )}
          {pessoa.contato === 'aceito' && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300">
              <Icon name="check" size={14} /> Contato
            </span>
          )}
          {pessoa.contato === 'enviado' && <span className="text-xs text-zinc-400">Pedido de contato enviado</span>}
          {pessoa.contato === 'recebido' && pessoa.conexaoId && (
            <button type="button" disabled={ocupado} onClick={() => void contato('aceitar')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50">
              <Icon name="check" size={14} /> Aceitar pedido de contato
            </button>
          )}
          {pessoa.contato === 'nenhum' && !pessoa.banida && (
            <button type="button" disabled={ocupado} onClick={() => void contato('pedir')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50">
              <Icon name="plus" size={14} /> Adicionar aos contatos
            </button>
          )}
          {aviso && <p role="status" className="text-xs text-zinc-400">{aviso}</p>}
        </div>
      </header>

      {pessoa.banida ? (
        <p className="card-soft p-6 text-center text-sm text-zinc-400">Esta conta foi banida por violar as regras da comunidade.</p>
      ) : pessoa.podeVer ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-bold text-zinc-50">{pessoa.contato === 'eu' ? 'O que você publicou' : `O que ${pessoa.nome.split(' ')[0]} publicou`}</h2>
          <MuralSocial autor={pessoa.id} comFormulario={false} />
        </section>
      ) : (
        <p className="card-soft p-6 text-center text-sm text-zinc-400">
          {pessoa.nome.split(' ')[0]} deixou a página aberta só para os contatos. Adicione aos contatos para ver o que publica.
        </p>
      )}
    </div>
  );
}
