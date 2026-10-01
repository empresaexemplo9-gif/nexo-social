import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Esporte: futebol, tênis, basquete e golfe. (lib/areas.ts) */
export default function LayoutDeEsporte({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="esporte">{children}</TemaDaArea>;
}
