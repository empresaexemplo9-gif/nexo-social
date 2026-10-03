'use client';

import React from 'react';
import { Glifo } from './ArteArcanos';
import { IconeDado } from './CartaArcana';
import { CREDITO_DA_ARTE } from '@/lib/jogos/arte';
import { ELEMENTOS, ELEMENTOS_ORDEM, FACES, MANA_POR_ELEMENTO, PALAVRAS } from '@/lib/jogos/arcanos/cartas';
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
        Um duelo de magia para duas pessoas do grupo, ao vivo, sobre um tabuleiro em 3D. Cada jogador escolhe um dos <b>seis elementos</b>, leva o grimório e a
        reserva de mana desse elemento e tenta derrubar os <b>20 pontos de vida</b> do herói adversário. Tudo — dano, cura, escudo, bônus — é decidido por <b>dados</b>.
      </p>

      <Bloco titulo="Os seis elementos">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ELEMENTOS_ORDEM.map((id) => (
            <li key={id} className="flex items-start gap-2 rounded-xl border border-zinc-800 p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: ELEMENTOS[id].escura }}>
                <Glifo el={id} className="h-5 w-5" style={{ color: ELEMENTOS[id].brilho }} />
              </span>
              <span className="text-xs leading-snug">
                <b className="text-zinc-100">{ELEMENTOS[id].nome}</b> — {ELEMENTOS[id].estilo}
              </span>
            </li>
          ))}
        </ul>
        <p>Cada elemento tem a <b>própria mana</b>: um herói de Fogo só joga cartas de Fogo, pagas com mana de Fogo.</p>
      </Bloco>

      <Bloco titulo="Os dois baralhos">
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Grimório (30 cartas):</b> 21 feitiços e 9 personagens do seu elemento.</li>
          <li><b>Reserva de mana (20 cartas):</b> {MANA_POR_ELEMENTO.essencias} Essências (+1 de mana) e {MANA_POR_ELEMENTO.nucleos} Núcleos (+2). A reserva é idêntica em todos os elementos.</li>
        </ul>
        <p>Você começa com 5 cartas do grimório e 2 de mana (quem joga em segundo compra 1 de cada a mais). Mão máxima: 8 cartas e 5 de mana — o que passar disso se perde.</p>
      </Bloco>

      <Bloco titulo="Os dados">
        <p>Todo número de uma carta é um dado: <b>2d6</b> = role dois dados de 6 faces e some. Os dados menores são de <b>3 lados</b>; os maiores, de <b>20</b>. Quanto mais faces, maior o risco e a recompensa.</p>
        <div className="flex flex-wrap gap-2">
          {FACES.map((f) => (
            <span key={f} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 px-2 py-1 text-xs">
              <IconeDado faces={f} tamanho={26} />
              <span>
                d{f} <span className="text-zinc-500">· média {((f + 1) / 2).toLocaleString('pt-BR')}</span>
              </span>
            </span>
          ))}
        </div>
        <p>Quem joga a carta rola os dados (de verdade, sem trapaça possível: o resultado viaja junto da jogada e os dois aparelhos conferem). O mesmo vale para <b>dano, cura, escudo, bônus de dano, danos contínuos e regeneração</b>.</p>
      </Bloco>

      <Bloco titulo="O turno">
        <ol className="list-decimal space-y-1 pl-5">
          <li><b>Começo:</b> seu escudo some, a mana se renova, os <b>danos contínuos</b> e <b>regenerações</b> rolam e os personagens “no início do turno” agem. Depois você compra 1 carta do grimório e 1 de mana (quem começa não compra no primeiro turno).</li>
          <li><b>Mana:</b> uma vez por turno, ponha uma carta de mana na sua <b>fonte</b>. A fonte soma o valor de todas as cartas postas (máximo 10) e se enche toda vez que o turno começa.</li>
          <li><b>Feitiços e personagens:</b> jogue quantas cartas quiser pagando o custo. Toque na carta e depois em <b>Lançar</b> (ou toque de novo). Se pede alvo, toque no alvo no tabuleiro.</li>
          <li><b>Ataques:</b> cada personagem seu pode atacar <b>uma vez por turno</b>. Toque nele (ele brilha quando pode) e escolha o alvo.</li>
          <li><b>Passar:</b> encerre o turno. Cada turno tem 100 segundos; acabando o tempo a vez passa sozinha.</li>
        </ol>
      </Bloco>

      <Bloco titulo="Feitiços">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {[
            ['Dano', 'Tira vida do alvo (herói ou personagem). O escudo absorve primeiro.'],
            ['Dreno', 'Causa dano e cura o seu herói na mesma medida da vida que tirou.'],
            ['Cura', 'Devolve vida até o máximo (20 no herói; a vida cheia do personagem).'],
            ['Escudo', 'Absorve dano. Dura até o início do seu próximo turno.'],
            ['Amplificar', 'O personagem rola dados extras em cada ataque pelos turnos indicados.'],
            ['Dano contínuo', 'Queimadura, veneno, afogamento… rola no início de cada turno do alvo e ignora escudo e Couraça.'],
            ['Regeneração', 'Cura rolando no início de cada turno do alvo.'],
            ['Enfraquecer', 'Rola uma vez: o alvo causa essa quantidade a menos pelos turnos indicados.'],
            ['Silêncio', 'Herói silenciado não lança feitiços (ainda invoca). Personagem silenciado perde habilidades, Foco, Vampírico e Couraça.'],
            ['Atordoar', 'O alvo não ataca. No herói, nenhum personagem dele ataca.'],
            ['Esquiva', 'O alvo evita o próximo dano de ataque ou feitiço (não vale contra danos contínuos).'],
            ['Purificar', 'Remove silêncio, atordoamento, enfraquecimento e danos contínuos.'],
            ['Dissipar', 'Remove escudo, esquiva e bônus do alvo.'],
            ['Comprar / Mana', 'Compra cartas do grimório ou dá mana extra neste turno. Drenar mana tira mana do adversário no turno dele.'],
            ['Ressuscitar', 'Devolve o último personagem morto, com vida cheia.'],
          ].map(([t, d]) => (
            <div key={t} className="text-xs">
              <dt className="inline font-bold text-zinc-100">{t}: </dt>
              <dd className="inline">{d}</dd>
            </div>
          ))}
        </dl>
        <p>Feitiços de uma só alvo pedem que você escolha; os “em área” atingem todos os personagens inimigos com <b>uma única rolagem</b>.</p>
      </Bloco>

      <Bloco titulo="Personagens">
        <p>Entram no seu campo (até <b>4</b>), têm vida e um <b>ataque em dados</b>. Não atacam no turno em que entram, a menos que tenham Ímpeto. Os feitiços de buff, cura e escudo funcionam neles tanto quanto no herói. O ataque rola o dado do personagem e <b>não há contra-ataque</b>. Quem chega a zero de vida cai e vai para o cemitério. Alguns têm “ao entrar”, “no início do turno” ou “ao morrer”.</p>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {Object.values(PALAVRAS).map((p) => (
            <div key={p.nome} className="text-xs">
              <dt className="inline font-bold text-zinc-100">{p.nome}: </dt>
              <dd className="inline">{p.texto}</dd>
            </div>
          ))}
        </dl>
      </Bloco>

      <Bloco titulo="Como se vence">
        <p>Derrube a vida do herói adversário a zero. Se os dois caírem juntos, é empate. Sem cartas no grimório, você sofre fadiga (1, depois 2, 3…) a cada compra. Sair no meio do jogo conta como desistência.</p>
      </Bloco>

      <Bloco titulo="Justo e secreto">
        <p>Cada aparelho embaralha o próprio baralho: ninguém vê a sua mão, nem quem assiste. Os dados são rolados por quem joga e conferidos pelo outro lado — se um número impossível aparecer, a jogada é recusada.</p>
      </Bloco>
      <p className="text-[11px] text-zinc-500">Ilustrações desenhadas em código para este jogo. Fontes Cinzel e IM Fell English (SIL Open Font License).</p>
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
