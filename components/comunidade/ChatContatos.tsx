'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from '../icons';
import Avatar from '../Avatar';
import PessoaPicker, { type Pessoa } from '../PessoaPicker';

type Contact = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  status: string;
  direction: 'enviado' | 'recebido';
};

type Message = { id: string; body: string; fromMe: boolean; createdAt: string; readAt: string | null };

export default function ChatContatos() {
  const search = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [incoming, setIncoming] = useState<Contact[]>([]);
  const [outgoing, setOutgoing] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [picker, setPicker] = useState<Pessoa[]>([]);
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const active = useMemo(() => contacts.find((c) => c.userId === selected) ?? null, [contacts, selected]);

  const loadContacts = useCallback(async () => {
    const res = await fetch('/api/comunidade/contatos', { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(j.error || 'Falha ao carregar seus contatos.'); return; }
    setContacts(j.contacts ?? []);
    setIncoming(j.incoming ?? []);
    setOutgoing(j.outgoing ?? []);
    const requested = search?.get('com') || null;
    if (requested && (j.contacts ?? []).some((c: Contact) => c.userId === requested)) setSelected(requested);
    else if (!selected && (j.contacts ?? []).length) setSelected(j.contacts[0].userId);
  }, [search, selected]);

  const loadMessages = useCallback(async () => {
    if (!selected) { setMessages([]); return; }
    const res = await fetch(`/api/comunidade/chat/${selected}`, { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(j.error || 'Falha ao carregar a conversa.'); return; }
    setMessages(j.messages ?? []);
  }, [selected]);

  useEffect(() => { void loadContacts(); }, [loadContacts]);
  useEffect(() => {
    void loadMessages();
    if (!selected) return;
    const timer = window.setInterval(() => void loadMessages(), 3000);
    return () => window.clearInterval(timer);
  }, [selected, loadMessages]);

  const addContact = async () => {
    const p = picker[0];
    if (!p) return;
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/comunidade/contatos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: p.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Falha ao adicionar contato.');
      setMessage(j.status === 'aceito' ? 'Essa pessoa já está nos seus contatos.' : 'Pedido de contato enviado.');
      setPicker([]);
      await loadContacts();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const answer = async (id: string, action: 'accept' | 'decline' | 'remove') => {
    setBusy(true);
    try {
      const res = await fetch('/api/comunidade/contatos', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Falha ao atualizar contato.');
      if (action === 'remove' && active?.id === id) setSelected(null);
      await loadContacts();
    } catch (e: any) { setMessage(e.message); }
    finally { setBusy(false); }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !body.trim()) return;
    const text = body.trim();
    setBody('');
    const res = await fetch(`/api/comunidade/chat/${selected}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setMessage(j.error || 'Falha ao enviar.'); setBody(text); return; }
    await loadMessages();
  };

  return (
    <div className="space-y-5">
      {message && <p className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300">{message}</p>}

      {incoming.length > 0 && (
        <section className="rounded-2xl border border-emerald-900/50 bg-emerald-950/15 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Pedidos de contato</h2>
          <div className="mt-3 space-y-2">
            {incoming.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-zinc-900 p-3">
                <Avatar nome={c.name} tamanho={34} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{c.name}</p></div>
                <button disabled={busy} onClick={() => answer(c.id, 'accept')} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950">Aceitar</button>
                <button disabled={busy} onClick={() => answer(c.id, 'decline')} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300">Recusar</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card-soft p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Adicionar contato</h2>
        <p className="mt-1 text-xs text-zinc-500">Somente pessoas que já possuem conta na nexo.social aparecem aqui.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <PessoaPicker value={picker} onChange={(v) => setPicker(v.slice(-1))} excluir={[...contacts, ...incoming, ...outgoing].map((c) => c.userId)} placeholder="Buscar pessoa na plataforma" />
          </div>
          <button onClick={addContact} disabled={!picker.length || busy} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50">
            Adicionar
          </button>
        </div>
      </section>

      <div className="grid min-h-[32rem] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/60 md:grid-cols-[17rem_1fr]">
        <aside className="border-b border-zinc-800 md:border-b-0 md:border-r">
          <div className="border-b border-zinc-800 p-4">
            <h2 className="font-semibold text-zinc-100">Contatos</h2>
            <p className="text-xs text-zinc-500">Você tem {contacts.length} {contacts.length === 1 ? 'contato' : 'contatos'}. Esta contagem só aparece para você.</p>
          </div>
          <div className="max-h-[32rem] overflow-y-auto p-2">
            {contacts.length === 0 ? (
              <p className="p-3 text-xs text-zinc-500">Aceite ou adicione um contato para começar uma conversa.</p>
            ) : contacts.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.userId)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${selected === c.userId ? 'bg-emerald-500/10 text-emerald-200' : 'text-zinc-200 hover:bg-zinc-900'}`}>
                <Avatar nome={c.name} tamanho={34} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[32rem] flex-col">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-500">Escolha um contato para conversar.</div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-zinc-800 p-4">
                <div className="flex items-center gap-3"><Avatar nome={active.name} tamanho={36} /><div><p className="font-semibold text-zinc-100">{active.name}</p><p className="text-xs text-zinc-500">Contato da sua conta</p></div></div>
                <button onClick={() => answer(active.id, 'remove')} className="text-xs text-zinc-500 hover:text-clay-300">Remover contato</button>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.length === 0 && <p className="text-center text-xs text-zinc-500">Nenhuma mensagem ainda. Comece a conversa.</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.fromMe ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-100'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.fromMe ? 'text-zinc-800/70' : 'text-zinc-500'}`}>{new Date(m.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-zinc-800 p-3">
                <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="Escreva uma mensagem…"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none" />
                <button disabled={!body.trim()} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50">
                  <Icon name="send" size={15} /> Enviar
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
