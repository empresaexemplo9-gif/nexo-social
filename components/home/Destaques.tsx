'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '../icons';
import Avatar from '../Avatar';
import Conversa from '../comunidade/chat/Conversa';
import Comentarios from '../comunidade/Comentarios';
import { TIPOS_POST, type TipoPost } from '@/lib/comunidade-tipos';
import { inviteEdition, inviteImage, STICKERS } from '@/lib/invite-art';

// O que fica sempre em evidência na home, antes dos widgets escolhidos:
// a Comunidade e os convites que ainda não foram usados.

type PostResumo = {
  id: string;
  groupId: string;
  groupName: string;
  kind: TipoPost;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  comentarios: number;
  ultimoComentario: { autor: string; texto: string } | null;
};

type Resumo = {
  grupos: { id: string; name: string; imagePath: string | null; memberCount: number; playingTitle: string | null; ultima: { autor: string; texto: string; em: string } | null }[];
  totalDeGrupos: number;
  conversas: { userId: string; name: string; avatar: string | null; texto: string; em: string; naoLidas: number }[];
  posts?: PostResumo[];
  pedidosDeContato: number;
  convites: { id: string; name: string; invitedByName: string | null }[];
};

/** O que o card mostra: a lista (com abas) ou uma conversa/publicação aberta nele. */
type Vista =
  | { tipo: 'lista' }
  | { tipo: 'grupo'; id: string; nome: string; imagePath: string | null; membros: number }
  | { tipo: 'contato'; userId: string; nome: string; avatar: string | null }
  | { tipo: 'post'; post: PostResumo };

type Aba = 'grupos' | 'conversas' | 'mural';

