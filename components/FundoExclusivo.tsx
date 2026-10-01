'use client';

import React, { useEffect, useState } from 'react';
import { EVENTO_FUNDO_EXCLUSIVO, lerFundoExclusivo, type FundoExclusivoSalvo } from '@/lib/exclusivos';

export default function FundoExclusivo() {
  const [fundo, setFundo] = useState<FundoExclusivoSalvo | null>(null);

  useEffect(() => {
    setFundo(lerFundoExclusivo());
    const onChange = (e: Event) => setFundo((e as CustomEvent<FundoExclusivoSalvo | null>).detail ?? lerFundoExclusivo());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'nexo:exclusivo:fundo') setFundo(lerFundoExclusivo());
    };
    window.addEventListener(EVENTO_FUNDO_EXCLUSIVO, onChange as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENTO_FUNDO_EXCLUSIVO, onChange as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  if (!fundo) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[9] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `linear-gradient(rgba(246,242,234,.12), rgba(246,242,234,.22)), url(${JSON.stringify(fundo.url)})` }}
    />
  );
}
