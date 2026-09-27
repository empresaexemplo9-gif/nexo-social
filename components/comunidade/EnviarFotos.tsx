'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '../icons';
import { apagarImagens, enviarFotosDoGrupo } from '@/lib/imagens';
import type { Album } from '@/lib/comunidade-tipos';

const MAX_FOTOS = 20;

/**
 * Enviar fotos para o grupo — do mural (escolhendo, se quiser, um álbum) ou
 * de dentro de um álbum (`albumFixo`). Vira uma publicação do tipo 'foto'.
 */
export default function EnviarFotos({
  groupId,
  albuns = [],
  albumFixo,
  onEnviado,
}: {
  groupId: string;
  albuns?: Album[];
  albumFixo?: string;
  onEnviado: () => void;
}) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [previas, setPrevias] = useState<string[]>([]);
  const [legenda, setLegenda] = useState('');
  const [albumId, setAlbumId] = useState(albumFixo ?? '');
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const seletor = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = arquivos.map((f) => URL.createObjectURL(f));
    setPrevias(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [arquivos]);

  const escolher = (lista: FileList | null) => {
    if (!lista) return;
    const novos = Array.from(lista).filter((f) => f.type.startsWith('image/') || !f.type);
    const juntos = [...arquivos, ...novos];
    if (juntos.length > MAX_FOTOS) setErro(`Até ${MAX_FOTOS} fotos por vez — fiquei com as primeiras ${MAX_FOTOS}.`);
    else setErro('');
    setArquivos(juntos.slice(0, MAX_FOTOS));
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivos.length) return setErro('Escolha ao menos uma foto.');
    setErro('');
    let enviadas: { path: string; thumbPath: string; width: number; height: number }[] = [];
    try {
      enviadas = await enviarFotosDoGrupo(groupId, arquivos, (feitas, total) =>
        setProgresso(feitas < total ? `Enviando ${feitas + 1} de ${total}…` : 'Publicando…'),
      );
      const res = await fetch(`/api/comunidade/grupos/${groupId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'foto', body: legenda, fotos: enviadas, albumId: albumId || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setArquivos([]);
      setLegenda('');
      onEnviado();
    } catch (e: any) {
      // Não deixa imagem órfã no Storage.
      await apagarImagens('comunidade', enviadas.flatMap((f) => [f.path, f.thumbPath]));
      setErro(e?.message || 'Não deu para enviar as fotos.');
    } finally {
      setProgresso(null);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {previas.map((u, i) => (
          <div key={u} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full object-cover" />
            {!progresso && (
              <button
                type="button"
                onClick={() => setArquivos((a) => a.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-zinc-950/80 p-1 text-zinc-100"
                aria-label="Tirar esta foto"
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </div>
        ))}
        {arquivos.length < MAX_FOTOS && (
          <button
            type="button"
            onClick={() => seletor.current?.click()}
            disabled={Boolean(progresso)}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-700 text-[11px] text-zinc-400 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            <Icon name="camera" size={20} />
            {arquivos.length ? 'Mais' : 'Escolher fotos'}
          </button>
        )}
      </div>
      <input
        ref={seletor}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          escolher(e.target.files);
          e.target.value = '';
        }}
      />

      <textarea
        rows={2}
        maxLength={2000}
        placeholder="Legenda (opcional)"
        value={legenda}
        onChange={(e) => setLegenda(e.target.value)}
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
      />

      {!albumFixo && albuns.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <Icon name="library" size={14} /> Álbum:
          <select
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-100 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Nenhum (só no mural)</option>
            {albuns.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {erro && <p className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}
      <button
        type="submit"
        disabled={Boolean(progresso) || !arquivos.length}
        className="inline-flex items-center gap-2 rounded-2xl action-patch action-patch--red bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
      >
        <Icon name="send" size={15} />{' '}
        {progresso ?? (arquivos.length > 1 ? `Publicar ${arquivos.length} fotos` : 'Publicar foto')}
      </button>
      <p className="text-[11px] text-zinc-500">
        As fotos são reduzidas antes do envio (carregam rápido) e perdem os dados de localização da câmera. Só quem está no grupo vê.
      </p>
    </form>
  );
}