/** "agora", "5 min", "3 h", "ontem", "12/09". */
function quando(iso: string): string {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ontem';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Chamada iniciada na home: continua na tela do grupo ou do chat, que já sabem ligar. */
function ligarParaContato(userId: string, video: boolean, ir: (url: string) => void) {
  void fetch(`/api/comunidade/chat/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chamada: true, video }),
  }).catch(() => undefined);
  ir(`/comunidade/chat?com=${userId}&chamada=1${video ? '' : '&voz=1'}`);
}

/**
 * A aba Comunidade em versão de bolso — e de verdade: os chats dos grupos e
 * dos contatos abrem aqui mesmo (com mídia, figurinhas, áudio e respostas),
 * e as publicações dos murais podem ser comentadas sem sair da home.
 */
export function ComunidadeDestaque() {
  const router = useRouter();
  const [r, setR] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });
  const [aba, setAba] = useState<Aba>('grupos');
  const [abaEscolhida, setAbaEscolhida] = useState(false);

  const carregar = useCallback(
    () =>
      fetch('/api/comunidade/resumo', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((j: Resumo) => {
          setR(j);
          setErro(false);
        })
        .catch(() => setErro(true)),
    [],
  );

  useEffect(() => {
    void carregar();
    // Conversas mudam o tempo todo: atualiza enquanto a home está aberta.
    const t = window.setInterval(() => document.visibilityState === 'visible' && void carregar(), 30000);
    return () => window.clearInterval(t);
  }, [carregar]);

  const naoLidas = r?.conversas.reduce((n, c) => n + c.naoLidas, 0) ?? 0;

  // Com mensagem nova de contato, a aba Conversas vem na frente (até a pessoa escolher outra).
  useEffect(() => {
    if (!abaEscolhida && naoLidas > 0) setAba('conversas');
  }, [naoLidas, abaEscolhida]);

  const voltar = () => {
    setVista({ tipo: 'lista' });
    void carregar();
  };
  const escolherAba = (a: Aba) => {
    setAba(a);
    setAbaEscolhida(true);
  };

  const tocando = r?.grupos.find((g) => g.playingTitle);
  const posts = r?.posts ?? [];
  // A conversa ocupa o resto do card. No computador, fica por cima de uma
  // caixa que só estica (absoluta), para não empurrar a altura da linha.
  const caixaDaConversa = 'relative h-[30rem] xl:h-auto xl:min-h-[30rem] xl:flex-1';
  const alturaDaConversa = 'h-full xl:absolute xl:inset-0';

  if (vista.tipo !== 'lista') {
    const titulo = vista.tipo === 'grupo' ? vista.nome : vista.tipo === 'contato' ? vista.nome : vista.post.groupName;
    const abrir =
      vista.tipo === 'grupo' ? `/comunidade/${vista.id}` : vista.tipo === 'contato' ? `/comunidade/chat?com=${vista.userId}` : `/comunidade/${vista.post.groupId}`;
    return (
      <section className="card-soft flex h-full flex-col gap-4 p-5" aria-labelledby="destaque-comunidade">
        <header className="flex items-center gap-3">
          <button type="button" onClick={voltar} aria-label="Voltar para a Comunidade"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 transition hover:border-emerald-400/50 hover:text-emerald-400">
            <Icon name="chevronRight" size={18} className="rotate-180" />
          </button>
          {vista.tipo === 'grupo' && <Avatar nome={vista.nome} path={vista.imagePath} tamanho={40} quadrado />}
          {vista.tipo === 'contato' && <Avatar nome={vista.nome} path={vista.avatar} tamanho={40} />}
          <div className="min-w-0 flex-1">
            <p className="rotulo-hud">{vista.tipo === 'post' ? 'Comentários' : vista.tipo === 'grupo' ? 'Chat do grupo' : 'Conversa'}</p>
            <h2 id="destaque-comunidade" className="truncate font-display text-xl font-bold text-zinc-50">{titulo}</h2>
          </div>
          <Link href={abrir} className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-clay-400">Abrir ↗</Link>
        </header>

        {vista.tipo === 'grupo' && (
          <div className={caixaDaConversa}>
            <Conversa
              key={`g:${vista.id}`}
              endpoint={`/api/comunidade/grupos/${vista.id}/chat`}
              emGrupo
              altura={alturaDaConversa}
              placeholder="Mensagem…"
              vazio="Nenhuma mensagem ainda. Mande um oi, uma foto ou uma figurinha."
              onLigar={(video) => router.push(`/comunidade/${vista.id}?chamada=grupo&ligar=1${video ? '' : '&voz=1'}`)}
              aoEnviar={() => void carregar()}
              cabecalho={<p className="truncate text-xs text-zinc-500">{vista.membros} {vista.membros === 1 ? 'membro' : 'membros'}<span className="[@media(hover:hover)]:hidden"> · arraste uma mensagem para responder</span></p>}
            />
          </div>
        )}
        {vista.tipo === 'contato' && (
          <div className={caixaDaConversa}>
            <Conversa
              key={`c:${vista.userId}`}
              endpoint={`/api/comunidade/chat/${vista.userId}`}
              altura={alturaDaConversa}
              placeholder="Mensagem…"
              vazio="Nenhuma mensagem ainda. Comece a conversa — com texto, foto, áudio ou figurinha."
              onLigar={(video) => ligarParaContato(vista.userId, video, (u) => router.push(u))}
              aoEnviar={() => void carregar()}
              cabecalho={<p className="truncate text-xs text-zinc-500">Contato da sua conta</p>}
            />
          </div>
        )}
        {vista.tipo === 'post' && <PublicacaoComComentarios post={vista.post} />}
      </section>
    );
  }

  const abas: { id: Aba; rotulo: string; extra?: number }[] = [
    { id: 'grupos', rotulo: 'Grupos' },
    { id: 'conversas', rotulo: 'Conversas', extra: naoLidas },
    { id: 'mural', rotulo: 'Mural' },
  ];

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

          {/* Abas: grupos, conversas e mural */}
          <div className="flex flex-col gap-3">
            <div role="tablist" aria-label="Comunidade" className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-950/50 p-1">
              {abas.map((a) => (
                <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => escolherAba(a.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${aba === a.id ? 'bg-emerald-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}>
                  {a.rotulo}
                  {a.extra ? <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${aba === a.id ? 'bg-zinc-950 text-emerald-400' : 'bg-emerald-400 text-zinc-950'}`}>{a.extra}</span> : null}
                </button>
              ))}
            </div>

            {aba === 'grupos' && (
              r.grupos.length === 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-700 p-4">
                  <p className="text-sm text-zinc-300">Você ainda não está em nenhum grupo.</p>
                  <Link href="/comunidade" className="shrink-0 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">Criar ou encontrar</Link>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {r.grupos.map((g) => (
                    <li key={g.id} className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 transition hover:border-emerald-400/50">
                      <button type="button" onClick={() => setVista({ tipo: 'grupo', id: g.id, nome: g.name, imagePath: g.imagePath, membros: g.memberCount })}
                        className="flex min-w-0 flex-1 items-center gap-3 p-2.5 text-left" aria-label={`Conversar no grupo ${g.name}`}>
                        <Avatar nome={g.name} path={g.imagePath} tamanho={40} quadrado />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-zinc-100">{g.name}</span>
                            {g.ultima && <span className="shrink-0 text-[10px] text-zinc-500">{quando(g.ultima.em)}</span>}
                          </span>
                          <span className="block truncate text-xs text-zinc-400">
                            {g.ultima ? <><b className="font-semibold text-zinc-300">{g.ultima.autor}:</b> {g.ultima.texto}</> : `${g.memberCount} ${g.memberCount === 1 ? 'membro' : 'membros'} · puxe o primeiro assunto`}
                          </span>
                        </span>
                        <Icon name="chat" size={15} className="shrink-0 text-emerald-400" />
                      </button>
                      <Link href={`/comunidade/${g.id}`} className="mr-1.5 rounded-lg p-2 text-zinc-500 transition hover:text-emerald-400" aria-label={`Abrir o grupo ${g.name}`} title="Abrir o grupo">
                        <Icon name="external" size={14} />
                      </Link>
                    </li>
                  ))}
                  {r.totalDeGrupos > r.grupos.length && (
                    <li className="pt-1 text-right"><Link href="/comunidade" className="text-xs font-semibold text-emerald-400">ver os {r.totalDeGrupos} grupos</Link></li>
                  )}
                </ul>
              )
            )}

            {aba === 'conversas' && (
              r.conversas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                  Adicione contatos e converse com foto, áudio, figurinhas e chamadas de vídeo.
                </p>
              ) : (
                <ul className="space-y-1">
                  {r.conversas.map((c) => (
                    <li key={c.userId}>
                      <button type="button" onClick={() => setVista({ tipo: 'contato', userId: c.userId, nome: c.name, avatar: c.avatar })}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-zinc-900/70">
                        <Avatar nome={c.name} path={c.avatar} tamanho={36} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={`truncate text-sm ${c.naoLidas ? 'font-bold text-zinc-50' : 'font-medium text-zinc-100'}`}>{c.name}</span>
                            <span className="shrink-0 text-[10px] text-zinc-500">{quando(c.em)}</span>
                          </span>
                          <span className={`block truncate text-xs ${c.naoLidas ? 'text-zinc-200' : 'text-zinc-500'}`}>{c.texto}</span>
                        </span>
                        {c.naoLidas > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-bold text-zinc-950">{c.naoLidas}</span>}
                      </button>
                    </li>
                  ))}
                  <li className="pt-1 text-right"><Link href="/comunidade/chat" className="text-xs font-semibold text-emerald-400">todos os contatos</Link></li>
                </ul>
              )
            )}

            {aba === 'mural' && (
              posts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                  Nada novo nos murais. Compartilhe um livro, uma música ou fotos no seu grupo.
                </p>
              ) : (
                <ul className="space-y-2">
                  {posts.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setVista({ tipo: 'post', post: p })}
                        className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-left transition hover:border-emerald-400/50">
                        <span className="flex items-center gap-2">
                          <Avatar nome={p.authorName} path={p.authorAvatar} tamanho={24} />
                          <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-500">
                            <b className="font-semibold text-zinc-300">{p.authorName}</b> em {p.groupName}
                          </span>
                          <span className="shrink-0 text-[10px] text-zinc-500">{quando(p.createdAt)}</span>
                        </span>
                        <span className="mt-1.5 line-clamp-2 block text-sm text-zinc-100">
                          <Icon name={(TIPOS_POST.find((t) => t.id === p.kind) ?? TIPOS_POST[0]).icone} size={13} className="mr-1 inline text-emerald-400" />
                          {p.title ? <b className="font-semibold">{p.title}</b> : null}
                          {p.title && p.subtitle ? <span className="text-zinc-400"> · {p.subtitle}</span> : null}
                          {!p.title && (p.body || (p.kind === 'foto' ? 'Fotos novas' : ''))}
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                          <span className="min-w-0 flex-1 truncate">{p.ultimoComentario ? <><b className="text-zinc-300">{p.ultimoComentario.autor}:</b> {p.ultimoComentario.texto}</> : 'Ninguém comentou ainda'}</span>
                          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-emerald-400">
                            <Icon name="chat" size={12} /> {p.comentarios ? p.comentarios : 'Comentar'}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
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

/** Uma publicação do mural aberta no card, com os comentários embaixo. */
function PublicacaoComComentarios({ post }: { post: PostResumo }) {
  const tipo = TIPOS_POST.find((t) => t.id === post.kind) ?? TIPOS_POST[0];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Avatar nome={post.authorName} path={post.authorAvatar} tamanho={28} />
          <span className="min-w-0 flex-1 truncate"><b className="font-semibold text-zinc-300">{post.authorName}</b> · {tipo.rotulo.toLowerCase()} · {quando(post.createdAt)}</span>
        </p>
        {post.title && <h3 className="mt-2 text-base font-semibold text-zinc-50">{post.title}</h3>}
        {post.subtitle && <p className="text-xs text-zinc-400">{post.subtitle}</p>}
        {post.body && <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-sm text-zinc-200">{post.body}</p>}
        {post.kind === 'foto' && <p className="mt-1.5 text-xs text-zinc-400">📷 Fotos novas no mural.</p>}
        <Link href={`/comunidade/${post.groupId}`} className="mt-2 inline-block text-xs font-semibold text-emerald-400">Ver no mural ↗</Link>
      </article>
      <Comentarios groupId={post.groupId} postId={post.id} compacto />
    </div>
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
