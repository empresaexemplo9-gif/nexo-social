'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../icons';

type Msg = { id: string; authorId: string; authorName: string; body: string; fromMe: boolean; createdAt: string };

export default function ChatDoGrupo({ groupId }: { groupId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/comunidade/grupos/${groupId}/chat`, { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErro(j.error || 'Falha ao carregar o chat.'); return; }
    setMessages(j.messages ?? []);
    setErro('');
  }, [groupId]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(t);
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true); setBody('');
    const res = await fetch(`/api/comunidade/grupos/${groupId}/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErro(j.error || 'Falha ao enviar.'); setBody(text); }
    else await load();
    setBusy(false);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/50">
      <header className="border-b border-zinc-800 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100"><Icon name="chat" size={16} /> Chat do grupo</h3>
        <p className="text-xs text-zinc-500">Somente membros deste grupo podem ler e enviar mensagens.</p>
      </header>
      <div className="max-h-96 min-h-52 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && !erro && <p className="text-center text-xs text-zinc-500">Nenhuma mensagem ainda.</p>}
        {erro && <p className="text-xs text-clay-300">{erro}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.fromMe ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-100'}`}>
              {!m.fromMe && <p className="mb-1 text-[10px] font-semibold text-emerald-400">{m.authorName}</p>}
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.fromMe ? 'text-zinc-800/70' : 'text-zinc-500'}`}>{new Date(m.createdAt).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-zinc-800 p-3">
        <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="Mensagem para o grupo…"
          className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none" />
        <button disabled={!body.trim() || busy} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50">
          <Icon name="send" size={15} /> Enviar
        </button>
      </form>
    </section>
  );
}
