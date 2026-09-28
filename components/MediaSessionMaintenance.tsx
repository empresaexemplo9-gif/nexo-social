'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** Mantém a autorização do YouTube ativa em qualquer página, sem expor tokens. */
export default function MediaSessionMaintenance() {
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    let userId: string | null = null;
    let generation = 0;
    let inFlight: AbortController | null = null;
    let previous: boolean | undefined;
    const check = async () => {
      if (!alive || !userId || document.hidden || inFlight) return;
      const epoch = generation;
      const controller = new AbortController();
      inFlight = controller;
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch('/api/youtube/conta', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const account = await response.json();
        if (!alive || epoch !== generation) return;
        window.dispatchEvent(new CustomEvent('nexo:youtube-session', { detail: account }));
        if (previous !== undefined && previous !== account.conectado) window.dispatchEvent(new Event('nexo:youtube-changed'));
        previous = account.conectado;
      } catch { /* Uma falha temporária não desconecta a conta. */ }
      finally { window.clearTimeout(timeout); if (inFlight === controller) inFlight = null; }
    };
    const resume = () => { void check(); };
    // INITIAL_SESSION também cobre o carregamento inicial sem duplicar consultas.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id ?? null;
      if (id !== userId) { generation++; inFlight?.abort(); inFlight = null; previous = undefined; }
      userId = id;
      queueMicrotask(resume);
    });
    const interval = window.setInterval(resume, 5 * 60 * 1000);
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      alive = false; inFlight?.abort(); window.clearInterval(interval);
      data.subscription.unsubscribe();
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);
  return null;
}
