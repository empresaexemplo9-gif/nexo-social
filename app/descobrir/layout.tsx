import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Descobrir: faroeste e fantasia, Brasil e festa. (lib/areas.ts) */
export default function LayoutDeDescobrir({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="descobrir">{children}</TemaDaArea>;
}
