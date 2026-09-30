'use client';

import React from 'react';
import PalcoDeJogos from './PalcoDeJogos';
import type { GrupoResumo } from '@/lib/comunidade-tipos';

// Fora de um grupo não há sala ao vivo: quem joga aqui é "você", no aparelho.
const VOCE = { userId: 'voce', nome: 'Você', avatar: null };

/**
 * Aba Jogos da Comunidade: o palco dos jogos para jogar na hora (sozinho ou
 * contra o computador) e o atalho para as mesas ao vivo dentro dos grupos.
 */
export default function JogosDaComunidade({ grupos, aoCriarGrupo }: { grupos: GrupoResumo[]; aoCriarGrupo: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-300">
        Escolha o jogo em cima do palco: o ambiente muda com ele. Jogue sozinho ou contra o computador agora mesmo, ou abra uma mesa ao vivo dentro de um grupo.
      </p>
      <PalcoDeJogos eu={VOCE} grupos={grupos} aoCriarGrupo={aoCriarGrupo} />
    </div>
  );
}
