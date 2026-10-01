'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../icons';
import { supabase } from '@/lib/supabase';
import { CATEGORIAS_DE_EMOJI, FIGURINHAS_DE_REACAO } from '@/lib/emojis';
import { STICKERS } from '@/lib/invite-stickers';
import type { ItemExclusivo } from '@/lib/exclusivos';

export type Escolha =
  | { tipo: 'emoji'; emoji: string }
  | { tipo: 'figurinha'; emoji?: string; mediaPath?: string }
  | { tipo: 'adesivo'; n: number }
  | { tipo: 'adesivo-exclusivo'; id: string };

const SALVAS = 'nexo:figurinhas:salvas';

/** Figurinhas guardadas (as suas e as que você salvou de outras pessoas). */
export function lerFigurinhasSalvas(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SALVAS) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 200) : [];
  } catch {
    return [];
  }
}
export function salvarFigurinha(path: string) {
  try {
    const atuais = lerFigurinhasSalvas().filter((p) => p !== path);
    localStorage.setItem(SALVAS, JSON.stringify([path, ...atuais].slice(0, 200)));
  } catch {
    /* sem armazenamento */
  }
}

/** Foto → figurinha: quadrada, 512 px, WebP com transparência preservada. */
async function fazerFigurinha(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions).catch(() => {
    throw new Error('Não consegui abrir essa imagem.');
  });
  const lado = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Este navegador não consegue criar figurinhas.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  bmp.close();
  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/webp', 0.9));
  if (!blob) throw new Error('Não deu para criar a figurinha.');
  return blob;
}

