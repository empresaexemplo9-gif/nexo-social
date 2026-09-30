'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Icon from '../../icons';
import Avatar from '../../Avatar';
import Arte from './Arte';
import EscolherEscolas from './EscolherEscolas';
import { CartaGrande } from './CartaArcana';
import { RegrasDaTrilha, RegrasDoArcanos } from './Regras';
import { CATEGORIAS_DO_QUIZ } from '@/lib/jogos/perguntas';
import { ESCOLAS, type Escola } from '@/lib/jogos/arcanos/cartas';
import { novoId, type JogoId, type MesaAnunciada } from '@/lib/jogos/canal';
import {
  criarSalaLocal,
  iniciarRoboDaTrilha,
  iniciarRoboDoArcanos,
  ROBO_DO_ARCANOS,
  ROBOS_DA_TRILHA,
  sortearEscolas,
  type CanalDeJogos,
} from '@/lib/jogos/sala-local';
import type { GrupoResumo } from '@/lib/comunidade-tipos';

// As mesas só carregam quando alguém começa uma partida (são as partes pesadas).
const Arcanos = dynamic(() => import('./Arcanos'), { ssr: false, loading: () => <Carregando /> });
const TrilhaDoSaber = dynamic(() => import('./TrilhaDoSaber'), { ssr: false, loading: () => <Carregando /> });

type Eu = { userId: string; nome: string; avatar: string | null };

type Partida =
  | { jogo: 'trilha'; mesa: string; local: true; robos: number }
  | { jogo: 'trilha'; mesa: string; local: false; papel: 'host' | 'jogador' | 'espectador'; hostNome?: string }
  | { jogo: 'arcanos'; mesa: string; local: true; escolas: [Escola, Escola] }
  | { jogo: 'arcanos'; mesa: string; local: false; papel: 'host' | 'desafiante' | 'espectador'; escolas?: [Escola, Escola]; hostNome?: string };

/** O ambiente de cada jogo: o palco inteiro muda quando o jogo muda. */
const AMBIENTE: Record<JogoId, { fundo: string; textura: string; linha: string; destaque: string; sobreDestaque: string; fonte: string; arte: string }> = {
  trilha: {
    // Feltro verde-petróleo de mesa de jogo, com a trama do tecido.
    fundo: 'radial-gradient(ellipse at 50% 25%, #1b6b6d 0%, #0e3b3d 58%, #072223 100%)',
    textura: 'radial-gradient(rgba(255,255,255,.06) 1px, transparent 1.2px) 0 0 / 7px 7px, radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.35) 100%)',
    linha: 'rgba(251,243,224,.18)',
    destaque: '#fbf3e0',
    sobreDestaque: '#2b2118',
    fonte: 'font-display uppercase tracking-wide',
    arte: 'owl',
  },
  arcanos: {
    // Mesa de madeira escura à luz de vela, com moldura dourada.
    fundo: 'radial-gradient(ellipse at 50% 40%, #4a3421 0%, #22170d 55%, #0b0704 100%)',
    textura:
      'repeating-linear-gradient(95deg, rgba(255,255,255,.018) 0 2px, transparent 2px 9px), radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.6) 100%)',
    linha: 'rgba(212,175,55,.35)',
    destaque: 'linear-gradient(180deg,#f5d77a,#d4af37)',
    sobreDestaque: '#1c1208',
    fonte: 'fonte-arcana',
    arte: 'spell-book',
  },
};

const NOMES: Record<JogoId, { nome: string; tipo: string }> = {
  trilha: { nome: 'Trilha do Saber', tipo: 'Tabuleiro · conhecimentos e curiosidades' },
  arcanos: { nome: 'Arcanos', tipo: 'Cartas · estratégia' },
};

const VITRINE_DE_CARTAS = ['c10', 'm09', 'b09', 'l11', 's12'];

function Carregando() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/70 border-t-transparent" aria-label="Carregando o jogo" />
    </div>
  );
}

/**
 * O palco dos jogos: um espaço só na tela. Escolhe-se o jogo em cima e o
 * ambiente inteiro muda (feltro da Trilha, mesa de madeira do Arcanos). Dá
 * para jogar sozinho, contra o computador ou, dentro de um grupo, ao vivo.
 * "Fechar jogo" encerra a partida e devolve o palco à escolha.
 */
