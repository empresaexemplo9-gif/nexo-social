import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Bom Dia: o Cristo, o céu do paraquedas e as ilhas — o começo do dia. (lib/areas.ts) */
export default function LayoutDeBomDia({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="bomdia">{children}</TemaDaArea>;
}
