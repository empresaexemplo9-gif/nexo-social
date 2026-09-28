'use client';
import { useEffect } from 'react';
import { opensNewTab } from '@/lib/external-navigation';

/** Abrange inclusive links externos vindos de catálogos e conteúdos dinâmicos. */
export default function ExternalNavigation() {
  useEffect(() => {
    const prepare = (event: MouseEvent) => {
      const target = event.target;
      const link = target instanceof Element ? target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.hasAttribute('download') || !opensNewTab(link.href, window.location.origin)) return;
      // Não cancela o clique: preserva teclado, Ctrl/Cmd e o comportamento nativo.
      link.target = '_blank';
      link.relList.add('noopener', 'noreferrer');
    };
    document.addEventListener('click', prepare, true);
    document.addEventListener('auxclick', prepare, true);
    return () => { document.removeEventListener('click', prepare, true); document.removeEventListener('auxclick', prepare, true); };
  }, []);
  return null;
}
