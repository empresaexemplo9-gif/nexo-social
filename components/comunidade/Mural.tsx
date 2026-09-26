'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../icons';
import Avatar from '../Avatar';
import { supabase } from '@/lib/supabase';
import { formatEventDateLong } from '@/lib/datetime';
import { TIPOS_POST, youtubeIdDe, type Album, type Foto, type Post, type TipoPost } from '@/lib/comunidade-tipos';
import { tocarParaOGrupo } from './SalaSincronizada';
import EnviarFotos from './EnviarFotos';
import { GradeDoPost, Lightbox } from './Galeria';

const campo =
  'w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none';

const VAZIO = { title: '', subtitle: '', url: '', body: '' };

/** O que o grupo compartilha: fotos, livros, músicas, clipes, filmes, links e recados. */
export default function Mural({ groupId, aoMudarFotos }: { groupId: string; aoMudarFotos?: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [fim, setFim] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [tipo, setTipo] = useState<TipoPost>('livro');
  const [form, setForm] = useState(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [tocando, setTocando] = useState<string | null>(null);
  const [albuns, setAlbuns] = useState<Album[]>([]);
  const [aberta, setAberta] = useState<{ fotos: Foto[]; i: number } | null>(null);

  const carregar = useCallback(
    async (antes?: string) => {
      try {
        const res = await fetch(`/api/comunidade/grupos/${groupId}/posts${antes ? `?antes=${encodeURIComponent(antes)}` : ''}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setPosts((prev) => (antes ? [...prev, ...(json.posts || [])] : json.posts || []));
        setFim(Boolean(json.fim));
      } catch (e: any) {
        setErro(e?.message || 'Falha ao carregar o mural.');
      } finally {
        setCarregando(false);
      }
    },
    [groupId],
  );

  useEffect(() => {
    carregar();
    // Publicação nova de alguém do grupo aparece sozinha.
    const sb = supabase;
    const canal = sb
      ?.channel(`mural:${groupId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts', filter: `group_id=eq.${groupId}` }, () =>
        carregar(),
      )
      .subscribe();
    return () => {
      if (canal && sb) sb.removeChannel(canal);
    };
  }, [groupId, carregar]);

  // Álbuns para escolher onde as fotos entram (lidos ao abrir "Fotos").
  useEffect(() => {
    if (tipo !== 'foto') return;
    fetch(`/api/comunidade/grupos/${groupId}/albuns`)
      .then((r) => (r.ok ? r.json() : { albuns: [] }))
      .then((j) => setAlbuns(j.albuns || []))
      .catch(() => undefined);
  }, [tipo, groupId]);

  const def = TIPOS_POST.find((t) => t.id === tipo)!;

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch(`/api/comunidade/grupos/${groupId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: tipo, ...form }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setForm(VAZIO);
      carregar();
    } catch (e: any) {
      setErro(e?.message || 'Falha ao publicar.');
    } finally {
      setEnviando(false);
    }
  };

  const apagar = async (p: Post) => {
    const aviso = p.fotos.length
      ? `Apagar esta publicação? ${p.fotos.length === 1 ? 'A foto dela também será apagada' : `As ${p.fotos.length} fotos dela também serão apagadas`} (inclusive dos álbuns).`
      : 'Apagar esta publicação do mural?';
    if (!window.confirm(aviso)) return;
    const res = await fetch(`/api/comunidade/grupos/${groupId}/posts?postId=${p.id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setErro(json.error || 'Falha ao apagar.');
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    if (p.fotos.length) aoMudarFotos?.();
  };

  const apagarFoto = async (f: Foto) => {
    const res = await fetch(`/api/comunidade/grupos/${groupId}/fotos?fotoId=${f.id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setErro(json.error || 'Falha ao apagar a foto.');
    const tirar = (lista: Foto[]) => lista.filter((x) => x.id !== f.id);
    setPosts((prev) => prev.map((p) => ({ ...p, fotos: tirar(p.fotos) })).filter((p) => p.kind !== 'foto' || p.fotos.length || p.body));
    setAberta((a) => (a ? { ...a, fotos: tirar(a.fotos) } : a));
    aoMudarFotos?.();
  };

  /** Toca a música/clipe na sala do grupo; sem link, procura no YouTube pelo título. */
  const tocar = async (p: Post) => {
    setTocando(p.id);
    setErro('');
    try {
      let id = p.youtubeId;
      let titulo = [p.title, p.subtitle].filter(Boolean).join(' — ');
      if (!id) {
        const res = await fetch(`/api/video?q=${encodeURIComponent(`${p.title ?? ''} ${p.subtitle ?? ''}`.trim())}`);
        const json = await res.json().catch(() => ({}));
        id = json.encontrado ? youtubeIdDe(json.embedUrl) : null;
        if (!id) throw new Error('Não achei esse título no YouTube. Cole o link do vídeo na sala.');
        titulo = titulo || json.title;
      }
      const r = await tocarParaOGrupo(groupId, { youtubeId: id, title: titulo || null, kind: p.kind === 'musica' ? 'musica' : 'clipe' });
      if (!r.ok) throw new Error(r.error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setErro(e?.message || 'Não deu para tocar.');
    } finally {
      setTocando(null);
    }
  };

  return (
    <section className="space-y-4" aria-label="Mural do grupo">
      <div className="card-soft space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-50">
          <Icon name="compartilhar" size={16} className="text-emerald-400" /> Compartilhar com o grupo
        </h2>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="O que compartilhar">
          {TIPOS_POST.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tipo === t.id}
              onClick={() => setTipo(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                tipo === t.id ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-800 text-zinc-300 hover:text-zinc-50'
              }`}
            >
              <Icon name={t.icone} size={13} /> {t.rotulo}
            </button>
          ))}
        </div>

        {tipo === 'foto' ? (
          <EnviarFotos
            groupId={groupId}
            albuns={albuns}
            onEnviado={() => {
              carregar();
              aoMudarFotos?.();
            }}
          />
        ) : (
        <form onSubmit={publicar} className="space-y-3">
        {def.titulo && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              required
              maxLength={200}
              placeholder={def.titulo}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={campo}
            />
            {def.subtitulo ? (
              <input
                maxLength={200}
                placeholder={def.subtitulo}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                className={campo}
              />
            ) : (
              <input
                required={tipo === 'link'}
                maxLength={1000}
                inputMode="url"
                placeholder={def.url}
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className={campo}
              />
            )}
          </div>
        )}
        {def.subtitulo && def.url && (
          <input
            maxLength={1000}
            inputMode="url"
            placeholder={def.url}
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className={campo}
          />
        )}
        <textarea
          required={tipo === 'recado'}
          rows={2}
          maxLength={2000}
          placeholder={tipo === 'recado' ? 'Escreva para o grupo…' : 'Um comentário: por que você indica? (opcional)'}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className={campo}
        />
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          <Icon name="send" size={15} /> {enviando ? 'Publicando…' : 'Publicar'}
        </button>
        </form>
        )}
      </div>

      {erro && <p className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-zinc-400">Carregando o mural…</p>
      ) : posts.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
          O mural está vazio. Compartilhe o primeiro livro, música ou filme com o grupo.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            const t = TIPOS_POST.find((x) => x.id === p.kind) ?? TIPOS_POST[0];
            const tocavel = p.kind === 'musica' || p.kind === 'clipe' || Boolean(p.youtubeId);
            return (
              <li key={p.id} className="card-soft p-5">
                <div className="flex items-start gap-3">
                  <span className="relative shrink-0">
                    <Avatar nome={p.authorName} path={p.authorAvatar} tamanho={40} />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-900 bg-emerald-500 text-zinc-950">
                      <Icon name={t.icone} size={10} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-zinc-500">
                      <span className="font-medium text-zinc-300">{p.authorName}</span> · {t.rotulo.toLowerCase()} ·{' '}
                      {formatEventDateLong(p.createdAt)}
                    </p>
                    {p.title && <h3 className="mt-0.5 text-base font-semibold text-zinc-50">{p.title}</h3>}
                    {p.subtitle && <p className="text-xs text-zinc-400">{p.subtitle}</p>}
                    {p.body && <p className="mt-1.5 whitespace-pre-wrap text-sm text-zinc-200">{p.body}</p>}
                    {p.fotos.length > 0 && <GradeDoPost fotos={p.fotos} onAbrir={(i) => setAberta({ fotos: p.fotos, i })} />}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {tocavel && (
                        <button
                          onClick={() => tocar(p)}
                          disabled={tocando === p.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                          <Icon name="headphones" size={14} />{' '}
                          {tocando === p.id ? 'Procurando…' : p.kind === 'musica' ? 'Ouvir junto com o grupo' : 'Assistir junto com o grupo'}
                        </button>
                      )}
                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-700 hover:text-emerald-300"
                        >
                          <Icon name="external" size={13} /> Abrir link
                        </a>
                      )}
                      {p.podeApagar && (
                        <button
                          onClick={() => apagar(p)}
                          className="ml-auto rounded-xl p-1.5 text-zinc-500 transition hover:text-clay-300"
                          aria-label="Apagar publicação"
                          title="Apagar"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {aberta && (
        <Lightbox fotos={aberta.fotos} inicio={aberta.i} onFechar={() => setAberta(null)} onApagar={apagarFoto} />
      )}
      {!fim && (
        <button
          onClick={() => carregar(posts[posts.length - 1]?.createdAt)}
          className="w-full rounded-2xl border border-zinc-800 py-2.5 text-sm text-zinc-300 transition hover:text-zinc-50"
        >
          Ver publicações mais antigas
        </button>
      )}
    </section>
  );
}
