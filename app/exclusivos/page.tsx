'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import { lerFundoExclusivo, salvarFundoExclusivo, type ItemExclusivo } from '@/lib/exclusivos';

export default function ExclusivosPage() {
  const [items, setItems] = useState<ItemExclusivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeBg, setActiveBg] = useState<string | null>(null);

  useEffect(() => {
    setActiveBg(lerFundoExclusivo()?.id ?? null);
    fetch('/api/exclusivos', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Não foi possível carregar seus itens.');
        setItems(j.items ?? []);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const stickers = useMemo(() => items.filter((i) => i.kind === 'sticker'), [items]);
  const wallpapers = useMemo(() => items.filter((i) => i.kind === 'wallpaper'), [items]);

  const useWallpaper = (item: ItemExclusivo) => {
    salvarFundoExclusivo({ id: item.id, title: item.title, url: item.url });
    setActiveBg(item.id);
  };

  const clearWallpaper = () => {
    salvarFundoExclusivo(null);
    setActiveBg(null);
  };

  return (
    <div className="min-h-screen text-zinc-100">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <header className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-950/85 p-6 shadow-xl backdrop-blur">
          <p className="font-mono text-[10px] uppercase tracking-[.22em] text-emerald-300">presente · evento · promoção</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Seus itens exclusivos</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">Aqui aparecem somente os adesivos e planos de fundo que o superadministrador enviou para a sua conta.</p>
          {activeBg && <button type="button" onClick={clearWallpaper} className="mt-4 rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200">Voltar ao fundo padrão</button>}
        </header>

        {loading && <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center text-sm text-zinc-400">Carregando seus itens…</div>}
        {error && <div className="rounded-2xl border border-red-900 bg-red-950/70 p-5 text-sm text-red-200">{error}</div>}

        {!loading && !error && (
          <div className="space-y-10">
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Planos de fundo</h2>
                  <p className="text-xs text-zinc-500">Escolha um para usar na plataforma.</p>
                </div>
                <span className="font-mono text-xs text-zinc-500">{wallpapers.length}</span>
              </div>
              {wallpapers.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {wallpapers.map((item, index) => (
                    <article key={item.id} className={`overflow-hidden rounded-2xl border bg-zinc-950/85 ${activeBg === item.id ? 'border-emerald-400 ring-2 ring-emerald-400/20' : 'border-zinc-800'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.title} className="aspect-video w-full object-cover" loading="lazy" />
                      <div className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-zinc-100">{String(index + 1).padStart(2, '0')} · {item.title}</p>
                          <p className="truncate text-[11px] text-zinc-500">{item.collection}</p>
                        </div>
                        <button type="button" onClick={() => useWallpaper(item)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${activeBg === item.id ? 'bg-emerald-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'}`}>
                          {activeBg === item.id ? 'Em uso' : 'Usar fundo'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">Nenhum plano de fundo exclusivo foi enviado para você ainda.</p>}
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Adesivos exclusivos</h2>
                  <p className="text-xs text-zinc-500">Eles também aparecem automaticamente na aba de adesivos do chat.</p>
                </div>
                <span className="font-mono text-xs text-zinc-500">{stickers.length}</span>
              </div>
              {stickers.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {stickers.map((item, index) => (
                    <article key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/85 p-3 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.title} className="aspect-square w-full object-contain" loading="lazy" />
                      <p className="mt-2 truncate text-xs font-bold text-zinc-100">{String(index + 1).padStart(2, '0')} · {item.title}</p>
                      <p className="truncate text-[10px] text-zinc-500">{item.collection}</p>
                    </article>
                  ))}
                </div>
              ) : <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">Nenhum adesivo exclusivo foi enviado para você ainda.</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
