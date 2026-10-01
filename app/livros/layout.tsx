import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Livros: Oxford, ilhas no céu e o violão. (lib/areas.ts) */
export default function LayoutDeLivros({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="livros">{children}</TemaDaArea>;
}
