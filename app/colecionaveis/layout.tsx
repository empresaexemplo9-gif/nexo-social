import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Colecionáveis: o muro de vilões, F1, Oxford e o DRAP, com o quadro holográfico (lib/areas.ts). */
export default function LayoutDosColecionaveis({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="colecionaveis">{children}</TemaDaArea>;
}
