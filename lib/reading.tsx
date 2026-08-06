'use client';

// "Livros que li esse ano" — registro pessoal de leituras e audiolivros.
//
// Funciona em dois modos, sem o usuário perceber a diferença:
//   - conectado: a fonte da verdade é a tabela `reading_log` no Supabase;
//   - sem conta (ou Supabase indisponível): tudo fica em localStorage.
// Em ambos os casos as alterações são aplicadas na hora e sincronizadas
// depois, então marcar um livro como lido nunca trava esperando a rede.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ReadingKind = 'livro' | 'audiolivro';
export type ReadingStatus = 'quero-ler' | 'lendo' | 'lido';

export interface ReadingEntry {
  id: string;
  title: string;
  author: string | null;
  kind: ReadingKind;
  status: ReadingStatus;
  source: string | null;
  externalId: string | null;
  url: string | null;
  coverUrl: string | null;
  rating: number | null;
  notes: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export type NewReading = Omit<ReadingEntry, 'id'>;

const STORAGE_KEY = 'nexo:leituras:v1';

/** Converte a linha do Supabase para o formato do cliente. */
function fromRow(r: any): ReadingEntry {
  return {
    id: r.id,
    title: r.title,
    author: r.author ?? null,
    kind: r.kind === 'audiolivro' ? 'audiolivro' : 'livro',
    status: (['quero-ler', 'lendo', 'lido'] as const).includes(r.status) ? r.status : 'lido',
    source: r.source ?? null,
    externalId: r.external_id ?? null,
    url: r.url ?? null,
    coverUrl: r.cover_url ?? null,
    rating: r.rating ?? null,
    notes: r.notes ?? null,
    startedAt: r.started_at ?? null,
    finishedAt: r.finished_at ?? null,
  };
}

function readStorage(): ReadingEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(entries: ReadingEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* armazenamento indisponível — segue só em memória */
  }
}

interface ReadingContextValue {
  entries: ReadingEntry[];
  ready: boolean;
  /** true quando o registro está salvo na conta (e não apenas no aparelho). */
  synced: boolean;
  add: (entry: Partial<NewReading> & { title: string }) => Promise<void>;
  update: (id: string, patch: Partial<ReadingEntry>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Já está no registro? Usado pelos botões das estantes. */
  find: (source: string, externalId: string) => ReadingEntry | undefined;
}

const ReadingContext = createContext<ReadingContextValue | null>(null);

export function ReadingProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<ReadingEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [synced, setSynced] = useState(false);

  // Carrega local primeiro (instantâneo) e tenta o servidor em seguida.
  useEffect(() => {
    setEntries(readStorage());
    setReady(true);
    (async () => {
      try {
        const res = await fetch('/api/leituras');
        if (!res.ok) return; // 401/503 => segue no modo local
        const json = await res.json();
        const remotas = (json.leituras ?? []).map(fromRow) as ReadingEntry[];
        setEntries(remotas);
        writeStorage(remotas);
        setSynced(true);
      } catch {
        /* offline — segue no modo local */
      }
    })();
  }, []);

  const persist = useCallback((next: ReadingEntry[]) => {
    setEntries(next);
    writeStorage(next);
  }, []);

  const add = useCallback<ReadingContextValue['add']>(
    async (input) => {
      const entry: ReadingEntry = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: input.title,
        author: input.author ?? null,
        kind: input.kind ?? 'livro',
        status: input.status ?? 'lido',
        source: input.source ?? null,
        externalId: input.externalId ?? null,
        url: input.url ?? null,
        coverUrl: input.coverUrl ?? null,
        rating: input.rating ?? null,
        notes: input.notes ?? null,
        startedAt: input.startedAt ?? null,
        finishedAt:
          input.finishedAt ?? ((input.status ?? 'lido') === 'lido' ? new Date().toISOString().slice(0, 10) : null),
      };

      // Evita duplicar a mesma obra da mesma fonte.
      const atual = readStorage();
      const jaTem =
        entry.source && entry.externalId
          ? atual.find((e) => e.source === entry.source && e.externalId === entry.externalId)
          : undefined;
      if (jaTem) return;

      persist([entry, ...atual]);

      try {
        const res = await fetch('/api/leituras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        if (res.ok) {
          const { leitura } = await res.json();
          // Troca o id local pelo id real do banco.
          persist([fromRow(leitura), ...readStorage().filter((e) => e.id !== entry.id)]);
          setSynced(true);
        }
      } catch {
        /* fica salvo localmente */
      }
    },
    [persist],
  );

  const update = useCallback<ReadingContextValue['update']>(
    async (id, patch) => {
      const next = readStorage().map((e) =>
        e.id === id
          ? {
              ...e,
              ...patch,
              // Concluir preenche a data; voltar para "lendo"/"quero ler" a limpa.
              finishedAt:
                patch.status === 'lido'
                  ? (patch.finishedAt ?? e.finishedAt ?? new Date().toISOString().slice(0, 10))
                  : patch.status
                    ? null
                    : (patch.finishedAt ?? e.finishedAt),
            }
          : e,
      );
      persist(next);

      if (id.startsWith('local-')) return; // ainda não existe no banco
      try {
        await fetch('/api/leituras', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...patch }),
        });
      } catch {
        /* mantém a alteração local */
      }
    },
    [persist],
  );

  const remove = useCallback<ReadingContextValue['remove']>(
    async (id) => {
      persist(readStorage().filter((e) => e.id !== id));
      if (id.startsWith('local-')) return;
      try {
        await fetch(`/api/leituras?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch {
        /* mantém a remoção local */
      }
    },
    [persist],
  );

  const find = useCallback<ReadingContextValue['find']>(
    (source, externalId) => entries.find((e) => e.source === source && e.externalId === externalId),
    [entries],
  );

  const value = useMemo<ReadingContextValue>(
    () => ({ entries, ready, synced, add, update, remove, find }),
    [entries, ready, synced, add, update, remove, find],
  );

  return <ReadingContext.Provider value={value}>{children}</ReadingContext.Provider>;
}

export function useReading(): ReadingContextValue {
  const ctx = useContext(ReadingContext);
  if (!ctx) throw new Error('useReading deve ser usado dentro de <ReadingProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Agregações usadas pela área "Livros que li esse ano"
// ---------------------------------------------------------------------------

export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export interface YearSummary {
  ano: number;
  lidos: ReadingEntry[];
  lendo: ReadingEntry[];
  queroLer: ReadingEntry[];
  totalLivros: number;
  totalAudiolivros: number;
  /** Quantidade de obras concluídas por mês (índice 0 = janeiro). */
  porMes: number[];
}

export function summarizeYear(entries: ReadingEntry[], ano: number): YearSummary {
  const doAno = entries.filter((e) => e.status === 'lido' && e.finishedAt?.startsWith(String(ano)));
  const porMes = Array<number>(12).fill(0);
  for (const e of doAno) {
    const m = Number(e.finishedAt!.slice(5, 7)) - 1;
    if (m >= 0 && m < 12) porMes[m]++;
  }
  return {
    ano,
    lidos: doAno,
    lendo: entries.filter((e) => e.status === 'lendo'),
    queroLer: entries.filter((e) => e.status === 'quero-ler'),
    totalLivros: doAno.filter((e) => e.kind === 'livro').length,
    totalAudiolivros: doAno.filter((e) => e.kind === 'audiolivro').length,
    porMes,
  };
}
