'use client';

// Preferências do usuário (resultado do questionário de interesses).
// Persistidas em localStorage para que a personalização funcione mesmo sem
// backend configurado. Quando o Supabase estiver ativo, o mesmo formato pode
// ser sincronizado com a tabela `user_preferences`.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CategorySlug } from './data';

export type Frequency = 'diaria' | 'semanal' | 'mensal';

export interface UserPreferences {
  interests: CategorySlug[];
  city: string | null;
  radiusKm: number;
  frequency: Frequency;
  completedAt: string | null;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  interests: [],
  city: null,
  radiusKm: 50,
  frequency: 'semanal',
  completedAt: null,
};

const STORAGE_KEY = 'nexo:prefs:v1';

interface PreferencesContextValue {
  prefs: UserPreferences;
  ready: boolean;
  hasCompleted: boolean;
  save: (patch: Partial<UserPreferences>) => void;
  complete: (prefs: Partial<UserPreferences>) => void;
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

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(readStorage());
    setReady(true);
  }, []);

  const persist = useCallback((next: UserPreferences) => {
    setPrefs(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível — mantém apenas em memória */
    }
  }, []);

  const save = useCallback(
    (patch: Partial<UserPreferences>) => {
      persist({ ...readStorage(), ...patch });
    },
    [persist],
  );

  const complete = useCallback(
    (patch: Partial<UserPreferences>) => {
      persist({ ...readStorage(), ...patch, completedAt: new Date().toISOString() });
    },
    [persist],
  );

  const reset = useCallback(() => {
    persist(DEFAULT_PREFERENCES);
  }, [persist]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      prefs,
      ready,
      hasCompleted: Boolean(prefs.completedAt),
      save,
      complete,
      reset,
    }),
    [prefs, ready, save, complete, reset],
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
