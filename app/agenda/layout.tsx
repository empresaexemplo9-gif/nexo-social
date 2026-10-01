import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Minha agenda: festa, carnaval e o painel de horários dos murais. (lib/areas.ts) */
export default function LayoutDeAgenda({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="agenda">{children}</TemaDaArea>;
}