export default function PalcoDeJogos({
  eu,
  canal = null,
  groupId = null,
  jogoInicial = null,
  grupos,
  aoCriarGrupo,
  aoTerminar,
}: {
  eu: Eu;
  /** Canal ao vivo do grupo (só dentro de um grupo). */
  canal?: CanalDeJogos | null;
  groupId?: string | null;
  jogoInicial?: JogoId | null;
  /** Fora de um grupo: atalhos para jogar com um dos seus grupos. */
  grupos?: GrupoResumo[];
  aoCriarGrupo?: () => void;
  aoTerminar?: () => void;
}) {
  const [jogo, setJogo] = useState<JogoId>(jogoInicial ?? 'trilha');
  const [partida, setPartida] = useState<Partida | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  const [escolhendo, setEscolhendo] = useState<{ para: 'robo' } | { para: 'criar' } | { para: 'aceitar'; mesa: MesaAnunciada } | null>(null);
  const [regras, setRegras] = useState<JogoId | null>(null);
  const [robos, setRobos] = useState(2);
  const fecharRef = useRef<(() => void) | null>(null);
  const palcoRef = useRef<HTMLElement>(null);
  const trocaPendente = useRef<JogoId | null>(null);

  useEffect(() => {
    if (jogoInicial) setJogo(jogoInicial);
  }, [jogoInicial]);

  // Partida começando: o palco inteiro fica à vista.
  useEffect(() => {
    if (partida && !telaCheia) palcoRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [partida?.mesa]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tela cheia: trava a rolagem da página; Esc volta ao tamanho normal.
  useEffect(() => {
    if (!telaCheia) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[role="dialog"]') && setTelaCheia(false);
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener('keydown', esc);
    };
  }, [telaCheia]);

  // --- Partida local: uma sala só deste aparelho, com os robôs ------------------------
  const sala = useMemo(() => {
    if (!partida?.local) return null;
    const outros = partida.jogo === 'trilha' ? ROBOS_DA_TRILHA.slice(0, partida.robos) : [ROBO_DO_ARCANOS];
    return criarSalaLocal([eu, ...outros]);
    // A sala nasce com a partida (a mesa muda a cada partida nova).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partida?.mesa]);

  useEffect(() => {
    if (!partida?.local || !sala) return;
    const paradas =
      partida.jogo === 'trilha'
        ? ROBOS_DA_TRILHA.slice(0, partida.robos).map((r) => iniciarRoboDaTrilha(sala.get(r.userId)!, partida.mesa, r))
        : [iniciarRoboDoArcanos(sala.get(ROBO_DO_ARCANOS.userId)!, partida.mesa, sortearEscolas())];
    return () => paradas.forEach((p) => p());
  }, [sala]); // eslint-disable-line react-hooks/exhaustive-deps

  const canalDaPartida: CanalDeJogos | null = partida?.local ? sala?.get(eu.userId) ?? null : canal;

  // --- Abrir, fechar e trocar ----------------------------------------------------------
  const aoSair = useCallback(() => {
    fecharRef.current = null;
    setPartida(null);
    const proximo = trocaPendente.current;
    if (proximo) setJogo(proximo);
    aoTerminar?.();
  }, [aoTerminar]);

  const fechar = () => {
    if (fecharRef.current) fecharRef.current();
    else aoSair();
  };

  const trocar = (id: JogoId) => {
    if (id === jogo) return;
    if (!partida) return setJogo(id);
    // A troca só acontece se a partida fechar (quem está no meio confirma).
    trocaPendente.current = id;
    fechar();
    trocaPendente.current = null;
  };

  const jogarTrilha = (n: number) => setPartida({ jogo: 'trilha', mesa: novoId(), local: true, robos: n });
  const abrirMesaDaTrilha = () => setPartida({ jogo: 'trilha', mesa: novoId(), local: false, papel: 'host' });
  const entrarNaMesa = (m: MesaAnunciada) => {
    if (m.jogo === 'trilha') setPartida({ jogo: 'trilha', mesa: m.id, local: false, papel: m.estado === 'aberta' ? 'jogador' : 'espectador', hostNome: m.hostNome });
    else if (m.estado === 'aberta' && m.host !== eu.userId) setEscolhendo({ para: 'aceitar', mesa: m });
    else setPartida({ jogo: 'arcanos', mesa: m.id, local: false, papel: 'espectador', hostNome: m.hostNome });
  };

  const aoVivo = canal?.estado === 'ok';
  const mesas = (canal?.mesas ?? []).filter((m) => m.host !== eu.userId && m.jogo === jogo);
  const amb = AMBIENTE[jogo];

  // --- Desenho -------------------------------------------------------------------------
  return (
    <section
      ref={palcoRef}
      aria-label="Palco dos jogos"
      className={
        telaCheia
          ? 'fixed inset-0 z-[70] !m-0 flex flex-col overflow-hidden text-white'
          : 'relative flex h-[80vh] min-h-[32rem] scroll-mt-20 flex-col overflow-hidden rounded-3xl text-white sm:h-[min(84vh,54rem)]'
      }
      style={{ boxShadow: telaCheia ? undefined : '0 14px 34px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.08)' }}
      data-jogo={jogo}
    >
      {/* Os ambientes se cruzam quando o jogo muda. */}
      {(Object.keys(AMBIENTE) as JogoId[]).map((id) => (
        <div
          key={id}
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{ background: `${AMBIENTE[id].textura}, ${AMBIENTE[id].fundo}`, opacity: jogo === id ? 1 : 0 }}
        >
          <Arte nome={AMBIENTE[id].arte} className="absolute -bottom-10 -right-10 h-64 w-64 opacity-[0.06]" />
        </div>
      ))}

      {/* Barra do palco: qual jogo, tela cheia e fechar */}
      <header className="relative z-[2] flex flex-wrap items-center gap-2 border-b px-2.5 py-2 sm:px-4" style={{ borderColor: amb.linha, background: 'rgba(0,0,0,.18)' }}>
        <div role="tablist" aria-label="Escolher o jogo" className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(0,0,0,.28)' }}>
          {(Object.keys(AMBIENTE) as JogoId[]).map((id) => {
            const ativo = jogo === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => trocar(id)}
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition sm:px-3 sm:text-sm"
                style={ativo ? { background: AMBIENTE[id].destaque, color: AMBIENTE[id].sobreDestaque } : { color: 'rgba(255,255,255,.72)' }}
              >
                <Arte nome={AMBIENTE[id].arte} className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className={AMBIENTE[id].fonte}>{NOMES[id].nome}</span>
              </button>
            );
          })}
        </div>
        <span className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={() => setTelaCheia((v) => !v)}
          aria-pressed={telaCheia}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/10"
        >
          <Icon name="maximize" size={14} /> <span className="hidden sm:inline">{telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}</span>
        </button>
        {partida && (
          <button
            type="button"
            onClick={fechar}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
            style={{ background: 'linear-gradient(180deg,#ef4444,#b91c1c)', boxShadow: '0 2px 0 rgba(0,0,0,.35)' }}
          >
            <Icon name="close" size={14} /> Fechar jogo
          </button>
        )}
      </header>

      {/* O espaço do jogo */}
      <div className="relative z-[1] min-h-0 flex-1">
        {partida?.jogo === 'trilha' && canalDaPartida && (
          <TrilhaDoSaber
            key={partida.mesa}
            canal={canalDaPartida}
            groupId={partida.local ? null : groupId}
            mesa={partida.mesa}
            papel={partida.local ? 'host' : partida.papel}
            eu={eu}
            hostNome={partida.local ? undefined : partida.hostNome}
            local={partida.local}
            aoSair={aoSair}
            fecharRef={fecharRef}
          />
        )}
        {partida?.jogo === 'arcanos' && canalDaPartida && (
          <Arcanos
            key={partida.mesa}
            canal={canalDaPartida}
            groupId={partida.local ? null : groupId}
            mesa={partida.mesa}
            papel={partida.local ? 'host' : partida.papel}
            eu={eu}
            escolas={partida.escolas}
            hostNome={partida.local ? undefined : partida.hostNome}
            local={partida.local}
            aoSair={aoSair}
            aoRevanche={partida.local ? () => setPartida({ ...partida, mesa: novoId() }) : undefined}
            fecharRef={fecharRef}
          />
        )}
        {!partida && (
          <div className="absolute inset-0 overflow-y-auto">
            {jogo === 'trilha' ? (
              <LobbyDaTrilha
                robos={robos}
                setRobos={setRobos}
                onSozinho={() => jogarTrilha(0)}
                onRobos={() => jogarTrilha(robos)}
                onRegras={() => setRegras('trilha')}
                grupo={
                  <ModoEmGrupo
                    jogo="trilha"
                    canal={canal}
                    aoVivo={aoVivo}
                    mesas={mesas}
                    grupos={grupos}
                    aoCriarGrupo={aoCriarGrupo}
                    onAbrir={abrirMesaDaTrilha}
                    onEntrar={entrarNaMesa}
                  />
                }
              />
            ) : (
              <LobbyDoArcanos
                onRobo={() => setEscolhendo({ para: 'robo' })}
                onRegras={() => setRegras('arcanos')}
                grupo={
                  <ModoEmGrupo
                    jogo="arcanos"
                    canal={canal}
                    aoVivo={aoVivo}
                    mesas={mesas}
                    grupos={grupos}
                    aoCriarGrupo={aoCriarGrupo}
                    onAbrir={() => setEscolhendo({ para: 'criar' })}
                    onEntrar={entrarNaMesa}
                  />
                }
              />
            )}
          </div>
        )}
      </div>

      {escolhendo && (
        <EscolherEscolas
          titulo={escolhendo.para === 'robo' ? 'Duelo contra o computador' : escolhendo.para === 'criar' ? 'Abrir um duelo no grupo' : `Aceitar o duelo de ${escolhendo.mesa.hostNome.split(' ')[0]}`}
          botao={escolhendo.para === 'robo' ? 'Duelar' : escolhendo.para === 'criar' ? 'Abrir mesa' : 'Aceitar'}
          onCancelar={() => setEscolhendo(null)}
          onEscolher={(escolas) => {
            if (escolhendo.para === 'robo') setPartida({ jogo: 'arcanos', mesa: novoId(), local: true, escolas });
            else if (escolhendo.para === 'criar') setPartida({ jogo: 'arcanos', mesa: novoId(), local: false, papel: 'host', escolas });
            else setPartida({ jogo: 'arcanos', mesa: escolhendo.mesa.id, local: false, papel: 'desafiante', escolas, hostNome: escolhendo.mesa.hostNome });
            setEscolhendo(null);
          }}
        />
      )}

      {regras && (
        <div className="fixed inset-0 z-[78] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Regras: ${NOMES[regras].nome}`}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-zinc-900 p-5 sm:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-zinc-50">Como jogar {NOMES[regras].nome}</h2>
              <button type="button" onClick={() => setRegras(null)} aria-label="Fechar" className="rounded-full p-2 text-zinc-400 hover:text-zinc-100">
                <Icon name="close" size={18} />
              </button>
            </div>
            {regras === 'trilha' ? <RegrasDaTrilha /> : <RegrasDoArcanos />}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Lobbies (a cara de cada jogo antes da partida)
// ---------------------------------------------------------------------------

const PAPELAO = '#fbf3e0';
const TINTA = '#2b2118';
const OURO = '#d4af37';

function BotaoDeTabuleiro({ children, onClick, cor = PAPELAO, disabled }: { children: React.ReactNode; onClick: () => void; cor?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl px-4 py-3 text-left transition active:translate-y-0.5 disabled:opacity-50"
      style={{ background: cor, color: TINTA, boxShadow: `0 0 0 3px ${TINTA}, 0 5px 0 ${TINTA}` }}
    >
      {children}
    </button>
  );
}

function LobbyDaTrilha({
  robos,
  setRobos,
  onSozinho,
  onRobos,
  onRegras,
  grupo,
}: {
  robos: number;
  setRobos: (n: number) => void;
  onSozinho: () => void;
  onRobos: () => void;
  onRegras: () => void;
  grupo: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-4 sm:p-7 md:grid-cols-[minmax(0,1fr)_17rem]">
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: PAPELAO, color: TINTA, boxShadow: `0 0 0 3px ${TINTA}` }}>
            <Arte nome="owl" className="h-10 w-10" />
          </span>
          <div>
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide">Trilha do Saber</h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#fbf3e0]">{NOMES.trilha.tipo}</p>
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">
          Responda perguntas de 14 categorias: acertou, anda duas casas (e mais uma se for rápido). Casas de estrela e ponte, e uma curiosidade a cada rodada. Chega primeiro ao fim da trilha quem sabe mais.
        </p>

        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Como quer jogar?</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <BotaoDeTabuleiro onClick={onSozinho}>
            <span className="flex items-center gap-2 font-display text-lg font-extrabold uppercase">
              <Arte nome="chess-pawn" className="h-5 w-5" /> Sozinho
            </span>
            <span className="mt-0.5 block text-xs opacity-75">Só você e o tabuleiro, no seu ritmo.</span>
          </BotaoDeTabuleiro>
          <div className="rounded-2xl p-3" style={{ background: '#fde68a', color: TINTA, boxShadow: `0 0 0 3px ${TINTA}, 0 5px 0 ${TINTA}` }}>
            <button type="button" onClick={onRobos} className="w-full text-left">
              <span className="flex items-center gap-2 font-display text-lg font-extrabold uppercase">
                <Arte nome="brain" className="h-5 w-5" /> Contra o computador
              </span>
              <span className="mt-0.5 block text-xs opacity-75">
                {ROBOS_DA_TRILHA.slice(0, robos)
                  .map((r) => r.nome)
                  .join(', ')}{' '}
                {robos === 1 ? 'joga' : 'jogam'} com você.
              </span>
            </button>
            <div className="mt-2 flex items-center gap-1.5" role="group" aria-label="Quantos adversários">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRobos(n)}
                  aria-pressed={robos === n}
                  className="h-7 w-7 rounded-lg text-xs font-extrabold"
                  style={robos === n ? { background: TINTA, color: PAPELAO } : { background: 'rgba(43,33,24,.12)' }}
                >
                  {n}
                </button>
              ))}
              <span className="ml-1 text-[11px] font-semibold opacity-70">adversários</span>
            </div>
          </div>
        </div>

        <div className="mt-6">{grupo}</div>

        <button type="button" onClick={onRegras} className="mt-5 text-xs font-semibold text-white/80 underline-offset-2 hover:underline">
          Ver as regras completas
        </button>
      </div>

      {/* Miniatura do tabuleiro */}
      <div className="grid grid-cols-5 gap-1.5 self-start rounded-2xl p-3 md:mt-16" style={{ background: PAPELAO, boxShadow: `0 0 0 3px ${TINTA}, 0 8px 0 ${TINTA}` }} aria-hidden>
        {CATEGORIAS_DO_QUIZ.slice(0, 14)
          .concat(CATEGORIAS_DO_QUIZ.slice(0, 1))
          .map((c, i) => (
            <span key={i} className="flex aspect-square items-center justify-center rounded-lg font-display text-[10px] font-bold text-white" style={{ background: c.cor, boxShadow: `0 0 0 2px ${TINTA}` }}>
              {i === 6 ? '★' : i + 1}
            </span>
          ))}
      </div>
    </div>
  );
}

