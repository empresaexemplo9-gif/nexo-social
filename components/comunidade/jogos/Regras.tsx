'use client';

import React from 'react';
import Arte from './Arte';
import { CREDITO_DA_ARTE } from '@/lib/jogos/arte';
import { ESCOLAS, PALAVRAS, type Escola } from '@/lib/jogos/arcanos/cartas';
import { AVANCO_ACERTO, BONUS_RAPIDO, CASAS, SEGUNDOS_POR_PERGUNTA } from '@/lib/jogos/trilha';

const Bloco = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="space-y-1.5">
    <h3 className="font-display text-base font-bold text-zinc-50">{titulo}</h3>
    <div className="space-y-1.5 text-sm leading-relaxed text-zinc-300">{children}</div>
  </section>
);

export function RegrasDoArcanos() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-zinc-300">
        Um duelo de estratégia para duas pessoas do grupo, ao vivo. Cada uma leva um grimório de 30 cartas de duas escolas de magia e tenta
        derrubar os <b>20 pontos de vida</b> do herói adversário.
      </p>

      <Bloco titulo="As cinco escolas">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(ESCOLAS) as Escola[]).map((id) => (
            <li key={id} className="flex items-start gap-2 rounded-xl border border-zinc-800 p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: ESCOLAS[id].escura }}>
                <Arte nome={ESCOLAS[id].arte} className="h-5 w-5" style={{ color: ESCOLAS[id].brilho }} />
              </span>
              <span className="text-xs leading-snug">
                <b className="text-zinc-100">{ESCOLAS[id].nome}</b> — {ESCOLAS[id].estilo}
              </span>
            </li>
          ))}
        </ul>
      </Bloco>

      <Bloco titulo="O turno">
        <ol className="list-decimal space-y-1 pl-5">
          <li><b>Começo:</b> suas criaturas desviram, você ganha 1 cristal de <b>éter</b> (até 10) e todos os cristais se enchem. Você compra 1 carta (quem começa não compra no primeiro turno). Todo mundo começa com 5 cartas.</li>
          <li><b>Principal:</b> jogue cartas pagando o custo em éter. <b>Criaturas</b> ficam no campo (até 7); <b>feitiços</b> fazem efeito e vão embora.</li>
          <li><b>Combate (uma vez por turno):</b> escolha quem ataca. Quem ataca fica <b>exausta</b> e não bloqueia no turno do adversário. Criaturas não atacam no turno em que entram, a não ser que tenham Ímpeto.</li>
          <li><b>Bloqueio:</b> o defensor tem 30 segundos para escolher bloqueadores — cada criatura desvirada bloqueia um atacante. Atacante não bloqueado bate direto no herói.</li>
          <li><b>Fim:</b> o dano nas criaturas e os bônus “até o fim do turno” somem. Passe a vez (cada turno tem 90 segundos).</li>
        </ol>
      </Bloco>

      <Bloco titulo="Combate">
        <p>As criaturas trocam dano igual ao ataque. Se o dano recebido chega à vida, ela morre. Sem cartas para comprar, você sofre fadiga (1, depois 2, 3…). Mão cheia (10) queima a carta comprada.</p>
      </Bloco>

      <Bloco titulo="Palavras-chave">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {Object.values(PALAVRAS).map((p) => (
            <div key={p.nome} className="text-xs">
              <dt className="inline font-bold text-zinc-100">{p.nome}: </dt>
              <dd className="inline">{p.texto}</dd>
            </div>
          ))}
          <div className="text-xs"><dt className="inline font-bold text-zinc-100">Congelar: </dt><dd className="inline">A criatura fica exausta e não desvira no próximo turno do dono.</dd></div>
        </dl>
      </Bloco>

      <Bloco titulo="Justo e secreto">
        <p>Cada aparelho embaralha o próprio grimório: ninguém vê a sua mão, nem quem assiste. Nenhuma carta tem efeito aleatório — a sorte está só na ordem das compras.</p>
      </Bloco>
      <p className="text-[11px] text-zinc-500">{CREDITO_DA_ARTE} Fontes Cinzel e IM Fell English (SIL Open Font License).</p>
    </div>
  );
}

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
