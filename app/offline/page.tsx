import React from 'react';
import LogoMark from '@/components/Logo';

export const metadata = { title: 'Sem conexão — nexo.social' };

export default function OfflinePage() {
  return (
    <div className="tela-sem-barra flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark size={56} />
      <h1 className="font-display text-2xl font-semibold text-zinc-50">Você está sem conexão</h1>
      <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
        A nexo.social precisa de internet para buscar sua agenda, o placar e as indicações do dia.
        Assim que a conexão voltar, é só recarregar.
      </p>
      <p className="text-xs text-zinc-600">Seu registro de leitura e suas preferências continuam salvos no aparelho.</p>
    </div>
  );
}