function LobbyDoArcanos({ onRobo, onRegras, grupo }: { onRobo: () => void; onRegras: () => void; grupo: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-7">
      <div className="flex items-center gap-3">
        <Arte nome="spell-book" className="h-14 w-14" style={{ color: OURO, filter: 'drop-shadow(0 0 10px rgba(212,175,55,.5))' }} />
        <div>
          <h2 className="fonte-arcana text-3xl font-black text-[#fdf6e3]">Arcanos</h2>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f5d77a' }}>
            {NOMES.arcanos.tipo} · duelo de escolas
          </p>
        </div>
      </div>
      <p className="fonte-pergaminho mt-3 max-w-2xl text-base leading-relaxed text-[#fdf6e3]/90">
        Duelo de magia no estilo dos grandes jogos de cartas: escolha duas das cinco escolas ({(Object.keys(ESCOLAS) as Escola[]).map((e) => ESCOLAS[e].nome).join(', ')}), invoque criaturas, lance feitiços, ataque e bloqueie. Quem zerar a vida do outro vence.
      </p>

      <div className="-mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-7 sm:px-7" aria-label="Algumas cartas">
        {VITRINE_DE_CARTAS.map((id) => (
          <CartaGrande key={id} id={id} largura={140} />
        ))}
      </div>

      <p className="fonte-arcana mt-5 text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: OURO }}>
        Escolha seu duelo
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={onRobo}
          className="rounded-2xl p-4 text-left transition hover:brightness-110"
          style={{ background: 'linear-gradient(180deg,#f5d77a,#d4af37)', color: '#1c1208', boxShadow: '0 0 0 1px #fde68a, 0 6px 18px rgba(0,0,0,.45)' }}
        >
          <span className="fonte-arcana flex items-center gap-2 text-lg font-black">
            <Arte nome="wizard-face" className="h-6 w-6" /> Contra o computador
          </span>
          <span className="fonte-pergaminho mt-0.5 block text-sm opacity-80">O {ROBO_DO_ARCANOS.nome} escolhe duas escolas e aceita o desafio na hora.</span>
        </button>
        <div>{grupo}</div>
      </div>

      <button type="button" onClick={onRegras} className="mt-5 text-xs font-semibold text-[#fef3c7]/80 underline-offset-2 hover:underline">
        Ver as regras completas
      </button>
    </div>
  );
}

