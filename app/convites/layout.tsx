import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Meus convites: o muro da marca. (lib/areas.ts) */
export default function LayoutDeConvites({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="pessoal">{children}</TemaDaArea>;
}
