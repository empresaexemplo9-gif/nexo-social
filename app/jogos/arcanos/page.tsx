import type { Metadata } from 'next';
import ArcanosSolo from '@/components/comunidade/jogos/ArcanosSolo';

export const metadata: Metadata = {
  title: 'Arcanos — os seis grimórios | nexo.social',
  description: 'Um duelo estratégico com 60 personagens exclusivos, seis grimórios e magias, feitiços e mana. Jogue contra o computador ou com sua comunidade.',
};
export default function Page() { return <ArcanosSolo />; }