/** Jogar com o grupo: ao vivo (dentro do grupo) ou atalho para um grupo. */
function ModoEmGrupo({
  jogo,
  canal,
  aoVivo,
  mesas,
  grupos,
  aoCriarGrupo,
  onAbrir,
  onEntrar,
}: {
  jogo: JogoId;
  canal: CanalDeJogos | null;
  aoVivo: boolean;
  mesas: MesaAnunciada[];
  grupos?: GrupoResumo[];
  aoCriarGrupo?: () => void;
  onAbrir: () => void;
  onEntrar: (m: MesaAnunciada) => void;
}) {
  const arcano = jogo === 'arcanos';
  const caixa: React.CSSProperties = arcano
    ? { background: 'rgba(0,0,0,.35)', boxShadow: '0 0 0 1px rgba(212,175,55,.45)' }
    : { background: 'rgba(0,0,0,.22)', boxShadow: '0 0 0 2px rgba(251,243,224,.35)' };
  const titulo = arcano ? 'fonte-arcana text-lg font-black text-[#fdf6e3]' : 'font-display text-lg font-extrabold uppercase';
  const botao: React.CSSProperties = arcano ? { background: 'linear-gradient(180deg,#f5d77a,#d4af37)', color: '#1c1208' } : { background: PAPELAO, color: TINTA };

  // Fora de um grupo: leva para um dos grupos da pessoa.
  if (!canal) {
    const ativos = (grupos ?? []).filter((g) => g.myStatus === 'ativo');
    return (
      <div className="rounded-2xl p-4" style={caixa}>
        <p className={`flex items-center gap-2 ${titulo}`}>
          <Icon name="users" size={18} /> Com o grupo, ao vivo
        </p>
        <p className="mt-1 text-xs text-white/70">As mesas ao vivo abrem dentro de um grupo: quem estiver lá entra, e o resto assiste.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ativos.length === 0 ? (
            aoCriarGrupo && (
              <button type="button" onClick={aoCriarGrupo} className="rounded-xl px-3 py-1.5 text-xs font-bold" style={botao}>
                Criar um grupo para jogar
              </button>
            )
          ) : (
            ativos.slice(0, 6).map((g) => (
              <Link key={g.id} href={`/comunidade/${g.id}?aba=jogos&jogo=${jogo}`} className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-bold" style={botao}>
                <Avatar nome={g.name} path={g.imagePath} tamanho={22} quadrado />
                {g.name}
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4" style={caixa}>
      <p className={`flex items-center gap-2 ${titulo}`}>
        <Icon name="users" size={18} /> Com o grupo, ao vivo
      </p>
      <p className="mt-1 text-xs text-white/70">
        {canal.estado === 'erro'
          ? 'A sala ao vivo do grupo não conectou agora. Jogue sozinho ou contra o computador enquanto isso.'
          : canal.estado === 'conectando'
            ? 'Entrando na sala ao vivo…'
            : arcano
              ? 'Abra um duelo: quem estiver na sala de jogos aceita, o resto assiste.'
              : 'Abra uma mesa: quem estiver na sala de jogos entra na sua partida.'}
      </p>
      <button type="button" onClick={onAbrir} disabled={!aoVivo} className="mt-3 rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-45" style={botao}>
        {arcano ? 'Abrir duelo no grupo' : 'Abrir mesa no grupo'}
      </button>
      {mesas.length > 0 && (
        <ul className="mt-3 space-y-2">
          {mesas.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-xl p-2" style={{ background: 'rgba(0,0,0,.25)' }}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">Mesa de {m.hostNome.split(' ')[0]}</span>
                <span className="block truncate text-[11px] text-white/60">
                  {m.estado === 'aberta' ? (arcano ? 'procurando desafiante' : 'aberta para entrar') : 'jogando agora'}
                  {m.detalhe ? ` · ${m.detalhe}` : ''}
                </span>
              </span>
              <button type="button" onClick={() => onEntrar(m)} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold" style={botao}>
                {m.estado === 'aberta' ? (arcano ? 'Aceitar' : 'Entrar') : 'Assistir'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
