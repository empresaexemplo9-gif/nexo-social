'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '../icons';
import Avatar from '../Avatar';
import { inviteEdition, inviteImage, STICKERS } from '@/lib/invite-art';

// O que fica sempre em evidência na home, antes dos widgets escolhidos:
// a Comunidade e os convites que ainda não foram usados.

type Resumo = {
  grupos: { id: string; name: string; imagePath: string | null; memberCount: number; playingTitle: string | null; ultima: { autor: string; texto: string; em: string } | null }[];
  totalDeGrupos: number;
  conversas: { userId: string; name: string; avatar: string | null; texto: string; em: string; naoLidas: number }[];
  pedidosDeContato: number;
  convites: { id: string; name: string; invitedByName: string | null }[];
};

/** "agora", "5 min", "3 h", "ontem", "12/09". */
function quando(iso: string): string {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ontem';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * A aba Comunidade em versão de bolso: grupos com a última conversa de cada
 * um, o que está tocando nas salas, conversas com contatos (e não lidas),
 * pedidos e convites pendentes — e os atalhos para criar e conversar.
 */
export function ComunidadeDestaque() {
  const [r, setR] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    const carregar = () =>
      fetch('/api/comunidade/resumo', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((j) => vivo && setR(j))
        .catch(() => vivo && setErro(true));
    void carregar();
    // Conversas mudam o tempo todo: atualiza enquanto a home está aberta.
    const t = window.setInterval(() => document.visibilityState === 'visible' && void carregar(), 30000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, []);

  const tocando = r?.grupos.find((g) => g.playingTitle);
  const naoLidas = r?.conversas.reduce((n, c) => n + c.naoLidas, 0) ?? 0;

  return (
    <section className="card-soft flex h-full flex-col gap-5 p-5" aria-labelledby="destaque-comunidade">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400"><Icon name="users" size={19} /></span>
        <div className="min-w-0 flex-1">
          <p className="rotulo-hud">Sempre à mão</p>
          <h2 id="destaque-comunidade" className="font-display text-xl font-bold text-zinc-50">Comunidade</h2>
        </div>
        <Link href="/comunidade" className="text-xs font-semibold text-emerald-400 hover:text-clay-400">Abrir ↗</Link>
      </header>

      {!r && !erro && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-900/70" />)}
        </div>
      )}
      {erro && !r && <p className="text-sm text-zinc-500">Não deu para carregar a Comunidade agora.</p>}

      {r && (
        <>
          {/* O que pede resposta */}
          {(r.convites.length > 0 || r.pedidosDeContato > 0) && (
            <div className="flex flex-col gap-2">
              {r.convites.map((g) => (
                <Link key={g.id} href="/comunidade" className="flex items-center gap-2 rounded-xl border border-clay-500/40 bg-clay-950 px-3 py-2 text-sm text-clay-300">
                  <Icon name="mail" size={15} /> <span className="min-w-0 flex-1 truncate">{g.invitedByName ? `${g.invitedByName} te convidou para ` : 'Convite para '}<b>{g.name}</b></span> <span className="text-xs font-semibold">Responder</span>
                </Link>
              ))}
              {r.pedidosDeContato > 0 && (
                <Link href="/comunidade/chat" className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950 px-3 py-2 text-sm text-emerald-400">
                  <Icon name="user" size={15} /> <span className="flex-1">{r.pedidosDeContato === 1 ? '1 pedido de contato' : `${r.pedidosDeContato} pedidos de contato`}</span> <span className="text-xs font-semibold">Ver</span>
                </Link>
              )}
            </div>
          )}

          {/* Sala tocando agora */}
          {tocando && (
            <Link href={`/comunidade/${tocando.id}`} className="group flex items-center gap-3 rounded-2xl bg-emerald-400 px-4 py-3 text-zinc-950">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950/15">
                <Icon name="headphones" size={17} />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-[#dc2626]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wider opacity-70">Tocando agora em {tocando.name}</span>
                <span className="block truncate text-sm font-semibold">{tocando.playingTitle}</span>
              </span>
              <span className="text-xs font-bold transition group-hover:translate-x-0.5">Entrar →</span>
            </Link>
          )}

          {/* Grupos e a última conversa de cada um */}
          <div className="space-y-2">
            <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <span>Seus grupos{r.totalDeGrupos > 4 ? ` · ${r.totalDeGrupos}` : ''}</span>
              {r.totalDeGrupos > 4 && <Link href="/comunidade" className="normal-case tracking-normal text-emerald-400">ver todos</Link>}
            </p>
            {r.grupos.length === 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-700 p-4">
                <p className="text-sm text-zinc-300">Você ainda não está em nenhum grupo.</p>
                <Link href="/comunidade" className="shrink-0 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">Criar ou encontrar</Link>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {r.grupos.map((g) => (
                  <li key={g.id}>
                    <Link href={`/comunidade/${g.id}`} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 transition hover:border-emerald-400/50">
                      <Avatar nome={g.name} path={g.imagePath} tamanho={40} quadrado />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-zinc-100">{g.name}</span>
                          {g.ultima && <span className="shrink-0 text-[10px] text-zinc-500">{quando(g.ultima.em)}</span>}
                        </span>
                        <span className="block truncate text-xs text-zinc-400">
                          {g.ultima ? <><b className="font-semibold text-zinc-300">{g.ultima.autor}:</b> {g.ultima.texto}</> : `${g.memberCount} ${g.memberCount === 1 ? 'membro' : 'membros'} · ninguém escreveu ainda`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Conversas com contatos */}
          <div className="space-y-2">
            <p className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <span>Conversas{naoLidas > 0 ? ` · ${naoLidas} não ${naoLidas === 1 ? 'lida' : 'lidas'}` : ''}</span>
              <Link href="/comunidade/chat" className="normal-case tracking-normal text-emerald-400">abrir chat</Link>
            </p>
            {r.conversas.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                Adicione contatos e converse com foto, áudio, figurinhas e chamadas de vídeo.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {r.conversas.map((c) => (
                  <li key={c.userId}>
                    <Link href={`/comunidade/chat?com=${c.userId}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-zinc-900/70">
                      <Avatar nome={c.name} path={c.avatar} tamanho={36} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${c.naoLidas ? 'font-bold text-zinc-50' : 'font-medium text-zinc-100'}`}>{c.name}</span>
                          <span className="shrink-0 text-[10px] text-zinc-500">{quando(c.em)}</span>
                        </span>
                        <span className={`block truncate text-xs ${c.naoLidas ? 'text-zinc-200' : 'text-zinc-500'}`}>{c.texto}</span>
                      </span>
                      {c.naoLidas > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-bold text-zinc-950">{c.naoLidas}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Atalhos */}
          <div className="mt-auto grid grid-cols-3 gap-2 border-t border-zinc-800 pt-4">
            {[
              { href: '/comunidade', icone: 'plus' as const, rotulo: 'Criar grupo' },
              { href: '/comunidade/chat', icone: 'chat' as const, rotulo: 'Chat e contatos' },
              { href: '/comunidade/chat', icone: 'user' as const, rotulo: 'Achar pessoas' },
            ].map((a) => (
              <Link key={a.rotulo} href={a.href} className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-800 px-2 py-3 text-center text-xs font-medium text-zinc-300 transition hover:border-emerald-400/50 hover:text-emerald-400">
                <Icon name={a.icone} size={17} /> {a.rotulo}
              </Link>
            ))}
          </div>
        </>
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
