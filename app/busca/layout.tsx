import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Busca: placas, sinais e o metrô — achar o caminho. (lib/areas.ts) */
export default function LayoutDeBusca({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="busca">{children}</TemaDaArea>;
}
