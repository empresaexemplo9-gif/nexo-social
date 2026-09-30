'use client';

import React from 'react';
import Icon from '../icons';
import Conversa from './chat/Conversa';

/** Chat do grupo: só membros leem e escrevem. Tem foto, vídeo, voz, figurinhas e chamadas. */
export default function ChatDoGrupo({ groupId, onLigar }: { groupId: string; onLigar?: (video: boolean) => void }) {
  return (
    <Conversa
      endpoint={`/api/comunidade/grupos/${groupId}/chat`}
      emGrupo
      onLigar={onLigar}
      placeholder="Mensagem para o grupo…"
      vazio="Nenhuma mensagem ainda. Mande um oi, uma foto ou uma figurinha."
      cabecalho={
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100"><Icon name="chat" size={16} /> Chat do grupo</h3>
          <p className="text-[11px] text-zinc-500">Só membros deste grupo leem e enviam mensagens.</p>
        </div>
      }
    />
  );
}
