'use client';

// Agenda pessoal: eventos que o usuário salvou/confirmou.
// Persistida em localStorage para funcionar mesmo sem login; quando houver
// sessão, o mesmo formato pode ser sincronizado com o Supabase.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'nexo:agenda:v1';

interface AgendaContextValue {
  /** IDs dos eventos salvos. */
  saved: string[];
  ready: boolean;
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
}

const AgendaContext = createContext<AgendaContextValue | null>(null);

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function AgendaProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSaved(read());
    setReady(true);
  }, []);

  const persist = useCallback((next: string[]) => {
    setSaved(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível — mantém em memória */
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const current = read();
      persist(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(read().filter((x) => x !== id));
    },
    [persist],
  );

  const value = useMemo<AgendaContextValue>(
    () => ({ saved, ready, isSaved: (id) => saved.includes(id), toggle, remove }),
    [saved, ready, toggle, remove],
  );

  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda(): AgendaContextValue {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error('useAgenda deve ser usado dentro de <AgendaProvider>');
  return ctx;
}
