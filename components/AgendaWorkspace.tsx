'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { formatEventDateLong, relativeLabel } from '@/lib/datetime';

type Tab = 'compromissos' | 'recados' | 'contatos';
type ParticipantStatus = 'pendente' | 'confirmado' | 'recusado';

interface Participant {
  userId: string;
  name: string | null;
  email: string | null;
  status: ParticipantStatus;
}
interface Appointment {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  city: string | null;
  isGroup: boolean;
  ownerId: string;
  ownerName: string | null;
  role: 'dono' | 'convidado';
  myStatus: ParticipantStatus | null;
  participants: Participant[];
}
interface Message {
  id: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  direction: 'recebido' | 'enviado';
  withName: string | null;
  withEmail: string | null;
}
interface Contact {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  status: 'pendente' | 'aceito' | 'recusado';
  direction: 'enviado' | 'recebido';
}

const STATUS_STYLE: Record<ParticipantStatus, string> = {
  pendente: 'bg-zinc-800 text-zinc-300',
  confirmado: 'bg-emerald-950/70 text-emerald-300',
  recusado: 'bg-clay-950/70 text-clay-300',
};

function Feedback({ error, info }: { error?: string; info?: string }) {
  if (!error && !info) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border p-3 text-xs ${
        error ? 'border-clay-800/60 bg-clay-950/25 text-clay-200' : 'border-emerald-900/60 bg-emerald-950/25 text-emerald-200'
      }`}
    >
      <Icon name={error ? 'alert' : 'check'} size={14} className="mt-0.5 shrink-0" />
      <span>{error || info}</span>
    </div>
  );
}

export default function AgendaWorkspace() {
  const [tab, setTab] = useState<Tab>('compromissos');
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'anon' | 'off'>('loading');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // formulário de compromisso
  const [form, setForm] = useState({ title: '', startsAt: '', location: '', description: '', participants: '' });
  // recado
  const [msg, setMsg] = useState({ email: '', body: '' });
  // contato
  const [contactEmail, setContactEmail] = useState('');

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/agenda/appointments');
      if (res.status === 401) {
        setAuthState('anon');
        return;
      }
      if (res.status === 503) {
        setAuthState('off');
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setAppointments(json.appointments || []);
      setAuthState('ok');

      const [m, c] = await Promise.all([fetch('/api/agenda/messages'), fetch('/api/agenda/contacts')]);
      if (m.ok) setMessages((await m.json()).messages || []);
      if (c.ok) setContacts((await c.json()).contacts || []);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar a agenda.');
      setAuthState('ok');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const post = async (url: string, body: unknown, method = 'POST') => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 207) throw new Error(json.error || `HTTP ${res.status}`);
      if (json.warning) setInfo(json.warning);
      return json;
    } catch (e: any) {
      setError(e?.message || 'Falha na operação.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const createAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = form.participants.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const json = await post('/api/agenda/appointments', {
      title: form.title,
      startsAt: form.startsAt,
      location: form.location,
      description: form.description,
      participants: emails,
    });
    if (json) {
      if (!json.warning) setInfo(emails.length ? `Compromisso criado e ${json.invited?.length ?? 0} pessoa(s) marcada(s).` : 'Compromisso criado.');
      setForm({ title: '', startsAt: '', location: '', description: '', participants: '' });
      loadAll();
    }
  };

  const respond = async (appointmentId: string, status: 'confirmado' | 'recusado') => {
    const json = await post('/api/agenda/rsvp', { appointmentId, status });
    if (json) {
      setInfo(status === 'confirmado' ? 'Presença confirmada.' : 'Compromisso desmarcado.');
      loadAll();
    }
  };

  const removeAppointment = async (id: string) => {
    const json = await post(`/api/agenda/appointments/${id}`, null, 'DELETE');
    if (json) {
      setInfo('Compromisso excluído.');
      loadAll();
    }
  };

  if (authState === 'loading') return <p className="text-sm text-zinc-400">Carregando sua agenda…</p>;

  if (authState === 'off') {
    return (
      <div className="rounded-3xl border border-clay-800/50 bg-clay-950/20 p-6 text-sm text-clay-200">
        A agenda compartilhada precisa do Supabase configurado.
      </div>
    );
  }

  if (authState === 'anon') {
    return (
      <div className="card-soft p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-700 text-emerald-400">
          <Icon name="calendarCheck" size={22} />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-zinc-50">Entre para usar sua agenda</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-300">
          Compromissos, convites em grupo, recados e notificações são vinculados à sua conta.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
        >
          Entrar ou criar conta <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    );
  }

  const pendingInvites = appointments.filter((a) => a.role === 'convidado' && a.myStatus === 'pendente');

  return (
    <div className="space-y-6">
      {/* Abas */}
      <div className="flex flex-wrap gap-2">
        {([
          ['compromissos', 'Compromissos', 'calendar'],
          ['recados', 'Recados', 'sparkles'],
          ['contatos', 'Contatos', 'user'],
        ] as [Tab, string, 'calendar' | 'sparkles' | 'user'][]).map(([id, label, icon]) => {
          const badge =
            id === 'recados'
              ? messages.filter((m) => m.direction === 'recebido' && !m.readAt).length
              : id === 'compromissos'
                ? pendingInvites.length
                : contacts.filter((c) => c.direction === 'recebido' && c.status === 'pendente').length;
          return (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setError('');
                setInfo('');
                if (id === 'recados') fetch('/api/agenda/messages', { method: 'PATCH' });
              }}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
                tab === id ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-zinc-50'
              }`}
            >
              <Icon name={icon} size={16} /> {label}
              {badge > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === id ? 'bg-zinc-950/20' : 'bg-clay-500 text-zinc-950'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Feedback error={error} info={info} />

      {/* ------------------------------- COMPROMISSOS */}
      {tab === 'compromissos' && (
        <div className="space-y-6">
          {/* Novo compromisso */}
          <form onSubmit={createAppointment} className="card-soft space-y-3 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-50">
              <Icon name="plus" size={16} className="text-emerald-400" /> Novo compromisso
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                required
                placeholder="Título (ex.: Jantar com a equipe)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
              <input
                required
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <input
              placeholder="Local (opcional)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
            />
            <textarea
              rows={2}
              placeholder="Detalhes (opcional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
            />
            <div>
              <input
                placeholder="Marcar pessoas: e-mails separados por vírgula"
                value={form.participants}
                onChange={(e) => setForm({ ...form, participants: e.target.value })}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Quem for marcado recebe uma notificação e só precisa <strong>confirmar</strong> ou <strong>desmarcar</strong>.
              </p>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? 'Salvando…' : 'Criar compromisso'}
            </button>
          </form>

          {/* Lista */}
          {appointments.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
              Nenhum compromisso ainda. Crie o primeiro acima.
            </p>
          ) : (
            <ul className="space-y-3">
              {appointments.map((a) => (
                <li key={a.id} className="card-soft p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                          <Icon name="clock" size={12} /> {relativeLabel(a.startsAt, a.endsAt ?? undefined)}
                        </span>
                        <span className="text-zinc-500">{formatEventDateLong(a.startsAt)}</span>
                        {a.isGroup && (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">grupo</span>
                        )}
                        <span className="rounded-full bg-zinc-800/70 px-2 py-0.5 text-zinc-400">
                          {a.role === 'dono' ? 'você criou' : `de ${a.ownerName ?? 'alguém'}`}
                        </span>
                      </div>
                      <h4 className="mt-1.5 text-base font-semibold text-zinc-50">{a.title}</h4>
                      {a.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                          <Icon name="mapPin" size={12} /> {a.location}
                        </p>
                      )}
                      {a.description && <p className="mt-2 text-xs leading-relaxed text-zinc-300">{a.description}</p>}
                    </div>

                    {/* Ações: convidado confirma/desmarca; dono exclui */}
                    {a.role === 'convidado' ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => respond(a.id, 'confirmado')}
                          disabled={busy || a.myStatus === 'confirmado'}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            a.myStatus === 'confirmado'
                              ? 'border border-emerald-700 text-emerald-400'
                              : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                          } disabled:opacity-60`}
                        >
                          <Icon name="check" size={14} /> {a.myStatus === 'confirmado' ? 'Confirmado' : 'Confirmar'}
                        </button>
                        <button
                          onClick={() => respond(a.id, 'recusado')}
                          disabled={busy || a.myStatus === 'recusado'}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-clay-600 hover:text-clay-300 disabled:opacity-60"
                        >
                          <Icon name="close" size={14} /> {a.myStatus === 'recusado' ? 'Desmarcado' : 'Desmarcar'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => removeAppointment(a.id)}
                        disabled={busy}
                        className="shrink-0 rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition hover:border-clay-700 hover:text-clay-300"
                      >
                        Excluir
                      </button>
                    )}
                  </div>

                  {/* Participantes e suas respostas */}
                  {a.participants.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-zinc-800/70 pt-3">
                      {a.participants.map((p) => (
                        <span
                          key={p.userId}
                          className={`rounded-full px-2.5 py-1 text-[11px] ${STATUS_STYLE[p.status]}`}
                          title={p.email ?? undefined}
                        >
                          {p.name || p.email} · {p.status}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ----------------------------------- RECADOS */}
      {tab === 'recados' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const json = await post('/api/agenda/messages', msg);
              if (json) {
                setInfo('Recado enviado.');
                setMsg({ email: '', body: '' });
                loadAll();
              }
            }}
            className="card-soft space-y-3 p-5"
          >
            <h3 className="text-sm font-semibold text-zinc-50">Enviar recado</h3>
            <input
              required
              type="email"
              placeholder="E-mail de quem vai receber"
              value={msg.email}
              onChange={(e) => setMsg({ ...msg, email: e.target.value })}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
            />
            <textarea
              required
              rows={3}
              placeholder="Sua mensagem"
              value={msg.body}
              onChange={(e) => setMsg({ ...msg, body: e.target.value })}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? 'Enviando…' : 'Enviar'}
            </button>
          </form>

          {messages.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
              Sua caixa de recados está vazia.
            </p>
          ) : (
            <ul className="space-y-2">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-2xl border p-4 ${
                    m.direction === 'recebido' && !m.readAt ? 'border-emerald-900/60 bg-emerald-950/15' : 'border-zinc-800 bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                    <span>
                      {m.direction === 'recebido' ? 'de' : 'para'}{' '}
                      <span className="text-zinc-300">{m.withName || m.withEmail}</span>
                    </span>
                    <span>{formatEventDateLong(m.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-zinc-200">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---------------------------------- CONTATOS */}
      {tab === 'contatos' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const json = await post('/api/agenda/contacts', { email: contactEmail });
              if (json) {
                setInfo('Convite de contato enviado.');
                setContactEmail('');
                loadAll();
              }
            }}
            className="card-soft space-y-3 p-5"
          >
            <h3 className="text-sm font-semibold text-zinc-50">Adicionar alguém à minha agenda</h3>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                required
                type="email"
                placeholder="e-mail da pessoa"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                Adicionar
              </button>
            </div>
          </form>

          {contacts.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-400">
              Nenhum contato ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{c.name || c.email}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {c.email} · {c.status} · {c.direction}
                    </p>
                  </div>
                  {c.direction === 'recebido' && c.status === 'pendente' && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await post('/api/agenda/contacts', { id: c.id, status: 'aceito' }, 'PATCH');
                          loadAll();
                        }}
                        className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950"
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={async () => {
                          await post('/api/agenda/contacts', { id: c.id, status: 'recusado' }, 'PATCH');
                          loadAll();
                        }}
                        className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
