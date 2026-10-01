'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Asset = {
  id: string;
  title: string;
  kind: 'sticker' | 'wallpaper';
  collection: string;
  imagePath: string;
  url: string;
  sortOrder: number;
  active: boolean;
};
type User = { id: string; full_name: string | null; email: string | null };
type Grant = { asset_id: string; user_id: string };

const safeName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'item.png';

export default function AdminExclusivos({ demo = false }: { demo?: boolean }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [assetIds, setAssetIds] = useState<Set<string>>(new Set());
  const [userIds, setUserIds] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<'sticker' | 'wallpaper'>('sticker');
  const [collection, setCollection] = useState('geral');
  const [baseTitle, setBaseTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (demo) return;
    const r = await fetch('/api/admin/exclusivos', { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMessage(`❌ ${j.error || 'Não foi possível carregar os itens exclusivos.'}`);
      return;
    }
    setAssets(j.assets ?? []);
    setUsers(j.users ?? []);
    setGrants(j.grants ?? []);
  }, [demo]);

  useEffect(() => { void load(); }, [load]);

  const grantMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const g of grants) {
      const s = m.get(g.asset_id) ?? new Set<string>();
      s.add(g.user_id);
      m.set(g.asset_id, s);
    }
    return m;
  }, [grants]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    setter((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const upload = async () => {
    if (demo) return setMessage('Modo demonstração: configure o Supabase para enviar itens.');
    if (!supabase) return setMessage('❌ Supabase indisponível.');
    if (!files.length) return setMessage('Selecione uma ou mais imagens.');
    setBusy(true);
    setMessage('');
    const criados: string[] = [];
    let order = Math.max(0, ...assets.map((a) => Number(a.sortOrder) || 0)) + 1;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `catalogo/${Date.now()}-${String(i).padStart(3, '0')}-${safeName(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;
        const up = await supabase.storage.from('exclusivos').upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (up.error) throw new Error(`Falha ao enviar ${file.name}: ${up.error.message}`);

        const originalTitle = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
        const title = files.length === 1 && baseTitle.trim()
          ? baseTitle.trim()
          : baseTitle.trim()
            ? `${baseTitle.trim()} ${String(i + 1).padStart(2, '0')}`
            : originalTitle || `Item ${order}`;
        const r = await fetch('/api/admin/exclusivos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', title, kind, collection: collection.trim() || 'geral', imagePath: path, sortOrder: order++ }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          await supabase.storage.from('exclusivos').remove([path]);
          throw new Error(j.error || `Falha ao cadastrar ${file.name}.`);
        }
        criados.push(j.asset.id);
      }
      setFiles([]);
      if (input.current) input.current.value = '';
      setBaseTitle('');
      setMessage(`✓ ${criados.length} item(ns) adicionado(s) ao catálogo na ordem selecionada.`);
      await load();
      setAssetIds(new Set(criados));
    } catch (e) {
      setMessage(`❌ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const grant = async (action: 'grant' | 'revoke') => {
    if (!assetIds.size || !userIds.size) return setMessage('Selecione pelo menos um item e um usuário.');
    setBusy(true);
    try {
      const r = await fetch('/api/admin/exclusivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, assetIds: [...assetIds], userIds: [...userIds] }),
      });
      const j = await r.json().catch(() => ({}));
      setMessage(r.ok ? (action === 'grant' ? '✓ Itens enviados aos usuários selecionados.' : '✓ Acesso revogado.') : `❌ ${j.error || 'Falha ao atualizar acesso.'}`);
      if (r.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  const apagar = async (asset: Asset) => {
    if (!window.confirm(`Apagar definitivamente “${asset.title}”?`)) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/exclusivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', assetId: asset.id }),
      });
      const j = await r.json().catch(() => ({}));
      setMessage(r.ok ? '✓ Item apagado.' : `❌ ${j.error || 'Falha ao apagar.'}`);
      if (r.ok) {
        setAssetIds((s) => { const n = new Set(s); n.delete(asset.id); return n; });
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-50">Itens exclusivos</h2>
          <p className="mt-1 text-xs text-zinc-400">Envie adesivos e planos de fundo; só as contas escolhidas passam a tê-los disponíveis. Arquivos múltiplos entram na mesma ordem em que forem selecionados.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-zinc-400">Tipo
            <select value={kind} onChange={(e) => setKind(e.target.value as 'sticker' | 'wallpaper')} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100">
              <option value="sticker">Adesivo</option>
              <option value="wallpaper">Plano de fundo</option>
            </select>
          </label>
          <label className="text-xs text-zinc-400">Coleção / evento
            <input value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="ex.: inauguração rock" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" />
          </label>
          <label className="text-xs text-zinc-400">Título base (opcional)
            <input value={baseTitle} onChange={(e) => setBaseTitle(e.target.value)} placeholder="ex.: DRAP inauguração" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" />
          </label>
        </div>
        <label className="block rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-4 text-sm text-zinc-300">
          <span className="font-semibold">Imagens do catálogo</span>
          <span className="ml-2 text-xs text-zinc-500">PNG, JPG, WEBP ou GIF · até 50 MB cada</span>
          <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="mt-3 block w-full text-xs" />
          {files.length > 0 && <p className="mt-2 text-xs text-emerald-300">{files.length} arquivo(s): {files.map((f) => f.name).join(' · ')}</p>}
        </label>
        <button type="button" disabled={busy || !files.length} onClick={() => void upload()} className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-50">{busy ? 'Processando…' : 'Adicionar ao catálogo'}</button>
      </section>

      {message && <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200">{message}</div>}

      <section className="grid gap-6 lg:grid-cols-[1.3fr_.9fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-bold text-zinc-50">Catálogo ({assets.length})</h3>
            <button type="button" onClick={() => setAssetIds(new Set(assets.map((a) => a.id)))} className="text-xs text-emerald-300 hover:underline">Selecionar todos</button>
          </div>
          <div className="grid max-h-[38rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
            {assets.map((a, i) => {
              const selected = assetIds.has(a.id);
              const n = grantMap.get(a.id)?.size ?? 0;
              return (
                <div key={a.id} className={`relative overflow-hidden rounded-xl border p-2 ${selected ? 'border-emerald-400 bg-emerald-950/30' : 'border-zinc-800 bg-zinc-950'}`}>
                  <button type="button" onClick={() => toggle(setAssetIds, a.id)} className="block w-full text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.title} className={`w-full rounded-lg object-contain ${a.kind === 'wallpaper' ? 'aspect-video' : 'aspect-square'}`} loading="lazy" />
                    <span className="mt-2 block truncate text-xs font-semibold text-zinc-100">{String(i + 1).padStart(2, '0')} · {a.title}</span>
                    <span className="block truncate text-[10px] text-zinc-500">{a.kind === 'sticker' ? 'Adesivo' : 'Plano de fundo'} · {a.collection} · {n} acesso(s)</span>
                  </button>
                  <button type="button" onClick={() => void apagar(a)} className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] text-red-200">Apagar</button>
                </div>
              );
            })}
            {!assets.length && <p className="col-span-full py-8 text-center text-sm text-zinc-500">Nenhum item cadastrado.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-bold text-zinc-50">Destinatários ({users.length})</h3>
            <button type="button" onClick={() => setUserIds(new Set(users.map((u) => u.id)))} className="text-xs text-emerald-300 hover:underline">Selecionar todos</button>
          </div>
          <div className="max-h-[30rem] space-y-1 overflow-y-auto pr-1">
            {users.map((u) => (
              <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-zinc-800">
                <input type="checkbox" checked={userIds.has(u.id)} onChange={() => toggle(setUserIds, u.id)} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-100">{u.full_name || u.email || 'Usuário'}</span>
                  {u.email && <span className="block truncate text-[11px] text-zinc-500">{u.email}</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy || !assetIds.size || !userIds.size} onClick={() => void grant('grant')} className="rounded-xl bg-emerald-400 px-3 py-2.5 text-sm font-bold text-zinc-950 disabled:opacity-50">Enviar itens</button>
            <button type="button" disabled={busy || !assetIds.size || !userIds.size} onClick={() => void grant('revoke')} className="rounded-xl border border-red-800 bg-red-950/30 px-3 py-2.5 text-sm font-semibold text-red-200 disabled:opacity-50">Revogar</button>
          </div>
        </div>
      </section>
    </div>
  );
}
