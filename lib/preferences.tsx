'use client';

// Preferências do usuário (resultado do questionário de interesses).
//
// A resposta vive em dois lugares, de propósito:
//   • localStorage — para a personalização funcionar na hora, offline e sem
//     conta (modo demonstração);
//   • tabela `user_preferences` — para a resposta seguir a CONTA, e não o
//     aparelho. Sem isso o questionário "sempre volta": outro navegador, o app
//     instalado, uma aba anônima ou uma limpeza de dados apagavam o perfil e a
//     plataforma pedia tudo de novo.
//
// Ao abrir, o aparelho responde primeiro (instantâneo) e a conta manda em
// seguida. Quem respondeu deslogado não perde nada: a resposta local sobe para
// a conta assim que houver login.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CategorySlug } from './data';

export type Frequency = 'diaria' | 'semanal' | 'mensal';

export interface UserPreferences {
  interests: CategorySlug[];
  /** Subtemas escolhidos dentro de cada tema (afina a indicação). */
  subtopics: string[];
  /** Gêneros musicais — alimentam a trilha do Spotify. */
  musicGenres: string[];
  /** Gêneros de cinema e séries. */
  filmGenres: string[];
  /** Gêneros literários. */
  bookGenres: string[];
  /** Hobbies praticados. */
  hobbies: string[];
  /** Meta de obras concluídas no ano ("livros que li esse ano"). */
  readingGoal: number;
  city: string | null;
  radiusKm: number;
  frequency: Frequency;
  completedAt: string | null;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  interests: [],
  subtopics: [],
  musicGenres: [],
  filmGenres: [],
  bookGenres: [],
  hobbies: [],
  readingGoal: 12,
  city: null,
  radiusKm: 50,
  frequency: 'semanal',
  completedAt: null,
};

const STORAGE_KEY = 'nexo:prefs:v1';
/** De quem é o perfil guardado neste aparelho (id da conta que o sincronizou). */
const OWNER_KEY = 'nexo:prefs:owner';

/** Como o salvamento na conta terminou — o questionário usa para avisar. */
export type SaveResult =
  | { ok: true; scope: 'conta' }
  /** Sem conta ou sem backend: ficou salvo só neste aparelho (não é erro). */
  | { ok: true; scope: 'aparelho' }
  | { ok: false; error: string };

interface PreferencesContextValue {
  prefs: UserPreferences;
  ready: boolean;
  hasCompleted: boolean;
  /** true quando o perfil está salvo na conta (e não apenas no aparelho). */
  synced: boolean;
  save: (patch: Partial<UserPreferences>) => Promise<SaveResult>;
  complete: (prefs: Partial<UserPreferences>) => Promise<SaveResult>;
  reset: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readStorage(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function readOwner(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId: string) {
  try {
    window.localStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* armazenamento indisponível */
  }
}

/** Envia o perfil para a conta. Erro de rede/sem login não quebra o app. */
async function pushToAccount(patch: Partial<UserPreferences>): Promise<SaveResult> {
  try {
    const res = await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    // 401 (sem login) e 503 (sem backend) são modos legítimos de uso:
    // a resposta continua valendo neste aparelho.
    if (res.status === 401 || res.status === 503) return { ok: true, scope: 'aparelho' };
    if (!res.ok) {
      const json = await res.json().catch(() => ({}) as { error?: string });
      return { ok: false, error: json.error || `Falha ao salvar (HTTP ${res.status}).` };
    }
    return { ok: true, scope: 'conta' };
  } catch {
    return { ok: false, error: 'Sem conexão com o servidor.' };
  }
}

/**
 * Junta o que está no aparelho com o que está na conta.
 *
 * A conta manda sempre que já tem um questionário concluído — é ela que vale em
 * todos os aparelhos. O que está no aparelho só prevalece quando a conta ainda
 * não tem resposta (respondeu antes de entrar), e nesse caso sobe para a conta.
 */
function merge(local: UserPreferences, remote: UserPreferences): UserPreferences {
  if (remote.completedAt) return remote;
  return local.completedAt ? local : { ...local, ...remote };
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [synced, setSynced] = useState(false);

  const persist = useCallback((next: UserPreferences) => {
    setPrefs(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível — mantém apenas em memória */
    }
  }, []);

  // Evita que a carga da conta atropele uma edição feita nesse meio-tempo.
  const editedRef = useRef(false);

  useEffect(() => {
    const local = readStorage();
    setPrefs(local);
    setReady(true);

    (async () => {
      let remote: UserPreferences | null = null;
      let userId = '';
      try {
        const res = await fetch('/api/preferences');
        if (!res.ok) return; // 401/503 => segue no modo aparelho
        const json = await res.json();
        userId = typeof json.userId === 'string' ? json.userId : '';
        remote = json.preferences ? { ...DEFAULT_PREFERENCES, ...json.preferences } : null;
      } catch {
        return; // offline — segue no modo aparelho
      }
      if (editedRef.current) return;

      // Perfil que ficou no aparelho de outra conta não pertence a esta.
      const owner = readOwner();
      const doOutro = Boolean(owner && userId && owner !== userId);
      const mine = doOutro ? DEFAULT_PREFERENCES : local;

      if (userId) writeOwner(userId);

      if (!remote) {
        // A conta ainda não tem perfil. Quem respondeu antes de entrar não
        // pode perder a resposta: ela sobe agora.
        if (mine.completedAt) {
          const r = await pushToAccount(mine);
          setSynced(r.ok && r.scope === 'conta');
        } else if (doOutro) {
          persist(DEFAULT_PREFERENCES);
        }
        return;
      }

      const merged = merge(mine, remote);
      persist(merged);
      setSynced(true);

      // O aparelho tinha uma resposta que a conta não tinha: sobe, senão o
      // questionário voltaria no próximo aparelho.
      if (merged.completedAt && merged.completedAt !== remote.completedAt) {
        void pushToAccount(merged);
      }
    })();
  }, [persist]);

  const save = useCallback<PreferencesContextValue['save']>(
    async (patch) => {
      editedRef.current = true;
      persist({ ...readStorage(), ...patch });
      const r = await pushToAccount(patch);
      if (r.ok && r.scope === 'conta') setSynced(true);
      return r;
    },
    [persist],
  );

  const complete = useCallback<PreferencesContextValue['complete']>(
    async (patch) => {
      editedRef.current = true;
      const completedAt = new Date().toISOString();
      const next = { ...readStorage(), ...patch, completedAt };
      persist(next);
      // Manda o perfil inteiro (e não só o que mudou): é o que garante que a
      // conta fica idêntica ao aparelho depois de concluir.
      const r = await pushToAccount(next);
      if (r.ok && r.scope === 'conta') setSynced(true);
      return r;
    },
    [persist],
  );

  const reset = useCallback(() => {
    editedRef.current = true;
    setSynced(false);
    persist(DEFAULT_PREFERENCES);
    // Não apaga OWNER_KEY: o aparelho continua sendo desta conta.
    // Limpa também na conta, senão o perfil antigo voltaria no próximo acesso.
    void pushToAccount({ ...DEFAULT_PREFERENCES, completedAt: null });
  }, [persist]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      prefs,
      ready,
      hasCompleted: Boolean(prefs.completedAt),
      synced,
      save,
      complete,
      reset,
    }),
    [prefs, ready, synced, save, complete, reset],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences deve ser usado dentro de <PreferencesProvider>');
  }
  return ctx;
}
