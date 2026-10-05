'use client';

import { useEffect, useRef, useState } from 'react';
import { renovarInscricao } from '@/lib/push-cliente';

/** A atualização só reinicia o app quando a pessoa escolhe aplicá-la. */
export default function PWARegister() {
  const [atualizacao, setAtualizacao] = useState<ServiceWorker | null>(null);
  const aplicar = useRef(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let vivo = true;
    let registration: ServiceWorkerRegistration | null = null;
    let instalando: ServiceWorker | null = null;
    const conferir = () => {
      if (vivo && navigator.serviceWorker.controller && registration?.waiting) setAtualizacao(registration.waiting);
    };
    const estado = () => { if (instalando?.state === 'installed') conferir(); };
    const nova = () => {
      instalando?.removeEventListener('statechange', estado);
      instalando = registration?.installing ?? null;
      instalando?.addEventListener('statechange', estado);
    };
    const retomar = () => {
      if (document.hidden || !navigator.onLine) return;
      registration?.update().catch(() => {});
      conferir();
    };
    const mudou = () => { if (aplicar.current) window.location.reload(); };
    const registrar = () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(r => {
        if (!vivo) return;
        registration = r;
        r.addEventListener('updatefound', nova);
        nova(); conferir();
        return renovarInscricao();
      }).catch(e => console.warn('[pwa] service worker não registrado:', e?.message || e));
    };
    if (document.readyState === 'complete') registrar();
    else window.addEventListener('load', registrar, { once: true });
    navigator.serviceWorker.addEventListener('controllerchange', mudou);
    document.addEventListener('visibilitychange', retomar);
    window.addEventListener('online', retomar);
    return () => {
      vivo = false;
      window.removeEventListener('load', registrar);
      window.removeEventListener('online', retomar);
      document.removeEventListener('visibilitychange', retomar);
      navigator.serviceWorker.removeEventListener('controllerchange', mudou);
      registration?.removeEventListener('updatefound', nova);
      instalando?.removeEventListener('statechange', estado);
    };
  }, []);
  if (!atualizacao) return null;
  return <aside aria-label="Atualização do app" className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+12px)] z-[100] mx-auto max-w-md rounded-2xl border border-zinc-600 bg-zinc-900 p-4 text-sm text-zinc-100 shadow-xl">
    <p>Uma nova versão do app está pronta. Atualizar reinicia a reprodução.</p>
    <div className="mt-3 flex gap-3">
      <button type="button" onClick={() => { aplicar.current = true; atualizacao.postMessage({ type: 'SKIP_WAITING' }); }} className="action-collage min-h-11 rounded-lg bg-emerald-400 px-4 text-zinc-950">Atualizar agora</button>
      <button type="button" onClick={() => setAtualizacao(null)} className="action-collage min-h-11 rounded-lg px-3">Depois</button>
    </div>
  </aside>;
}
