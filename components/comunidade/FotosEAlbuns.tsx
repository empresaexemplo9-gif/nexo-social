'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../icons';
import type { Album, Foto } from '@/lib/comunidade-tipos';
import EnviarFotos from './EnviarFotos';
import { GradeDeFotos, Lightbox } from './Galeria';

const campo =
  'w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none';

/**
 * Fotos e álbuns do grupo. Qualquer membro cria álbum e põe fotos; quem criou
 * o álbum (ou o dono do grupo) renomeia e apaga — apagar o álbum não apaga
 * as fotos, que continuam em "Todas as fotos" e no mural.
 */
export default function FotosEAlbuns({ groupId, versao, aoMudar }: { groupId: string; versao: number; aoMudar: () => void }) {
  const [albuns, setAlbuns] = useState<Album[]>([]);
  // null = "Todas as fotos"
  const [albumAberto, setAlbumAberto] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [fim, setFim] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState({ title: '', description: '' });
  const [editando, setEditando] = useState(false);
  const [edicao, setEdicao] = useState({ title: '', description: '' });
  const [enviando, setEnviando] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);

  const carregarAlbuns = useCallback(async () => {
    const res = await fetch(`/api/comunidade/grupos/${groupId}/albuns`);
    const json = await res.json().catch(() => ({}));
    if (res.ok) setAlbuns(json.albuns || []);
    else setErro(json.error || 'Falha ao carregar os álbuns.');
  }, [groupId]);

  const carregarFotos = useCallback(
    async (antes?: string) => {
      const qs = new URLSearchParams();
      if (albumAberto) qs.set('album', albumAberto);
      if (antes) qs.set('antes', antes);
      const res = await fetch(`/api/comunidade/grupos/${groupId}/fotos?${qs}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setErro(json.error || 'Falha ao carregar as fotos.');
      setFotos((prev) => (antes ? [...prev, ...(json.fotos || [])] : json.fotos || []));
      setFim(Boolean(json.fim));
      setCarregando(false);
    },
    [groupId, albumAberto],
  );

  useEffect(() => {
    carregarAlbuns();
  }, [carregarAlbuns, versao]);

  useEffect(() => {
    setCarregando(true);
    carregarFotos();
  }, [carregarFotos, versao]);

  const album = albuns.find((a) => a.id === albumAberto) ?? null;

  const pedir = async (url: string, method: string, body?: unknown) => {
    setErro('');
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(json.error || 'Falha na operação.');
      return null;
    }
    return json;
  };

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    const json = await pedir(`/api/comunidade/grupos/${groupId}/albuns`, 'POST', novo);
    if (!json) return;
    setNovo({ title: '', description: '' });
    setCriando(false);
    await carregarAlbuns();
    setAlbumAberto(json.id);
    setEnviando(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album) return;
    if (await pedir(`/api/comunidade/grupos/${groupId}/albuns/${album.id}`, 'PATCH', edicao)) {
      setEditando(false);
      carregarAlbuns();
    }
  };

  const apagarAlbum = async () => {
    if (!album) return;
    if (!window.confirm(`Apagar o álbum "${album.title}"? As fotos continuam no grupo, em "Todas as fotos" e no mural.`)) return;
    if (await pedir(`/api/comunidade/grupos/${groupId}/albuns/${album.id}`, 'DELETE')) {
      setAlbumAberto(null);
      aoMudar();
    }
  };

  const apagarFoto = async (f: Foto) => {
    if (await pedir(`/api/comunidade/grupos/${groupId}/fotos?fotoId=${f.id}`, 'DELETE')) {
      setFotos((prev) => prev.filter((x) => x.id !== f.id));
      aoMudar();
    }
  };

  const moverFoto = async (f: Foto, albumId: string | null) => {
    if (await pedir(`/api/comunidade/grupos/${groupId}/fotos`, 'PATCH', { fotoIds: [f.id], albumId })) {
      // Dentro de um álbum, a foto que saiu dele some da grade.
      setFotos((prev) =>
        albumAberto && albumId !== albumAberto ? prev.filter((x) => x.id !== f.id) : prev.map((x) => (x.id === f.id ? { ...x, albumId } : x)),
      );
      carregarAlbuns();
    }
  };

  return (
    <section className="space-y-5" aria-label="Fotos e álbuns">
      {erro && <p className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}

      {/* Álbuns */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            setAlbumAberto(null);
            setEnviando(false);
            setEditando(false);
          }}
          className={`w-32 shrink-0 rounded-2xl border p-2 text-left transition ${albumAberto === null ? 'border-emerald-600 bg-emerald-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}
        >
          <span className="flex aspect-square items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
            <Icon name="image" size={26} />
          </span>
          <span className="mt-1.5 block truncate text-xs font-semibold text-zinc-100">Todas as fotos</span>
        </button>
        {albuns.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              setAlbumAberto(a.id);
              setEnviando(false);
              setEditando(false);
            }}
            className={`w-32 shrink-0 rounded-2xl border p-2 text-left transition ${albumAberto === a.id ? 'border-emerald-600 bg-emerald-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}
          >
            {a.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.coverUrl} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
            ) : (
              <span className="flex aspect-square items-center justify-center rounded-xl bg-zinc-800 text-zinc-500">
                <Icon name="library" size={24} />
              </span>
            )}
            <span className="mt-1.5 block truncate text-xs font-semibold text-zinc-100">{a.title}</span>
            <span className="block text-[10px] text-zinc-500">
              {a.photoCount} {a.photoCount === 1 ? 'foto' : 'fotos'}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="flex w-32 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-700 p-2 text-xs text-zinc-400 transition hover:border-emerald-700 hover:text-emerald-300"
        >
          <Icon name="plus" size={20} /> Criar álbum
        </button>
      </div>

      {criando && (
        <form onSubmit={criar} className="card-soft space-y-2.5 p-4">
          <h3 className="text-sm font-semibold text-zinc-50">Novo álbum</h3>
          <input
            required
            autoFocus
            maxLength={120}
            placeholder="Nome do álbum (ex.: Viagem para a praia)"
            value={novo.title}
            onChange={(e) => setNovo({ ...novo, title: e.target.value })}
            className={campo}
          />
          <input
            maxLength={500}
            placeholder="Descrição (opcional)"
            value={novo.description}
            onChange={(e) => setNovo({ ...novo, description: e.target.value })}
            className={campo}
          />
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl action-patch action-patch--cobalt bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400">
              Criar e adicionar fotos
            </button>
            <button type="button" onClick={() => setCriando(false)} className="rounded-xl border border-zinc-800 px-4 py-2 text-xs text-zinc-400">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Cabeçalho do que está aberto */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {album && editando ? (
          <form onSubmit={salvar} className="w-full max-w-md space-y-2">
            <input required maxLength={120} value={edicao.title} onChange={(e) => setEdicao({ ...edicao, title: e.target.value })} className={campo} />
            <input
              maxLength={500}
              placeholder="Descrição (opcional)"
              value={edicao.description}
              onChange={(e) => setEdicao({ ...edicao, description: e.target.value })}
              className={campo}
            />
            <div className="flex gap-2">
              <button type="submit" className="rounded-xl action-patch action-patch--cobalt bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950">
                Salvar
              </button>
              <button type="button" onClick={() => setEditando(false)} className="rounded-xl border border-zinc-800 px-4 py-2 text-xs text-zinc-400">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-zinc-50">{album ? album.title : 'Todas as fotos'}</h3>
            {album?.description && <p className="text-sm text-zinc-300">{album.description}</p>}
            {album && (
              <p className="text-[11px] text-zinc-500">
                Criado por {album.createdByName} · {album.photoCount} {album.photoCount === 1 ? 'foto' : 'fotos'}
              </p>
            )}
          </div>
        )}
        {!editando && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEnviando((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl action-patch action-patch--cobalt bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              <Icon name="camera" size={14} /> {album ? 'Adicionar fotos ao álbum' : 'Enviar fotos'}
            </button>
            {album?.podeEditar && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEdicao({ title: album.title, description: album.description ?? '' });
                    setEditando(true);
                  }}
                  className="rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-300 hover:text-zinc-50"
                >
                  Renomear
                </button>
                <button type="button" onClick={apagarAlbum} className="rounded-xl border border-zinc-800 px-3 py-2 text-xs text-clay-300 hover:border-clay-700">
                  Apagar álbum
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {enviando && (
        <div className="card-soft p-4">
          <EnviarFotos
            key={albumAberto ?? 'todas'}
            groupId={groupId}
            albuns={albuns}
            albumFixo={albumAberto ?? undefined}
            onEnviado={() => {
              setEnviando(false);
              aoMudar();
            }}
          />
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-zinc-400">Carregando as fotos…</p>
      ) : fotos.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
          {album ? 'Este álbum ainda não tem fotos.' : 'O grupo ainda não tem fotos. Envie as primeiras!'}
        </p>
      ) : (
        <GradeDeFotos fotos={fotos} onAbrir={setAberta} />
      )}
      {!fim && (
        <button
          onClick={() => carregarFotos(fotos[fotos.length - 1]?.createdAt)}
          className="w-full rounded-2xl border border-zinc-800 py-2.5 text-sm text-zinc-300 transition hover:text-zinc-50"
        >
          Ver fotos mais antigas
        </button>
      )}

      {aberta !== null && (
        <Lightbox fotos={fotos} inicio={aberta} albuns={albuns} onFechar={() => setAberta(null)} onApagar={apagarFoto} onMover={moverFoto} />
      )}
    </section>
  );
}
