'use client';

import React, { useEffect, useState } from 'react';
import Icon from './icons';
import { moeda, type TipoIngresso } from '@/lib/bilheteria';

// Cadastro de lotes de ingresso — é o que liga a venda de um evento na
// plataforma. Sem nenhum lote cadastrado, a página do evento continua
// mostrando a bilheteria de origem, e nada muda.

interface EventoOpcao {
  id: string;
  title: string;
  date: string;
  city: string;
}

const VAZIO = { name: '', description: '', preco: '', quantity: '50', maxPerOrder: '5' };

export default function AdminIngressos({ demo }: { demo: boolean }) {
  const [eventos, setEventos] = useState<EventoOpcao[]>([]);
  const [eventoId, setEventoId] = useState('');
  const [tipos, setTipos] = useState<TipoIngresso[]>([]);
  const [form, setForm] = useState(VAZIO);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        const lista: EventoOpcao[] = (d?.events ?? []).map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          city: e.city,
        }));
        setEventos(lista);
        if (lista.length) setEventoId((atual) => atual || lista[0].id);
      })
      .catch(() => setErro('Não foi possível carregar os eventos.'));
  }, []);

  useEffect(() => {
    if (!eventoId) return;
    carregar(eventoId);
  }, [eventoId]);

  async function carregar(id: string) {
    setErro('');
    try {
      const res = await fetch(`/api/ingressos/tipos?event=${encodeURIComponent(id)}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Falha ao carregar.');
      setTipos(d.tipos ?? []);
    } catch (e: any) {
      setErro(e.message);
      setTipos([]);
    }
  }

  /** "80", "80,00" e "80.00" viram 8000 centavos. */
  function paraCentavos(texto: string): number {
    const limpo = texto.replace(/[^\d,.]/g, '').replace(',', '.');
    return Math.round((Number(limpo) || 0) * 100);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setErro('');
    setOcupado(true);
    try {
      const res = await fetch('/api/ingressos/tipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventoId,
          name: form.name,
          description: form.description || null,
          priceCents: paraCentavos(form.preco),
          quantity: Number(form.quantity) || 0,
          maxPerOrder: Number(form.maxPerOrder) || 5,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? 'Falha ao criar o lote.');
      setForm(VAZIO);
      setMsg(`Lote "${d.tipo.name}" criado — a venda já aparece na página do evento.`);
      carregar(eventoId);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  async function alternar(t: TipoIngresso) {
    setErro('');
    const res = await fetch('/api/ingressos/tipos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, active: !t.active }),
    });
    if (!res.ok) setErro((await res.json())?.error ?? 'Falha ao alterar.');
    carregar(eventoId);
  }

  async function apagar(t: TipoIngresso) {
    setErro('');
    const res = await fetch(`/api/ingressos/tipos?id=${t.id}`, { method: 'DELETE' });
    if (!res.ok) setErro((await res.json())?.error ?? 'Falha ao apagar.');
    carregar(eventoId);
  }

  const campo =
    'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500';

  return (
    <div className="space-y-5">
      {demo && (
        <p className="rounded-xl border border-clay-800 bg-clay-950/30 p-3 text-sm text-clay-200">
          Modo demonstração: configure o Supabase para os lotes serem salvos.
        </p>
      )}

      <label className="block">
        <span className="text-xs uppercase tracking-wide text-zinc-500">Evento</span>
        <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} className={`${campo} mt-1`}>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} — {e.date} · {e.city}
            </option>
          ))}
        </select>
      </label>

      {tipos.length > 0 && (
        <ul className="space-y-2">
          {tipos.map((t) => (
            <li key={t.id} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-zinc-100">{t.name}</p>
                {!t.active && (
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">
                    pausado
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span className="font-mono text-emerald-300">{moeda(t.price_cents)}</span>
                <span>
                  {t.sold}/{t.quantity} vendidos
                </span>
                <span>até {t.max_per_order} por pedido</span>
                <span className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => alternar(t)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 font-medium text-zinc-200"
                  >
                    {t.active ? 'Pausar' : 'Retomar'}
                  </button>
                  {t.sold === 0 && (
                    <button
                      type="button"
                      onClick={() => apagar(t)}
                      aria-label={`Apagar o lote ${t.name}`}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-400 hover:border-red-800 hover:text-red-400"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={criar} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm font-semibold text-zinc-100">Novo lote</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Nome</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Pista, Inteira, Meia…"
              required
              className={`${campo} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Preço (R$) — 0 é gratuito</span>
            <input
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              placeholder="0,00"
              inputMode="decimal"
              className={`${campo} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Quantidade</span>
            <input
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              inputMode="numeric"
              className={`${campo} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Máximo por pedido</span>
            <input
              value={form.maxPerOrder}
              onChange={(e) => setForm({ ...form, maxPerOrder: e.target.value })}
              inputMode="numeric"
              className={`${campo} mt-1`}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Descrição (opcional)</span>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Setor A, numerada, meia-entrada mediante comprovação…"
            className={`${campo} mt-1`}
          />
        </label>

        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <button
          type="submit"
          disabled={ocupado || !eventoId}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {ocupado ? 'Criando…' : 'Criar lote'}
        </button>
      </form>

      <p className="text-xs text-zinc-500">
        Ingresso gratuito é confirmado na hora, sem provedor de pagamento. Ingresso pago cobra por PIX e precisa da
        MERCADOPAGO_ACCESS_TOKEN configurada — confira em Integrações.
      </p>
    </div>
  );
}