export default function PainelDeFigurinhas({ meuId, onEscolher, onFechar }: { meuId: string; onEscolher: (e: Escolha) => void; onFechar: () => void }) {
  const [aba, setAba] = useState<'emoji' | 'figurinhas' | 'adesivos'>('emoji');
  const [categoria, setCategoria] = useState(CATEGORIAS_DE_EMOJI[0].id);
  const [minhas, setMinhas] = useState<{ path: string; url: string }[]>([]);
  const [exclusivos, setExclusivos] = useState<ItemExclusivo[]>([]);
  const [carregandoExclusivos, setCarregandoExclusivos] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const arquivo = useRef<HTMLInputElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  // Fecha ao tocar fora ou com Esc.
  useEffect(() => {
    const fora = (e: PointerEvent) => {
      if (painel.current && !painel.current.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('[data-abre-painel]')) onFechar();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [onFechar]);

  const carregarMinhas = useCallback(async () => {
    if (!supabase || !meuId) return;
    const { data } = await supabase.storage.from('chat').list(`figurinhas/${meuId}`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
    const proprias = (data ?? []).filter((f) => f.name && !f.name.startsWith('.')).map((f) => `figurinhas/${meuId}/${f.name}`);
    const todas = Array.from(new Set([...proprias, ...lerFigurinhasSalvas()])).slice(0, 120);
    if (!todas.length) return setMinhas([]);
    const { data: links } = await supabase.storage.from('chat').createSignedUrls(todas, 6 * 3600);
    setMinhas((links ?? []).flatMap((l) => (l.signedUrl && l.path ? [{ path: l.path, url: l.signedUrl }] : [])));
  }, [meuId]);

  const carregarExclusivos = useCallback(async () => {
    if (!meuId) return;
    setCarregandoExclusivos(true);
    try {
      const res = await fetch('/api/exclusivos?kind=sticker', { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 503) return setExclusivos([]);
        throw new Error('Não foi possível carregar os adesivos exclusivos.');
      }
      const json = await res.json().catch(() => ({}));
      setExclusivos(Array.isArray(json.items) ? json.items : []);
    } catch {
      setExclusivos([]);
    } finally {
      setCarregandoExclusivos(false);
    }
  }, [meuId]);

  useEffect(() => {
    if (aba === 'figurinhas') void carregarMinhas();
    if (aba === 'adesivos') void carregarExclusivos();
  }, [aba, carregarMinhas, carregarExclusivos]);

  const criar = async (file: File) => {
    if (!supabase) return;
    setOcupado(true);
    setErro('');
    try {
      const blob = await fazerFigurinha(file);
      const path = `figurinhas/${meuId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.webp`;
      const { error } = await supabase.storage.from('chat').upload(path, blob, { contentType: 'image/webp', upsert: false });
      if (error) throw new Error(error.message);
      await carregarMinhas();
    } catch (e) {
      setErro((e as Error).message || 'Não deu para criar a figurinha.');
    } finally {
      setOcupado(false);
      if (arquivo.current) arquivo.current.value = '';
    }
  };

  const cat = CATEGORIAS_DE_EMOJI.find((c) => c.id === categoria) ?? CATEGORIAS_DE_EMOJI[0];
  const abaBtn = (id: typeof aba, rotulo: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={aba === id}
      onClick={() => setAba(id)}
      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${aba === id ? 'bg-emerald-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'}`}
    >
      {rotulo}
    </button>
  );

  return (
    <div ref={painel} className="absolute bottom-full left-0 right-0 z-30 mb-2 flex max-h-[22rem] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:left-3 sm:right-auto sm:w-[26rem]">
      <div role="tablist" className="flex gap-1 border-b border-zinc-800 p-1.5">
        {abaBtn('emoji', '😊 Emoji')}
        {abaBtn('figurinhas', '🖼️ Figurinhas')}
        {abaBtn('adesivos', '🏷️ Adesivos')}
      </div>

      {aba === 'emoji' && (
        <>
          <div className="flex gap-0.5 overflow-x-auto border-b border-zinc-800 px-1.5 py-1">
            {CATEGORIAS_DE_EMOJI.map((c) => (
              <button key={c.id} type="button" title={c.rotulo} aria-label={c.rotulo} onClick={() => setCategoria(c.id)}
                className={`shrink-0 rounded-lg px-2 py-1 text-lg ${categoria === c.id ? 'bg-zinc-800' : 'opacity-60 hover:opacity-100'}`}>
                {c.icone}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-0.5 overflow-y-auto p-2 sm:grid-cols-9">
            {cat.emojis().map((e) => (
              <button key={e} type="button" onClick={() => onEscolher({ tipo: 'emoji', emoji: e })} className="rounded-lg p-1 text-2xl leading-none transition hover:scale-125 hover:bg-zinc-800" aria-label={e}>
                {e}
              </button>
            ))}
          </div>
        </>
      )}

      {aba === 'figurinhas' && (
        <div className="space-y-3 overflow-y-auto p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Minhas figurinhas</p>
            <button type="button" disabled={ocupado} onClick={() => arquivo.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-400 px-2.5 py-1 text-[11px] font-semibold text-zinc-950 disabled:opacity-60">
              <Icon name="plus" size={12} /> {ocupado ? 'Criando…' : 'Criar de uma foto'}
            </button>
            <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void criar(e.target.files[0])} />
          </div>
          {erro && <p className="text-xs text-clay-300">{erro}</p>}
          {minhas.length === 0 ? (
            <p className="text-xs text-zinc-500">Transforme qualquer foto em figurinha — ou toque numa figurinha recebida para salvar.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {minhas.map((f) => (
                <button key={f.path} type="button" onClick={() => onEscolher({ tipo: 'figurinha', mediaPath: f.path })} className="rounded-xl p-1 transition hover:bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="Figurinha" className="aspect-square w-full object-contain" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Reações</p>
          <div className="grid grid-cols-6 gap-1">
            {FIGURINHAS_DE_REACAO.map((e) => (
              <button key={e} type="button" onClick={() => onEscolher({ tipo: 'figurinha', emoji: e })} className="rounded-xl p-1 text-4xl leading-none transition hover:scale-110 hover:bg-zinc-800" aria-label={`Figurinha ${e}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {aba === 'adesivos' && (
        <div className="space-y-3 overflow-y-auto p-3">
          {(carregandoExclusivos || exclusivos.length > 0) && (
            <section>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Exclusivos da sua conta</p>
                {carregandoExclusivos && <span className="text-[10px] text-zinc-500">carregando…</span>}
              </div>
              {exclusivos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 rounded-xl border border-amber-500/20 bg-amber-950/10 p-2">
                  {exclusivos.map((s) => (
                    <button key={s.id} type="button" onClick={() => onEscolher({ tipo: 'adesivo-exclusivo', id: s.id })} className="flex items-center justify-center rounded-xl p-1 transition hover:bg-amber-500/10" aria-label={`Adesivo exclusivo ${s.title}`} title={`${s.title} · ${s.collection}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.url} alt="" loading="lazy" className="max-h-20 w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Coleção geral</p>
            <div className="grid grid-cols-4 gap-2">
              {STICKERS.map((s) => (
                <button key={s.index} type="button" onClick={() => onEscolher({ tipo: 'adesivo', n: s.index })} className="flex items-center justify-center rounded-xl p-1 transition hover:bg-zinc-800" aria-label={`Adesivo ${s.index + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.file} alt="" loading="lazy" className="max-h-20 w-full object-contain" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
