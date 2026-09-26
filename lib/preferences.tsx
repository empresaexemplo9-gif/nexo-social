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
// Ao abrir, o aparelho responde primeiro (instantâneo) e a conta chega em
// seguida. Quem manda é a versão MAIS NOVA: toda edição feita aqui fica marcada
// como pendente até a conta confirmar que recebeu. Sem essa marca, a conta
// vencia sempre — e uma escolha que não chegou a subir (sessão expirada, rede
// caindo, resposta dada deslogado) era sobrescrita pela versão antiga no
// próximo acesso, como se o questionário não tivesse gravado nada.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CategorySlug } from './data';
import { normalizarWidgets, type WidgetDaHome } from './widgets';

export type Frequency = 'diaria' | 'semanal' | 'mensal';

/** Como a pessoa quer a trilha: misturar novas e antigas, só hits ou só lançamentos. */
export type MusicMix = 'misturar' | 'famosas' | 'lancamentos';

export interface UserPreferences {
  interests: CategorySlug[];
  /** Subtemas escolhidos dentro de cada tema (afina a indicação). */
  subtopics: string[];
  /** Gêneros musicais — alimentam a trilha do Spotify. */
  musicGenres: string[];
  /** Gosta dos hits e clássicos do estilo (as que todo mundo conhece)? */
  musicHits: boolean;
  /** Misturar lançamentos com antigas, só as mais famosas ou só lançamentos. */
  musicMix: MusicMix;
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
  /** Widgets da home, na ordem da tela; `null` = arranjo padrão. */
  homeWidgets: WidgetDaHome[] | null;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  interests: [],
  subtopics: [],
  musicGenres: [],
  // Padrão de quem ainda não respondeu: fugir do óbvio, misturando novas e antigas.
  musicHits: false,
  musicMix: 'misturar',
  filmGenres: [],
  bookGenres: [],
  hobbies: [],
  readingGoal: 12,
  city: null,
  radiusKm: 50,
  frequency: 'semanal',
  completedAt: null,
  homeWidgets: null,
};

const STORAGE_KEY = 'nexo:prefs:v1';
/** De quem é o perfil guardado neste aparelho (id da conta que o sincronizou). */
const OWNER_KEY = 'nexo:prefs:owner';
/** Quando foi a última edição feita aqui que a conta ainda não confirmou. */
const PENDING_KEY = 'nexo:prefs:pending';

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
    return { ...DEFAULT_PREFERENCES, ...parsed, homeWidgets: normalizarWidgets(parsed?.homeWidgets) };
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

function readPending(): string | null {
  try {
    return window.localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

/** Marca uma edição local ainda não confirmada pela conta. Devolve a marca. */
function markPending(): string {
  const stamp = new Date().toISOString();
  try {
    window.localStorage.setItem(PENDING_KEY, stamp);
  } catch {
    /* armazenamento indisponível */
  }
  return stamp;
}

/**
 * A conta confirmou. Só limpa se nenhuma edição mais nova apareceu enquanto a
 * requisição ia e voltava — essa ainda precisa subir.
 */
function clearPending(stamp?: string) {
  try {
    if (!stamp || window.localStorage.getItem(PENDING_KEY) === stamp) {
      window.localStorage.removeItem(PENDING_KEY);
    }
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
 * Junta o que está no aparelho com o que está na conta, quando o aparelho não
 * tem edição pendente.
 *
 * A conta manda sempre que já tem um questionário concluído — é ela que vale em
 * todos os aparelhos. O que está no aparelho só prevalece quando a conta ainda
 * não tem resposta (respondeu antes de entrar), e nesse caso sobe para a conta.
 */
function merge(local: UserPreferences, remote: UserPreferences): UserPreferences {
  if (remote.completedAt) return remote;
  return local.completedAt ? local : { ...local, ...remote };
}

/**
 * A edição pendente do aparelho é mais nova que a versão da conta? Sem data na
 * conta, a edição local é o que há de mais recente.
 */
function pendingIsNewer(pendingAt: string | null, remoteUpdatedAt: string | null): boolean {
  if (!pendingAt) return false;
  if (!remoteUpdatedAt) return true;
  return Date.parse(pendingAt) > Date.parse(remoteUpdatedAt);
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
      let remoteUpdatedAt: string | null = null;
      let userId = '';
      try {
        const res = await fetch('/api/preferences');
        if (!res.ok) return; // 401/503 => segue no modo aparelho (a pendência fica)
        const json = await res.json();
        userId = typeof json.userId === 'string' ? json.userId : '';
        remote = json.preferences ? { ...DEFAULT_PREFERENCES, ...json.preferences } : null;
        remoteUpdatedAt = typeof json.updatedAt === 'string' ? json.updatedAt : null;
      } catch {
        return; // offline — segue no modo aparelho
      }
      if (editedRef.current) return;

      // Perfil que ficou no aparelho de outra conta não pertence a esta — nem a
      // edição pendente dele.
      const owner = readOwner();
      const doOutro = Boolean(owner && userId && owner !== userId);
      const mine = doOutro ? DEFAULT_PREFERENCES : local;
      const pendingAt = doOutro ? null : readPending();
      if (doOutro) clearPending();

      if (userId) writeOwner(userId);

      // Edição feita aqui que a conta não chegou a receber, e mais nova que a
      // versão dela: é a escolha atual da pessoa. Fica e sobe inteira.
      if (pendingIsNewer(pendingAt, remoteUpdatedAt) || (!remote && mine.completedAt)) {
        persist(mine);
        const r = await pushToAccount(mine);
        if (r.ok && r.scope === 'conta') {
          if (pendingAt) clearPending(pendingAt);
          setSynced(true);
        }
        return;
      }
      // A conta tem algo mais novo que a pendência (editou em outro aparelho
      // depois): a pendência daqui ficou velha.
      if (pendingAt) clearPending(pendingAt);

      if (!remote) {
        if (doOutro) persist(DEFAULT_PREFERENCES);
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
      // Havia edição que não subiu: manda o perfil inteiro, senão ela se perde
      // quando esta subir e limpar a pendência.
      const atrasada = Boolean(readPending());
      const next = { ...readStorage(), ...patch };
      persist(next);
      const stamp = markPending();
      const r = await pushToAccount(atrasada ? next : patch);
      if (r.ok && r.scope === 'conta') {
        clearPending(stamp);
        setSynced(true);
      }
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
      const stamp = markPending();
      // Manda o perfil inteiro (e não só o que mudou): é o que garante que a
      // conta fica idêntica ao aparelho depois de concluir.
      const r = await pushToAccount(next);
      if (r.ok && r.scope === 'conta') {
        clearPending(stamp);
        setSynced(true);
      }
      return r;
    },
    [persist],
  );

  const reset = useCallback(() => {
    editedRef.current = true;
    setSynced(false);
    persist(DEFAULT_PREFERENCES);
    const stamp = markPending();
    // Não apaga OWNER_KEY: o aparelho continua sendo desta conta.
    // Limpa também na conta, senão o perfil antigo voltaria no próximo acesso.
    void pushToAccount({ ...DEFAULT_PREFERENCES, completedAt: null }).then((r) => {
      if (r.ok && r.scope === 'conta') clearPending(stamp);
    });
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
