'use client';

import React, { useRef, useState } from 'react';
import Icon from './icons';
import Avatar from './Avatar';
import { apagarImagens, enviarImagem, novoNome, prepararImagem } from '@/lib/imagens';

/** Foto de perfil: aparece nos grupos, no mural e na hora de convidar. */
export default function FotoDePerfil({
  userId,
  nome,
  inicial,
}: {
  userId: string;
  nome: string;
  inicial: string | null;
}) {
  const [path, setPath] = useState<string | null>(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const arquivo = useRef<HTMLInputElement>(null);

  const trocar = async (file: File) => {
    setOcupado(true);
    setErro('');
    let novo: string | null = null;
    try {
      // Quadrada, 512 px: fica nítida até no tamanho grande da página do grupo.
      const img = await prepararImagem(file, { max: 512, quadrado: true, qualidade: 0.88 });
      novo = `usuarios/${userId}/${novoNome()}.jpg`;
      await enviarImagem('perfis', novo, img);
      const res = await fetch('/api/me/foto', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: novo }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setPath(json.avatarPath);
    } catch (e: any) {
      if (novo) await apagarImagens('perfis', [novo]);
      setErro(e?.message || 'Não deu para trocar a foto.');
    } finally {
      setOcupado(false);
      if (arquivo.current) arquivo.current.value = '';
    }
  };

  const tirar = async () => {
    setOcupado(true);
    setErro('');
    const res = await fetch('/api/me/foto', { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (res.ok) setPath(null);
    else setErro(json.error || 'Não deu para tirar a foto.');
    setOcupado(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar nome={nome} path={path} tamanho={72} />
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => arquivo.current?.click()}
            disabled={ocupado}
            className="inline-flex items-center gap-1.5 rounded-xl action-patch action-patch--cobalt bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            <Icon name="camera" size={14} /> {ocupado ? 'Enviando…' : path ? 'Trocar foto' : 'Adicionar foto de perfil'}
          </button>
          {path && (
            <button
              type="button"
              onClick={tirar}
              disabled={ocupado}
              className="action-collage action-collage--paper rounded-xl border border-zinc-800 px-4 py-2 text-xs text-zinc-400 transition hover:text-clay-300"
            >
              Tirar foto
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">Aparece nos grupos, no mural e quando alguém for te convidar.</p>
        {erro && <p className="text-xs text-clay-300">{erro}</p>}
      </div>
      <input
        ref={arquivo}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && trocar(e.target.files[0])}
      />
    </div>
  );
}
