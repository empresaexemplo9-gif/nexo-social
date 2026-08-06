'use client';

import React, { useMemo, useState } from 'react';
import Icon from './icons';
import { MESES_CURTOS, summarizeYear, useReading, type ReadingEntry, type ReadingStatus } from '@/lib/reading';
import { usePreferences } from '@/lib/preferences';

const STATUS_LABEL: Record<ReadingStatus, string> = {
  'quero-ler': 'Quero ler',
  lendo: 'Lendo',
  lido: 'Lido',
};

function Stars({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          aria-label={`${n} de 5`}
          className={n <= (value ?? 0) ? 'text-clay-300' : 'text-zinc-700 hover:text-zinc-500'}
        >
          <Icon name={n <= (value ?? 0) ? 'starFilled' : 'star'} size={14} />
        </button>
      ))}
    </div>
  );
}

function EntryRow({ entry }: { entry: ReadingEntry }) {
  const { update, remove } = useReading();
  const [aberto, setAberto] = useState(false);

  return (
    <li className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-3">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 ${
            entry.kind === 'audiolivro' ? 'text-clay-300' : 'text-emerald-400'
          }`}
        >
          <Icon name={entry.kind === 'audiolivro' ? 'headphones' : 'book'} size={16} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-50">{entry.title}</p>
          <p className="truncate text-xs text-zinc-500">
            {entry.author || 'Autoria não informada'}
            {entry.finishedAt && ` · concluído em ${entry.finishedAt.split('-').reverse().slice(0, 2).join('/')}`}
          </p>
        </div>

        <select
          value={entry.status}
          onChange={(e) => update(entry.id, { status: e.target.value as ReadingStatus })}
          className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/80 px-2 py-1.5 text-[11px] text-zinc-200 focus:border-emerald-600 focus:outline-none"
        >
          {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <button
          onClick={() => setAberto((v) => !v)}
          className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:text-zinc-200"
          aria-label="Detalhes"
        >
          <Icon name="chevronRight" size={15} className={aberto ? 'rotate-90 transition' : 'transition'} />
        </button>
      </div>

      {aberto && (
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-zinc-800 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">Nota</span>
            <Stars value={entry.rating} onChange={(n) => update(entry.id, { rating: n })} />
          </div>
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
            >
              Abrir na fonte <Icon name="external" size={11} />
            </a>
          )}
          <button
            onClick={() => remove(entry.id)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-red-300"
          >
            <Icon name="trash" size={12} /> Remover
          </button>
        </div>
      )}
    </li>
  );
}

function AddForm() {
  const { add } = useReading();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [kind, setKind] = useState<'livro' | 'audiolivro'>('livro');
  const [status, setStatus] = useState<ReadingStatus>('lido');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await add({ title: title.trim(), author: author.trim() || null, kind, status });
    setTitle('');
    setAuthor('');
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
        className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-600 focus:outline-none"
      />
      <input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Autor(a)"
        className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-600 focus:outline-none"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as 'livro' | 'audiolivro')}
        className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-200 focus:border-emerald-600 focus:outline-none"
      >
        <option value="livro">Livro</option>
        <option value="audiolivro">Audiolivro</option>
      </select>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as ReadingStatus)}
        className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-200 focus:border-emerald-600 focus:outline-none"
      >
        {(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
      >
        <Icon name="plus" size={15} /> Adicionar
      </button>
    </form>
  );
}

/**
 * "Livros que li esse ano": contador, meta anual, distribuição por mês e as
 * listas de lendo / quero ler. Funciona sem conta (localStorage) e sincroniza
 * quando o usuário está logado.
 */
export default function ReadingYear() {
  const { entries, ready, synced } = useReading();
  const { prefs, save } = usePreferences();
  const ano = new Date().getFullYear();
  const resumo = useMemo(() => summarizeYear(entries, ano), [entries, ano]);

  // A meta vale no aparelho na hora e sobe para a conta em seguida.
  const setMeta = (n: number) => {
    const meta = Math.max(1, Math.min(365, n || 1));
    save({ readingGoal: meta });
    fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readingGoal: meta }),
    }).catch(() => {
      /* sem conta ou offline — fica só no aparelho */
    });
  };

  const meta = prefs.readingGoal ?? 12;
  const concluidos = resumo.lidos.length;
  const progresso = Math.min(100, meta > 0 ? Math.round((concluidos / meta) * 100) : 0);
  const maxMes = Math.max(1, ...resumo.porMes);

  if (!ready) return <p className="text-sm text-zinc-400">Abrindo seu registro…</p>;

  return (
    <div className="space-y-6">
      {/* Contador e meta */}
      <div className="card-soft texture-grain relative overflow-hidden p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Em {ano}</p>
            <p className="mt-1 font-display text-4xl font-semibold text-zinc-50">
              {concluidos} <span className="text-lg font-normal text-zinc-400">de {meta}</span>
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {resumo.totalLivros} {resumo.totalLivros === 1 ? 'livro' : 'livros'} · {resumo.totalAudiolivros}{' '}
              {resumo.totalAudiolivros === 1 ? 'audiolivro' : 'audiolivros'}
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-400">
            Meta do ano
            <input
              type="number"
              min={1}
              max={365}
              value={meta}
              onChange={(e) => setMeta(Number(e.target.value))}
              className="w-20 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progresso}%` }} />
        </div>

        {/* Distribuição por mês */}
        <div className="mt-6 flex items-end gap-1.5">
          {resumo.porMes.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-zinc-600">{n || ''}</span>
              <div
                className={`w-full rounded-t-md ${n ? 'bg-emerald-500/70' : 'bg-zinc-800'}`}
                style={{ height: `${Math.max(4, (n / maxMes) * 48)}px` }}
              />
              <span className="text-[9px] uppercase text-zinc-600">{MESES_CURTOS[i]}</span>
            </div>
          ))}
        </div>

        {!synced && (
          <p className="mt-5 flex items-start gap-2 text-[11px] text-zinc-500">
            <Icon name="alert" size={12} className="mt-0.5 shrink-0" />
            Salvo neste aparelho. Entre na sua conta para o registro acompanhar você em qualquer lugar.
          </p>
        )}
      </div>

      {/* Adicionar */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">Adicionar ao registro</h3>
        <AddForm />
      </div>

      {/* Listas */}
      {resumo.lendo.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">Lendo agora ({resumo.lendo.length})</h3>
          <ul className="space-y-2">
            {resumo.lendo.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">Concluídos em {ano} ({concluidos})</h3>
        {concluidos === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
            Nenhum título concluído ainda este ano. Adicione acima ou pegue algo na estante liberada.
          </p>
        ) : (
          <ul className="space-y-2">
            {resumo.lidos.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </div>

      {resumo.queroLer.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">Quero ler ({resumo.queroLer.length})</h3>
          <ul className="space-y-2">
            {resumo.queroLer.map((e) => (
              <EntryRow key={e.id} entry={e} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
