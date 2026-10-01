import React from 'react';
import TemaDaArea from '@/components/TemaDaArea';

/** Questionário: o olho que observa — conhecer você. (lib/areas.ts) */
export default function LayoutDeQuestionario({ children }: { children: React.ReactNode }) {
  return <TemaDaArea area="questionario">{children}</TemaDaArea>;
}
