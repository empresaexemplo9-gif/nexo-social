import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Cada evento veste o mesmo muro da agenda. (lib/areas.ts) */
export default function LayoutDeEvento({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="agenda">{children}</TemaDaArea>;
}
