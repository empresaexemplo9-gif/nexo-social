import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Minha conta: o muro da marca. (lib/areas.ts) */
export default function LayoutDeConta({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="pessoal">{children}</TemaDaArea>;
}
