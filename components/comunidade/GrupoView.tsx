'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '../icons';
import Avatar from '../Avatar';
import { responderConvite } from '@/lib/convites';
import { trocarImagemDoGrupo } from '@/lib/imagens';
import type { Membro, Privacidade, Sala } from '@/lib/comunidade-tipos';
import ConvidarAmigos from './ConvidarAmigos';
import SalaSincronizada from './SalaSincronizada';
import Mural from './Mural';
import FotosEAlbuns from './FotosEAlbuns';
import { SeloDoTipo } from './EscolherTipo';

interface Detalhe {
  meuId: string;
  meuPapel: 'dono' | 'membro';
  /** Dono sempre; membros só se o grupo for aberto. */
  podeConvidar: boolean;
  grupo: {
    id: string;
    name: string;
    description: string | null;
    privacy: Privacidade;
    imagePath: string | null;
    ownerId: string;
    inviteToken: string | null;
  };
  membros: Membro[];
  sala: Sala | null;
  agora: string;
}

interface ConvitePendente {
  id: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  ownerName: string | null;
  invitedByName: string | null;
  memberCount: number | null;
}

const campo =
  'w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none';

export default function GrupoView({ id }: { id: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'anon' | 'naoEncontrado' | 'convite'>('carregando');
  const [d, setD] = useState<Detalhe | null>(null);
  const [convite, setConvite] = useState<ConvitePendente | null>(null);
  const [erro, setErro] = useState('');
  const [convidar, setConvidar] = useState(false);
  const [editando, setEditando] = useState(false);
  const [edicao, setEdicao] = useState({ name: '', description: '' });
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<'mural' | 'fotos'>('mural');
  // A aba de fotos só carrega quando é aberta pela primeira vez.
  const [viuFotos, setViuFotos] = useState(false);
  // Fotos mudaram numa aba: a outra recarrega quando for aberta.
  const [versaoFotos, setVersaoFotos] = useState(0);
  const seletorDeImagem = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch(`/api/comunidade/grupos/${id}`);
      if (res.status === 401) return setEstado('anon');
      const json = await res.json().catch(() => ({}));
      if (res.status === 404 || res.status === 400) return setEstado('naoEncontrado');
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (json.convitePendente) {
        setConvite(json.grupo);
        setEstado('convite');
        return;
      }
      setD(json);
      setEstado('ok');
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar o grupo.');
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Grupo recém-criado chega com ?convidar=1: abre o "Convidar amigos".
  useEffect(() => {
    if (estado !== 'ok') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('convidar') === '1') {
      setConvidar(true);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [estado]);

  const acao = async (url: string, method: string, body?: unknown) => {
    setOcupado(true);
    setErro('');
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      return json;
    } catch (e: any) {
      setErro(e?.message || 'Falha na operação.');
      return null;
    } finally {
      setOcupado(false);
    }
  };

  if (estado === 'carregando') {
    return erro ? (
      <p className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-4 text-sm text-clay-200">{erro}</p>
    ) : (
      <p className="text-sm text-zinc-400">Abrindo o grupo…</p>
    );
  }

  if (estado === 'anon') {
    return (
      <div className="card-soft p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-50">Entre para ver este grupo</h1>
        <Link
          href={`/login?next=/comunidade/${id}`}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950"
        >
          Entrar ou criar conta <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    );
  }

  if (estado === 'naoEncontrado') {
    return (
      <div className="card-soft p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-50">Grupo não encontrado</h1>
        <p className="mt-2 text-sm text-zinc-400">Ele pode ter sido apagado, ou você não participa dele.</p>
        <Link href="/comunidade" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
          Voltar para a Comunidade <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    );
  }

  if (estado === 'convite' && convite) {
    const responder = async (positivo: boolean) => {
      setOcupado(true);
      const r = await responderConvite({ type: 'convite_grupo', groupId: id }, positivo);
      setOcupado(false);
      if (!r.ok) return setErro(r.error || 'Não deu para responder.');
      if (positivo) carregar();
      else router.push('/comunidade');
    };
    return (
      <div className="card-soft mx-auto max-w-lg p-8 text-center">
        <Avatar nome={convite.name} path={convite.imagePath} tamanho={72} quadrado className="mx-auto" />
        <p className="mt-4 text-sm text-zinc-400">
          <span className="font-medium text-zinc-200">{convite.invitedByName ?? convite.ownerName ?? 'Alguém'}</span> convidou você para
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-50">{convite.name}</h1>
        {convite.description && <p className="mt-2 text-sm text-zinc-300">{convite.description}</p>}
        {erro && <p className="mt-4 text-xs text-clay-300">{erro}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => responder(true)}
            disabled={ocupado}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            <Icon name="thumbUp" size={16} /> Participar
          </button>
          <button
            onClick={() => responder(false)}
            disabled={ocupado}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 hover:border-clay-600 hover:text-clay-300 disabled:opacity-60"
          >
            <Icon name="thumbDown" size={16} /> Recusar
          </button>
        </div>
      </div>
    );
  }

  if (!d) return null;
  const { grupo, membros, meuPapel, meuId, podeConvidar } = d;
  const dono = meuPapel === 'dono';
  const nomeDoDono = membros.find((m) => m.role === 'dono')?.name ?? 'quem criou';
  const ativos = membros.filter((m) => m.status === 'ativo');
  const pendentes = membros.filter((m) => m.status === 'convidado');
  const nomes = Object.fromEntries(membros.map((m) => [m.userId, m.name]));
  const meuNome = nomes[meuId] ?? 'Alguém';

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    const json = await acao(`/api/comunidade/grupos/${id}`, 'PATCH', edicao);
    if (json) {
      setD({ ...d, grupo: { ...grupo, name: json.grupo.name, description: json.grupo.description } });
      setEditando(false);
    }
  };

  const novoLink = async () => {
    if (!window.confirm('Gerar um novo link de convite? O link antigo para de funcionar na hora.')) return;
    const json = await acao(`/api/comunidade/grupos/${id}`, 'PATCH', { novoLink: true });
    if (json) setD({ ...d, grupo: { ...grupo, inviteToken: json.inviteToken } });
  };

  const trocarTipo = async () => {
    const proximo: Privacidade = grupo.privacy === 'fechado' ? 'aberto' : 'fechado';
    const pergunta =
      proximo === 'aberto'
        ? 'Tornar o grupo aberto? Todos os membros passam a poder convidar amigos (e a ver o link de convite).'
        : 'Tornar o grupo fechado? Só você vai poder convidar. Gere um novo link se quiser invalidar o que os membros já têm.';
    if (!window.confirm(pergunta)) return;
    const json = await acao(`/api/comunidade/grupos/${id}`, 'PATCH', { privacy: proximo });
    if (json) setD({ ...d, grupo: { ...grupo, privacy: json.grupo.privacy } });
  };

  const trocarImagem = async (file: File) => {
    setOcupado(true);
    setErro('');
    try {
      const path = await trocarImagemDoGrupo(id, file);
      setD({ ...d, grupo: { ...grupo, imagePath: path } });
    } catch (e: any) {
      setErro(e?.message || 'Não deu para trocar a imagem.');
    } finally {
      setOcupado(false);
    }
  };

  const tirarImagem = async () => {
    if (!window.confirm('Tirar a imagem do grupo?')) return;
    const json = await acao(`/api/comunidade/grupos/${id}`, 'PATCH', { imagePath: null });
    if (json) setD({ ...d, grupo: { ...grupo, imagePath: null } });
  };

  const apagarGrupo = async () => {
    if (!window.confirm(`Apagar o grupo "${grupo.name}"? O mural e a sala somem para todos. Não dá para desfazer.`)) return;
    if (await acao(`/api/comunidade/grupos/${id}`, 'DELETE')) router.push('/comunidade');
  };

  const sair = async () => {
    if (!window.confirm(`Sair do grupo "${grupo.name}"?`)) return;
    if (await acao(`/api/comunidade/grupos/${id}/membros`, 'DELETE')) router.push('/comunidade');
  };

  const remover = async (m: Membro) => {
    const pergunta = m.status === 'convidado' ? `Cancelar o convite de ${m.name}?` : `Tirar ${m.name} do grupo?`;
    if (!window.confirm(pergunta)) return;
    if (await acao(`/api/comunidade/grupos/${id}/membros?userId=${m.userId}`, 'DELETE')) carregar();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {dono ? (
            <button
              type="button"
              onClick={() => seletorDeImagem.current?.click()}
              disabled={ocupado}
              className="group relative mt-5 shrink-0 overflow-hidden rounded-2xl"
              title="Trocar a imagem do grupo"
              aria-label="Trocar a imagem do grupo"
            >
              <Avatar nome={grupo.name} path={grupo.imagePath} tamanho={72} quadrado />
              <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 text-[#f6f2ea] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <Icon name="camera" size={20} />
              </span>
            </button>
          ) : (
            <Avatar nome={grupo.name} path={grupo.imagePath} tamanho={72} quadrado className="mt-5" />
          )}
          <input
            ref={seletorDeImagem}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) trocarImagem(e.target.files[0]);
              e.target.value = '';
            }}
          />
        <div className="min-w-0">
          <Link href="/comunidade" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200">
            <Icon name="chevronRight" size={12} className="rotate-180" /> Comunidade
          </Link>
          {editando ? (
            <form onSubmit={salvarEdicao} className="mt-2 w-full max-w-lg space-y-2">
              <input required maxLength={80} value={edicao.name} onChange={(e) => setEdicao({ ...edicao, name: e.target.value })} className={campo} />
              <textarea
                rows={2}
                maxLength={500}
                placeholder="Sobre o que é o grupo? (opcional)"
                value={edicao.description}
                onChange={(e) => setEdicao({ ...edicao, description: e.target.value })}
                className={campo}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={ocupado} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950">
                  Salvar
                </button>
                <button type="button" onClick={() => setEditando(false)} className="rounded-xl border border-zinc-800 px-4 py-2 text-xs text-zinc-400">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">{grupo.name}</h1>
              {grupo.description && <p className="mt-1 max-w-2xl text-sm text-zinc-300">{grupo.description}</p>}
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <SeloDoTipo privacy={grupo.privacy} />
                <span>
                  {ativos.length} {ativos.length === 1 ? 'pessoa' : 'pessoas'}
                  {pendentes.length > 0 && ` · ${pendentes.length} ${pendentes.length === 1 ? 'convite pendente' : 'convites pendentes'}`}
                </span>
              </p>
            </>
          )}
        </div>
        </div>
        {podeConvidar ? (
          <button
            onClick={() => setConvidar(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            <Icon name="users" size={16} /> Convidar amigos
          </button>
        ) : (
          <p className="flex max-w-[16rem] items-start gap-1.5 rounded-2xl border border-zinc-800 px-4 py-3 text-xs text-zinc-400">
            <Icon name="lock" size={14} className="mt-0.5 shrink-0" /> Grupo fechado: só {nomeDoDono} convida pessoas.
          </p>
        )}
      </div>

      {erro && <p className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-6">
          <SalaSincronizada groupId={id} salaInicial={d.sala} agoraInicial={d.agora} meuId={meuId} meuNome={meuNome} nomes={nomes} />
          <div className="flex gap-1.5 border-b border-zinc-800" role="tablist" aria-label="Seções do grupo">
            {(
              [
                ['mural', 'Mural', 'chat'],
                ['fotos', 'Fotos e álbuns', 'image'],
              ] as const
            ).map(([k, rotulo, icone]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={aba === k}
                onClick={() => {
                  setAba(k);
                  if (k === 'fotos') setViuFotos(true);
                }}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  aba === k ? 'border-emerald-500 text-emerald-300' : 'border-transparent text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <Icon name={icone} size={15} /> {rotulo}
              </button>
            ))}
          </div>
          {/* As duas ficam montadas: trocar de aba não perde o que foi carregado. */}
          <div hidden={aba !== 'mural'}>
            <Mural groupId={id} aoMudarFotos={() => setVersaoFotos((v) => v + 1)} />
          </div>
          {viuFotos && (
            <div hidden={aba !== 'fotos'}>
              <FotosEAlbuns groupId={id} versao={versaoFotos} aoMudar={() => setVersaoFotos((v) => v + 1)} />
            </div>
          )}
        </div>

        {/* Membros */}
        <aside className="space-y-4">
          <section className="card-soft p-4" aria-label="Membros">
            <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500">Membros · {ativos.length}</h2>
            <ul className="space-y-1">
              {[...ativos, ...pendentes].map((m) => (
                <li key={m.userId} className="group flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
                  <Avatar nome={m.name} path={m.avatarPath} tamanho={32} pendente={m.status === 'convidado'} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-100">
                      {m.name}
                      {m.userId === meuId && <span className="text-zinc-500"> (você)</span>}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-500">
                      {m.role === 'dono' ? 'criou o grupo' : m.status === 'convidado' ? `convite pendente${m.invitedByName ? ` · de ${m.invitedByName}` : ''}` : 'membro'}
                    </span>
                  </span>
                  {dono && m.userId !== meuId && (
                    <button
                      onClick={() => remover(m)}
                      className="rounded-lg p-1 text-zinc-600 opacity-100 transition hover:text-clay-300 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={m.status === 'convidado' ? `Cancelar convite de ${m.name}` : `Tirar ${m.name} do grupo`}
                      title={m.status === 'convidado' ? 'Cancelar convite' : 'Tirar do grupo'}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {podeConvidar && (
              <button
                onClick={() => setConvidar(true)}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 py-2 text-xs text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
              >
                <Icon name="plus" size={13} /> Convidar amigos
              </button>
            )}
          </section>

          <section className="card-soft space-y-1 p-4 text-xs" aria-label="Opções do grupo">
            {dono ? (
              <>
                <button
                  onClick={() => {
                    setEdicao({ name: grupo.name, description: grupo.description ?? '' });
                    setEditando(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-zinc-300 hover:bg-zinc-800/60"
                >
                  <Icon name="palette" size={14} /> Editar nome e descrição
                </button>
                <button onClick={trocarTipo} disabled={ocupado} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-zinc-300 hover:bg-zinc-800/60">
                  <Icon name={grupo.privacy === 'fechado' ? 'globe' : 'lock'} size={14} />
                  {grupo.privacy === 'fechado' ? 'Tornar aberto (todos convidam)' : 'Tornar fechado (só eu convido)'}
                </button>
                <button
                  onClick={() => seletorDeImagem.current?.click()}
                  disabled={ocupado}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-zinc-300 hover:bg-zinc-800/60"
                >
                  <Icon name="image" size={14} /> {grupo.imagePath ? 'Trocar imagem do grupo' : 'Adicionar imagem do grupo'}
                </button>
                {grupo.imagePath && (
                  <button onClick={tirarImagem} disabled={ocupado} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-zinc-300 hover:bg-zinc-800/60">
                    <Icon name="close" size={14} /> Tirar imagem do grupo
                  </button>
                )}
                <button onClick={novoLink} disabled={ocupado} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-zinc-300 hover:bg-zinc-800/60">
                  <Icon name="link" size={14} /> Gerar novo link de convite
                </button>
                <button onClick={apagarGrupo} disabled={ocupado} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-clay-300 hover:bg-clay-950/30">
                  <Icon name="trash" size={14} /> Apagar grupo
                </button>
              </>
            ) : (
              <button onClick={sair} disabled={ocupado} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-clay-300 hover:bg-clay-950/30">
                <Icon name="logOut" size={14} /> Sair do grupo
              </button>
            )}
          </section>
        </aside>
      </div>

      {convidar && podeConvidar && grupo.inviteToken && (
        <ConvidarAmigos
          groupId={id}
          groupName={grupo.name}
          token={grupo.inviteToken}
          meuNome={meuNome}
          jaNoGrupo={membros.map((m) => m.userId)}
          onFechar={() => setConvidar(false)}
          onConvidou={carregar}
        />
      )}
    </div>
  );
}
