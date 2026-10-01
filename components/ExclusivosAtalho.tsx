'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Só aparece para quem recebeu algum item exclusivo. Assim o recurso fica
 * descobrível sem criar uma aba vazia para todos os outros usuários.
 */
export default function ExclusivosAtalho() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch('/api/exclusivos', { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive) setCount(Array.isArray(j?.items) ? j.items.length : 0);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  if (!count) return null;
  return (
    <Link
      href="/exclusivos"
      className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40 rounded-full border border-amber-300/40 bg-zinc-950/90 px-4 py-2.5 text-xs font-bold text-amber-200 shadow-2xl backdrop-blur transition hover:border-amber-300 hover:text-white lg:bottom-6 lg:right-6"
      title="Itens exclusivos liberados para a sua conta"
      aria-label={`${count} itens exclusivos disponíveis`}
    >
      ✦ Exclusivos <span className="ml-1 rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] text-zinc-950">{count}</span>
    </Link>
  );
}
