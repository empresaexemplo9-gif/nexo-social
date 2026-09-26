'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '../icons';
import Avatar from '../Avatar';
import EscolherTipo, { SeloDoTipo } from './EscolherTipo';
import { formatEventDateLong } from '@/lib/datetime';
import { EVENTO_CONVITES, responderConvite } from '@/lib/convites';
import { trocarImagemDoGrupo } from '@/lib/imagens';
import type { GrupoResumo, Privacidade } from '@/lib/comunidade-tipos';

const campo =
  'w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none';

/** Página da Comunidade: convites de grupo, meus grupos e criar grupo. */
export default function ComunidadeHub() {
  const router = useRouter();
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'anon' | 'off'>('carregando');
  const [grupos, setGrupos] = useState<GrupoResumo[]>([]);
  const [convites, setConvites] = useState<GrupoResumo[]>([]);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState<{ name: string; description: string; privacy: Privacidade }>({
    name: '',
    description: '',
    privacy: 'fechado',
  });
  const [imagem, setImagem] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const seletorDeImagem = useRef<HTMLInputElement>(null);

  // Prévia local da imagem escolhida (o grupo ainda não existe para recebê-la).
  useEffect(() => {
    if (!imagem) return setPrevia(null);
    const u = URL.createObjectURL(imagem);
    setPrevia(u);
    return () => URL.revokeObjectURL(u);
  }, [imagem]);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/comunidade/grupos');
      if (res.status === 401) return setEstado('anon');
      if (res.status === 503) return setEstado('off');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setGrupos(json.grupos || []);
      setConvites(json.convites || []);
      setEstado('ok');
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar a Comunidade.');
      setEstado('ok');
    }
  }, []);

  useEffect(() => {
    carregar();
    window.addEventListener(EVENTO_CONVITES, carregar);
    return () => window.removeEventListener(EVENTO_CONVITES, carregar);
  }, [carregar]);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado('criar');
    setErro('');
    try {
      const res = await fetch('/api/comunidade/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novo),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      // A imagem sobe depois: a pasta dela é a do grupo, que acabou de nascer.
      // Se falhar, o grupo já existe — dá para pôr a imagem lá dentro.
      if (imagem) await trocarImagemDoGrupo(json.id, imagem).catch(() => undefined);
      // Grupo novo abre já com o "Convidar amigos" à mão.
      router.push(`/comunidade/${json.id}?convidar=1`);
    } catch (e: any) {
      setErro(e?.message || 'Falha ao criar o grupo.');
      setOcupado(null);
    }
  };

  const responder = async (g: GrupoResumo, positivo: boolean) => {
    setOcupado(g.id);
    setErro('');
    const r = await responderConvite({ type: 'convite_grupo', groupId: g.id }, positivo);
    setOcupado(null);
    if (!r.ok) return setErro(r.error || 'Não deu para responder agora.');
    if (positivo) router.push(`/comunidade/${g.id}`);
    else carregar();
  };

  if (estado === 'carregando') return <p className="text-sm text-zinc-400">Carregando a Comunidade…</p>;

  if (estado === 'off') {
    return (
      <div className="rounded-3xl border border-clay-800/50 bg-clay-950/20 p-6 text-sm text-clay-200">
        A Comunidade precisa do Supabase configurado.
      </div>
    );
  }

  if (estado === 'anon') {
    return (
      <div className="card-soft p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-700 text-emerald-400">
          <Icon name="users" size={22} />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-zinc-50">Entre para participar da Comunidade</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-300">
          Crie grupos, convide amigos, compartilhe livros, músicas e filmes, e ouça ou assista junto com eles.
        </p>
        <Link
          href="/login?next=/comunidade"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          Entrar ou criar conta <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {erro && (
        <div className="flex items-start gap-2 rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">
          <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Convites esperando resposta */}
      {convites.length > 0 && (
        <section className="space-y-3 rounded-3xl border border-clay-700/60 bg-clay-950/15 p-5" aria-label="Convites para grupos">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-50">
            <Icon name="users" size={16} className="text-clay-400" />
            {convites.length === 1 ? 'Um convite para grupo' : `${convites.length} convites para grupos`}
          </h2>
          <ul className="space-y-3">
            {convites.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <div className="flex min-w-0 items-start gap-3">
                <Avatar nome={g.name} path={g.imagePath} tamanho={48} quadrado />
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-500">
                    <span className="font-medium text-zinc-300">{g.invitedByName ?? g.ownerName}</span> convidou você
                  </p>
                  <h3 className="mt-0.5 text-base font-semibold text-zinc-50">{g.name}</h3>
                  {g.description && <p className="mt-0.5 text-xs text-zinc-400">{g.description}</p>}
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {g.memberCount} {g.memberCount === 1 ? 'pessoa' : 'pessoas'} · criado por {g.ownerName}
                  </p>
                </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => responder(g, true)}
                    disabled={ocupado === g.id}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    <Icon name="thumbUp" size={16} /> Participar
                  </button>
                  <button
                    onClick={() => responder(g, false)}
                    disabled={ocupado === g.id}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-clay-600 hover:text-clay-300 disabled:opacity-60"
                  >
                    <Icon name="thumbDown" size={16} /> Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Criar grupo */}
      {criando ? (
        <form onSubmit={criar} className="card-soft space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-50">
            <Icon name="plus" size={16} className="text-emerald-400" /> Novo grupo
          </h2>
          <input
            required
            autoFocus
            maxLength={80}
            placeholder="Nome do grupo (ex.: Clube do livro, Família, Rock dos anos 80)"
            value={novo.name}
            onChange={(e) => setNovo({ ...novo, name: e.target.value })}
            className={campo}
          />
          <textarea
            rows={2}
            maxLength={500}
            placeholder="Sobre o que é o grupo? (opcional)"
            value={novo.description}
            onChange={(e) => setNovo({ ...novo, description: e.target.value })}
            className={campo}
          />
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-300">Quem pode convidar</p>
            <EscolherTipo value={novo.privacy} onChange={(privacy) => setNovo({ ...novo, privacy })} />
          </div>
          <div className="flex items-center gap-3">
            {previa ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previa} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-zinc-700 text-zinc-500">
                <Icon name="image" size={20} />
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => seletorDeImagem.current?.click()}
                className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-700"
              >
                {imagem ? 'Trocar imagem' : 'Imagem do grupo (opcional)'}
              </button>
              {imagem && (
                <button type="button" onClick={() => setImagem(null)} className="rounded-xl px-2 py-2 text-xs text-zinc-500 hover:text-clay-300">
                  Tirar
                </button>
              )}
            </div>
            <input
              ref={seletorDeImagem}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setImagem(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={ocupado === 'criar'}
              className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {ocupado === 'criar' ? 'Criando…' : 'Criar e convidar amigos'}
            </button>
            <button
              type="button"
              onClick={() => setCriando(false)}
              className="rounded-2xl border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 transition hover:text-zinc-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setCriando(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          <Icon name="plus" size={16} /> Criar grupo
        </button>
      )}

      {/* Meus grupos */}
      <section className="space-y-3" aria-label="Meus grupos">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
          Meus grupos {grupos.length > 0 && `· ${grupos.length}`}
        </h2>
        {grupos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 p-8 text-center">
            <p className="text-sm font-medium text-zinc-200">Você ainda não está em nenhum grupo.</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-zinc-400">
              Crie um grupo para a família, os amigos do trabalho ou quem curte o mesmo som, e use <strong>Convidar amigos</strong> para
              chamar quem já está aqui — ou mandar o link para quem ainda não tem conta.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {grupos.map((g) => (
              <li key={g.id}>
                <Link href={`/comunidade/${g.id}`} className="card-soft levanta flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <Avatar nome={g.name} path={g.imagePath} tamanho={48} quadrado />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-zinc-50">{g.name}</h3>
                        <SeloDoTipo privacy={g.privacy} />
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {g.memberCount} {g.memberCount === 1 ? 'pessoa' : 'pessoas'} · {g.postCount}{' '}
                        {g.postCount === 1 ? 'publicação' : 'publicações'}
                        {g.myRole === 'dono' && ' · você criou'}
                      </p>
                    </div>
                  </div>
                  {g.description && <p className="mt-3 line-clamp-2 text-xs text-zinc-400">{g.description}</p>}
                  <div className="mt-auto pt-3 text-[11px]">
                    {g.playingTitle ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-500/15 px-2.5 py-1 font-medium text-clay-300">
                        <Icon name="headphones" size={12} /> Tocando agora: <span className="max-w-[12rem] truncate">{g.playingTitle}</span>
                      </span>
                    ) : (
                      g.lastActivity && <span className="text-zinc-500">Última atividade {formatEventDateLong(g.lastActivity)}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
