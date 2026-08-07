'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker — é ele que torna o app instalável e evita a tela
 * em branco quando a rede cai.
 *
 * Fica fora do build de desenvolvimento: um SW ativo em dev serve arquivos
 * velhos e faz o hot reload parecer quebrado.
 */
export default function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const registrar = () => {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.warn('[pwa] service worker não registrado:', e?.message || e);
      });
    };

    // Espera a página assentar para não competir com o carregamento inicial.
    if (document.readyState === 'complete') registrar();
    else window.addEventListener('load', registrar, { once: true });
  }, []);

  return null;
}
