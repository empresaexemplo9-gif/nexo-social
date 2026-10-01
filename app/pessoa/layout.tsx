import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** A página de cada pessoa: o muro da marca. (lib/areas.ts) */
export default function LayoutDePessoa({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="pessoal">{children}</TemaDaArea>;
}
