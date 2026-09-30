'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import Avatar from '../Avatar';
import type { GrupoResumo } from '@/lib/comunidade-tipos';
import { inviteEdition, inviteImage, STICKERS } from '@/lib/invite-art';

// O que fica sempre em evidência na home, antes dos widgets escolhidos:
// a Comunidade e os convites que ainda não foram usados.

/** Seus grupos da Comunidade (e os convites para grupos esperando resposta). */
export function ComunidadeDestaque() {
  const [dados, setDados] = useState<{ grupos: GrupoResumo[]; convites: GrupoResumo[] } | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch('/api/comunidade/grupos', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => vivo && setDados({ grupos: j.grupos ?? [], convites: j.convites ?? [] }))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, []);

  const grupos = [...(dados?.grupos ?? [])].sort((a, b) => Date.parse(b.lastActivity ?? '0') - Date.parse(a.lastActivity ?? '0'));

  return (
    <section className="card-soft flex h-full flex-col gap-4 p-5" aria-labelledby="destaque-comunidade">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400"><Icon name="users" size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="rotulo-hud">Sempre à mão</p>
          <h2 id="destaque-comunidade" className="font-display text-xl font-bold text-zinc-50">Comunidade</h2>
        </div>
        <Link href="/comunidade" className="text-xs font-semibold text-emerald-400 hover:text-clay-400">Abrir ↗</Link>
      </header>

      {!dados && !erro && <div className="h-24 animate-pulse rounded-xl bg-zinc-900/70" aria-busy="true" />}
      {erro && <p className="text-sm text-zinc-500">Não deu para carregar seus grupos agora.</p>}

      {dados && dados.convites.length > 0 && (
        <Link href="/comunidade" className="flex items-center gap-2 rounded-xl border border-clay-500/40 bg-clay-950 px-3 py-2 text-sm text-clay-300">
          <Icon name="mail" size={15} /> {dados.convites.length === 1 ? `Convite para o grupo ${dados.convites[0].name}` : `${dados.convites.length} convites para grupos esperando você`}
        </Link>
      )}

      {dados && grupos.length === 0 && (
        <div className="flex flex-1 flex-col items-start justify-center gap-2 rounded-xl border border-dashed border-zinc-700 p-4">
          <p className="text-sm text-zinc-300">Você ainda não está em nenhum grupo.</p>
          <Link href="/comunidade" className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">Criar ou encontrar um grupo</Link>
        </div>
      )}

      {grupos.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {grupos.slice(0, 4).map((g) => (
            <li key={g.id}>
              <Link href={`/comunidade/${g.id}`} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 transition hover:border-emerald-400/50">
                <Avatar nome={g.name} path={g.imagePath} tamanho={38} quadrado />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-100">{g.name}</span>
                  <span className="block truncate text-[11px] text-zinc-500">
                    {g.playingTitle ? `▶ ${g.playingTitle}` : `${g.memberCount} ${g.memberCount === 1 ? 'membro' : 'membros'} · ${g.postCount} posts`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Convite = { id: string; link: string; status: 'pending' | 'used' | 'revoked' };
const tokenOf = (link: string) => { try { return new URL(link).pathname.split('/').pop() || ''; } catch { return ''; } };

/**
 * Convites da plataforma: fica na home enquanto houver convite para gerar ou
 * link gerado e ainda não usado. Quando tudo foi usado, some.
 */
export function ConvitesDestaque() {
  const [dados, setDados] = useState<{ credits: number; pendentes: Convite[] } | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/invites', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => vivo && setDados({ credits: j.credits ?? 0, pendentes: (j.invites ?? []).filter((i: Convite) => i.status === 'pending') }))
      .catch(() => vivo && setDados(null));
    return () => {
      vivo = false;
    };
  }, []);

  if (!dados || (dados.credits <= 0 && dados.pendentes.length === 0)) return null;
  const primeiro = dados.pendentes[0];
  const e = primeiro ? inviteEdition(tokenOf(primeiro.link)) : null;

  return (
    <section className="card-soft relative flex h-full flex-col gap-4 overflow-hidden p-5" aria-labelledby="destaque-convites">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-500 text-zinc-900"><Icon name="mail" size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="rotulo-hud">Até serem usados</p>
          <h2 id="destaque-convites" className="font-display text-xl font-bold text-zinc-50">Seus convites</h2>
        </div>
        <Link href="/convites" className="text-xs font-semibold text-emerald-400 hover:text-clay-400">Gerenciar ↗</Link>
      </header>

      <p className="text-sm text-zinc-300">
        {dados.credits > 0 && <><span className="font-bold text-zinc-50">{dados.credits}</span> {dados.credits === 1 ? 'convite disponível' : 'convites disponíveis'} para gerar. </>}
        {dados.pendentes.length > 0 && <><span className="font-bold text-zinc-50">{dados.pendentes.length}</span> {dados.pendentes.length === 1 ? 'link gerado esperando alguém especial.' : 'links gerados esperando alguém especial.'}</>}
      </p>

      {e && primeiro && (
        <Link href="/convites" className="group block overflow-hidden rounded-xl border border-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={inviteImage(tokenOf(primeiro.link))} width={1200} height={630} alt={`Convite ${e.serialLabel}, ${e.theme.nome}`} loading="lazy" className="w-full transition duration-500 group-hover:scale-[1.02]" />
          <span className="block px-3 py-2 text-[11px] uppercase tracking-[.18em] text-zinc-400">{e.theme.nome} · {e.serialLabel} · adesivo {String(e.variant + 1).padStart(3, '0')}/{STICKERS.length}</span>
        </Link>
      )}

      <Link href="/convites" className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300">
        <Icon name="plus" size={15} /> {dados.credits > 0 ? 'Gerar e enviar um convite' : 'Enviar os links gerados'}
      </Link>
    </section>
  );
}
