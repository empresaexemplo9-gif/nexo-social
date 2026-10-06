'use client';

import React from 'react';
import { RegrasGrimorios } from './ArcanosGrimorios';
import { CREDITO_DA_ARTE } from '@/lib/jogos/arte';
import { AVANCO_ACERTO, BONUS_RAPIDO, CASAS, SEGUNDOS_POR_PERGUNTA } from '@/lib/jogos/trilha';

const Bloco = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="space-y-1.5">
    <h3 className="font-display text-base font-bold text-zinc-50">{titulo}</h3>
    <div className="space-y-1.5 text-sm leading-relaxed text-zinc-300">{children}</div>
  </section>
);

export function RegrasDoArcanos() { return <RegrasGrimorios />; }

export function RegrasDaTrilha() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-zinc-300">
        Um jogo de tabuleiro de conhecimentos e curiosidades para o grupo inteiro, ao vivo. Cada pessoa tem um peão na trilha de {CASAS} casas;
        todo mundo responde à mesma pergunta ao mesmo tempo.
      </p>
      <Bloco titulo="A rodada">
        <ol className="list-decimal space-y-1 pl-5">
          <li>A roleta sorteia a categoria: tecnologia, música, moda, esporte, cinema, livros, gastronomia, viagem, games, bem-estar, arte, cultura, Brasil ou ciência.</li>
          <li>Aparece a pergunta com 4 opções. Você tem {SEGUNDOS_POR_PERGUNTA} segundos.</li>
          <li>Quem acerta anda <b>{AVANCO_ACERTO} casas</b>. Quem acerta <b>mais rápido</b> anda +{BONUS_RAPIDO}.</li>
          <li>Depois da resposta vem uma curiosidade para todo mundo aprender algo a mais.</li>
        </ol>
      </Bloco>
      <Bloco titulo="Casas especiais">
        <p><b>★ Estrela:</b> parou nela, anda mais 1. <b>Ponte:</b> atravessa e cai bem mais adiante.</p>
      </Bloco>
      <Bloco titulo="Quem vence">
        <p>Quem chegar primeiro à casa {CASAS}, ou quem estiver mais à frente quando as rodadas acabarem. Empate na trilha é decidido pelos pontos, que premiam a rapidez de cada acerto.</p>
      </Bloco>
      <Bloco titulo="Mesa">
        <p>Quem abre a mesa escolhe o número de rodadas e as categorias. Qualquer membro que estiver na sala de jogos entra antes de começar; quem chegar depois assiste. Se quem abriu sair, a partida continua com a próxima pessoa.</p>
      </Bloco>
      <p className="text-[11px] text-zinc-500">{CREDITO_DA_ARTE}</p>
    </div>
  );
}
