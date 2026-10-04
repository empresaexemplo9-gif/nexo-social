'use client';

import React, { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/Navbar';
import { inviteEdition, inviteImage, STICKERS } from '@/lib/invite-art';
import { inviteShareFile, shareInvite } from '@/lib/invite-share';

type Invite = { id: string; link: string; status: 'pending' | 'used' | 'revoked'; created_at: string; used_at: string | null };

const tokenOf = (link: string) => { try { return new URL(link).pathname.split('/').pop() || ''; } catch { return ''; } };

export default function ConvitesPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [novo, setNovo] = useState<string | null>(null);
  const artFiles = useRef(new Map<string, File>());
  const artLoads = useRef(new Map<string, Promise<File>>());

  const carregarArte = (link: string) => {
    let pending = artLoads.current.get(link);
    if (!pending) {
      pending = inviteShareFile(link).then((file) => {
        artFiles.current.set(link, file);
        return file;
      }).catch((error) => { artLoads.current.delete(link); throw error; });
      artLoads.current.set(link, pending);
    }
    return pending;
  };

  useEffect(() => {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return;
    const links = new Set(invites.filter((invite) => invite.status === 'pending').map((invite) => invite.link));
    if (novo) links.add(novo);
    links.forEach((link) => { void carregarArte(link).catch(() => {}); });
  }, [invites, novo]);

  const load = async () => {
    try {
      const res = await fetch('/api/invites', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Não foi possível carregar seus convites.');
      setCredits(j.credits ?? 0);
      setInvites(j.invites ?? []);
      return true;
    } catch {
      setMessage('Não foi possível atualizar seus convites. Tente carregar novamente. Links já criados continuam disponíveis.');
      return false;
    }
  };
  useEffect(() => { void load(); }, []);

  const criar = async () => {
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/invites', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Não foi possível gerar o convite.');
      setCredits(j.credits);
      setNovo(j.link);
      setMessage('Convite criado. Use Compartilhar ou Copiar link abaixo.');
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(j.link);
          setMessage('Convite criado. O link foi copiado para você enviar.');
        }
      } catch { /* The invitation already exists; a clipboard denial must not suggest creating it again. */ }
      await load();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const copiar = async (link: string) => {
    try {
      if (!navigator.clipboard) throw new Error('Copie o link exibido abaixo.');
      await navigator.clipboard.writeText(link);
      setMessage('Link copiado. Para enviar a imagem junto, use Compartilhar ou Baixar arte.');
    } catch { setMessage('Não foi possível copiar automaticamente. Selecione o link abaixo para copiar.'); }
  };

  const compartilhar = async (link: string) => {
    if (typeof navigator.share !== 'function') return copiar(link);
    try {
      if (typeof navigator.canShare === 'function' && !artFiles.current.has(link)) {
        setMessage('Preparando a arte do convite…');
        await carregarArte(link);
        setMessage('Arte pronta. Toque em Compartilhar novamente para enviá-la com o link.');
        return;
      }
      await shareInvite(link, artFiles.current.get(link));
    } catch (error) { if ((error as Error).name !== 'AbortError') setMessage('Não foi possível compartilhar. Use Baixar arte e Copiar link para enviar o convite.'); }
  };

  const baixarArte = async (link: string) => {
    try {
      const file = await carregarArte(link);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = file.name;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      // Dá tempo para o navegador iniciar o download antes de liberar o arquivo.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage('Arte baixada. Anexe a imagem no WhatsApp e envie o link do convite junto.');
    } catch { setMessage('Não foi possível baixar a arte. Tente novamente.'); }
  };

  return (
    <div className="min-h-screen text-zinc-100">
      <Navbar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-50">Meus convites</h1>
          <p className="mt-1 text-sm text-zinc-400">Cada link é individual e só cria uma conta. Ao gerar um link, um convite do seu saldo é consumido.</p>
        </div>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs uppercase tracking-wider text-zinc-500">Disponíveis</p><p className="text-4xl font-bold text-zinc-50">{credits ?? '…'}</p></div>
            <button onClick={criar} disabled={busy || credits === null || credits <= 0}
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? 'Gerando…' : 'Gerar link de convite'}
            </button>
          </div>
          {credits === 0 && <p className="mt-4 text-sm text-amber-300">Você usou seus convites. Novos convites só podem ser liberados pelo superadministrador.</p>}
          {message && <p role="status" className="mt-4 text-sm text-zinc-300">{message}</p>}
          <button type="button" onClick={() => { setMessage(''); void load(); }} disabled={busy} className="mt-3 text-sm text-emerald-400">Atualizar convites</button>
        </section>
        {novo && (() => {
          const e = inviteEdition(tokenOf(novo));
          return (
            <section className="overflow-hidden rounded-2xl border border-zinc-700" style={{ backgroundColor: e.theme.fundo, color: e.theme.tinta }}>
              <div className="flex flex-col items-center gap-5 p-6 sm:flex-row">
                <img src={e.sticker.file} width={e.sticker.w} height={e.sticker.h} alt={`Adesivo da ${e.theme.nome}`} className="h-auto max-h-44 w-auto max-w-[60%] drop-shadow-xl" />
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[.25em]" style={{ color: e.theme.suave }}>Seu novo convite saiu com</p>
                  <p className="text-2xl font-bold">{e.theme.nome}</p>
                  <p className="text-sm" style={{ color: e.theme.suave }}>Convite {e.serialLabel} · adesivo {String(e.variant + 1).padStart(3, '0')} de {STICKERS.length}. Ninguém mais recebe um igual.</p>
                </div>
              </div>
              <div className="space-y-3 px-6 pb-6">
                <a href={novo} className="block break-all text-sm underline">{novo}</a>
                <div className="flex flex-wrap gap-4"><button onClick={() => compartilhar(novo)} className="text-sm font-semibold">Compartilhar</button><button onClick={() => baixarArte(novo)} className="text-sm font-semibold">Baixar arte</button><button onClick={() => copiar(novo)} className="text-sm font-semibold">Copiar link</button></div>
              </div>
            </section>
          );
        })()}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Links gerados</h2>
          {!invites.length ? <p className="text-sm text-zinc-500">Você ainda não gerou nenhum convite.</p> : invites.map((i) => {
            const e = inviteEdition(tokenOf(i.link));
            return (
            <div key={i.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <img src={inviteImage(tokenOf(i.link))} width={1200} height={630} alt={`Prévia do convite ${e.serialLabel}, ${e.theme.nome}`} className="mb-3 w-full rounded-lg" loading="lazy" />
              <p className="mb-3 text-xs uppercase tracking-[.2em] text-zinc-400">{e.theme.nome} · {e.serialLabel} · adesivo {String(e.variant + 1).padStart(3, '0')}/{STICKERS.length}</p>
              <div className="flex items-center justify-between gap-3">
                <span className={i.status === 'pending' ? 'text-emerald-400 text-sm' : 'text-zinc-500 text-sm'}>
                  {i.status === 'pending' ? 'Disponível' : i.status === 'used' ? 'Usado' : 'Revogado'}
                </span>
                {i.status === 'pending' && <div className="flex flex-wrap justify-end gap-4"><button onClick={() => compartilhar(i.link)} className="text-sm font-semibold text-emerald-400">Compartilhar</button><button onClick={() => baixarArte(i.link)} className="text-sm font-semibold text-emerald-400">Baixar arte</button><button onClick={() => copiar(i.link)} className="text-sm font-semibold text-emerald-400">Copiar link</button></div>}
              </div>
              <a href={i.link} className="mt-2 block break-all text-xs text-emerald-400 underline">{i.link}</a>
            </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
