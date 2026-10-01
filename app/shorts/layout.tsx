import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Shorts: ação e adrenalina, a cidade de neon. (lib/areas.ts) */
export default function LayoutDeShorts({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="shorts">{children}</TemaDaArea>;
}
