'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon, { type IconName } from '../../icons';
import Avatar from '../../Avatar';
import Arte from './Arte';
import { RegrasDaTrilha } from './Regras';
import { CATEGORIAS_DO_QUIZ, PERGUNTAS, type CategoriaDoQuiz } from '@/lib/jogos/perguntas';
import {
  CASAS,
  ESPECIAIS,
  SEGUNDOS_POR_PERGUNTA,
  acabou,
  classificacao,
  corDaCasa,
  corDaCategoria,
  entrar,
  novaTrilha,
  revelar,
  rotuloDaCategoria,
  sair as sairDaTrilha,
  sortearCategoria,
  sortearPergunta,
  type EstadoTrilha,
} from '@/lib/jogos/trilha';
import { novoId, type Mensagem } from '@/lib/jogos/canal';
import type { CanalDeJogos } from '@/lib/jogos/sala-local';

type Canal = CanalDeJogos;
type Eu = { userId: string; nome: string; avatar: string | null };

// Estética de jogo de tabuleiro: feltro verde-petróleo, tabuleiro de papelão
// creme com contorno grosso, casas coloridas por categoria e peões com a foto.
const FELTRO = 'radial-gradient(ellipse at 50% 30%, #17585a 0%, #0e3b3d 60%, #082627 100%)';
const PAPELAO = '#fbf3e0';
const TINTA = '#2b2118';
const OPCOES = ['#e11d48', '#2563eb', '#d97706', '#16a34a'];
const LETRAS = ['A', 'B', 'C', 'D'];
const TEMPO_ROLETA = 2800;
const TEMPO_REVELACAO = 7500;

const ICONE: Record<CategoriaDoQuiz, IconName> = {
  tecnologia: 'cpu', musica: 'music', moda: 'shirt', cultura: 'masks', esporte: 'activity', cinema: 'film', livros: 'book',
  gastronomia: 'utensils', viagem: 'plane', games: 'gamepad', 'bem-estar': 'heart', arte: 'palette', brasil: 'flag', ciencia: 'bulb',
};
const categoriaDaCasa = (i: number): CategoriaDoQuiz | null => (i === 0 || i === CASAS ? null : CATEGORIAS_DO_QUIZ[(i - 1) % CATEGORIAS_DO_QUIZ.length].id);

interface Props {
  canal: Canal;
  /** Sem grupo (jogo local): o placar não é gravado. */
  groupId?: string | null;
  mesa: string;
  papel: 'host' | 'jogador' | 'espectador';
  eu: Eu;
  hostNome?: string;
  /** Mesa só deste aparelho (sozinho ou contra o computador). */
  local?: boolean;
  aoSair: () => void;
  /** O palco chama isto no "Fechar jogo". */
  fecharRef?: React.MutableRefObject<(() => void) | null>;
}

interface Privado {
  n: number;
  correta: number;
  curiosidade: string;
  inicio: number;
  respostas: Record<string, { opcao: number; ms: number }>;
}

export default function TrilhaDoSaber({ canal, groupId, mesa, papel, eu, hostNome, local = false, aoSair, fecharRef }: Props) {
  const { enviar, ouvir, anunciar, presentes } = canal;
  const [estado, setEstado] = useState<EstadoTrilha | null>(() => (papel === 'host' ? novaTrilha(mesa, eu) : null));
  const [fimLocal, setFimLocal] = useState(0);
  const [minha, setMinha] = useState<{ n: number; opcao: number } | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const [regras, setRegras] = useState(false);
  const [roleta, setRoleta] = useState<CategoriaDoQuiz | null>(null);
  const [colunas, setColunas] = useState(8);
  const estadoRef = useRef<EstadoTrilha | null>(estado);
  const privado = useRef<Privado | null>(null);
  const gravado = useRef('');
  const ausenteDesde = useRef<number | null>(null);
  const anunciado = useRef('');

  const souHost = estado?.host === eu.userId;
  const souJogador = Boolean(estado?.jogadores.some((j) => j.userId === eu.userId));

  // Publica o estado (só quem comanda a mesa).
  const publicar = useCallback(
    (e: EstadoTrilha) => {
      const restante = e.fase === 'pergunta' && privado.current ? Math.max(0, privado.current.inicio + SEGUNDOS_POR_PERGUNTA * 1000 - Date.now()) : 0;
      const pronto = { ...e, restanteMs: restante, seq: e.seq + 1 };
      estadoRef.current = pronto;
      setEstado(pronto);
      if (pronto.fase === 'pergunta') setFimLocal(Date.now() + restante);
      enviar(mesa, 'tri:estado', { estado: pronto });
      // O lobby só precisa saber quando a mesa muda de fase ou de gente.
      const chave = `${pronto.fase === 'lobby' ? 'aberta' : 'jogando'}:${pronto.jogadores.length}:${pronto.totalRodadas}`;
      if (chave === anunciado.current) return;
      anunciado.current = chave;
      void anunciar({
        id: mesa,
        jogo: 'trilha',
        host: eu.userId,
        hostNome: eu.nome,
        estado: pronto.fase === 'lobby' ? 'aberta' : 'jogando',
        jogadores: pronto.jogadores.map((j) => j.userId),
        detalhe: `${pronto.totalRodadas} rodadas · ${pronto.jogadores.length} ${pronto.jogadores.length === 1 ? 'jogador' : 'jogadores'}`,
      });
    },
    [enviar, anunciar, mesa, eu.userId, eu.nome],
  );

  useEffect(() => {
    const f = () => setColunas(window.innerWidth < 640 ? 6 : 8);
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  // Anfitrião abre a mesa; jogadores pedem para entrar; quem assiste pede o estado.
  useEffect(() => {
    if (papel === 'host') {
      if (estadoRef.current) publicar(estadoRef.current);
      return () => void anunciar(null);
    }
    const pedir = () => {
      const e = estadoRef.current;
      if (papel === 'jogador' && (!e || (e.fase === 'lobby' && !e.jogadores.some((j) => j.userId === eu.userId)))) {
        enviar(mesa, 'tri:entrar', { nome: eu.nome, avatar: eu.avatar });
      } else if (!e) enviar(mesa, 'tri:pedir', {});
    };
    pedir();
    const t = window.setInterval(pedir, 3000);
    return () => window.clearInterval(t);
  }, [papel]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Comando da mesa (anfitrião) -------------------------------------------------
  const perguntar = useCallback(
    (e: EstadoTrilha) => {
      const cat = e.categoria ?? sortearCategoria(e);
      const { pergunta, opcoes, correta } = sortearPergunta(e, cat);
      const n = (e.pergunta?.n ?? 0) + 1;
      privado.current = { n, correta, curiosidade: pergunta.x, inicio: Date.now(), respostas: {} };
      setMinha(null);
      publicar({ ...e, fase: 'pergunta', categoria: cat, pergunta: { texto: pergunta.p, opcoes, nivel: pergunta.nivel, n }, respondidos: [], revelacao: null, usadas: [...e.usadas, pergunta.id] });
    },
    [publicar],
  );

  const girar = useCallback(
    (e: EstadoTrilha) => {
      const categoria = sortearCategoria(e);
      publicar({ ...e, fase: 'roleta', rodada: e.rodada + 1, categoria, pergunta: null, revelacao: null, respondidos: [] });
    },
    [publicar],
  );

  const fecharRodada = useCallback(() => {
    const e = estadoRef.current;
    const p = privado.current;
    if (!e || !p || e.fase !== 'pergunta') return;
    publicar(revelar(e, p.correta, p.curiosidade, p.respostas));
  }, [publicar]);

  const registrarResposta = useCallback(
    (userId: string, n: number, opcao: number) => {
      const e = estadoRef.current;
      const p = privado.current;
      if (!e || !p || e.fase !== 'pergunta' || n !== p.n || p.respostas[userId] || !e.jogadores.some((j) => j.userId === userId)) return;
      if (!Number.isInteger(opcao) || opcao < 0 || opcao > 3) return;
      p.respostas[userId] = { opcao, ms: Date.now() - p.inicio };
      const proximo = { ...e, respondidos: [...e.respondidos, userId] };
      if (proximo.respondidos.length >= proximo.jogadores.length) {
        estadoRef.current = proximo;
        fecharRodada();
      } else publicar(proximo);
    },
    [publicar, fecharRodada],
  );

  /** Passo a comandar a mesa: a pergunta em curso recomeça (a resposta certa sai do banco). */
  const assumir = useCallback(
    (base: EstadoTrilha) => {
      estadoRef.current = base;
      anunciado.current = '';
      if (base.fase === 'pergunta' && base.pergunta) {
        const p = PERGUNTAS.find((x) => x.p === base.pergunta!.texto);
        if (p) {
          privado.current = { n: base.pergunta.n + 1, correta: base.pergunta.opcoes.indexOf(p.o[0]), curiosidade: p.x, inicio: Date.now(), respostas: {} };
          setMinha(null);
          publicar({ ...base, respondidos: [], pergunta: { ...base.pergunta, n: base.pergunta.n + 1 } });
          return;
        }
      }
      if (base.fase === 'pergunta' || base.fase === 'roleta') girar({ ...base, rodada: Math.max(0, base.rodada - 1) });
      else publicar(base);
    },
    [publicar, girar],
  );

  // Relógio do anfitrião: roleta → pergunta → revelação → próxima rodada.
  useEffect(() => {
    if (!estado || !souHost) return;
    let t: number | undefined;
    if (estado.fase === 'roleta') t = window.setTimeout(() => estadoRef.current && perguntar(estadoRef.current), TEMPO_ROLETA);
    else if (estado.fase === 'pergunta') {
      const p = privado.current;
      const resta = p ? Math.max(0, p.inicio + SEGUNDOS_POR_PERGUNTA * 1000 - Date.now()) : 0;
      t = window.setTimeout(fecharRodada, resta + 300);
    } else if (estado.fase === 'revelacao') {
      t = window.setTimeout(() => {
        const e = estadoRef.current;
        if (!e) return;
        if (acabou(e)) publicar({ ...e, fase: 'fim' });
        else girar(e);
      }, TEMPO_REVELACAO);
    }
    return () => window.clearTimeout(t);
  }, [estado?.fase, estado?.rodada, estado?.pergunta?.n, souHost]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reenvia o estado de tempos em tempos (para quem chega e para quem perdeu algo).
  useEffect(() => {
    if (!souHost) return;
    const t = window.setInterval(() => estadoRef.current && publicar(estadoRef.current), 5000);
    return () => window.clearInterval(t);
  }, [souHost, publicar]);

  // Fim: grava o placar (uma vez por partida).
  useEffect(() => {
    if (!estado || estado.fase !== 'fim' || !souHost || !groupId || gravado.current === estado.partida) return;
    gravado.current = estado.partida;
    const [primeiro] = classificacao(estado);
    void fetch(`/api/comunidade/grupos/${groupId}/jogos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mesa: estado.partida,
        jogo: 'trilha',
        vencedor: estado.vencedores.length === 1 ? estado.vencedores[0] : null,
        jogadores: estado.jogadores.map((j) => j.userId),
        resumo: primeiro ? `${primeiro.nome} chegou à casa ${primeiro.casa} com ${primeiro.acertos} acertos` : null,
      }),
    }).catch(() => undefined);
  }, [estado, souHost, groupId]);

  // --- Mensagens -------------------------------------------------------------------
  useEffect(() => {
    return ouvir((m: Mensagem) => {
      if (m.mesa !== mesa) return;
      const e = estadoRef.current;
      const comando = e?.host === eu.userId;
      switch (m.tipo) {
        case 'tri:estado': {
          const novo = m.estado as EstadoTrilha;
          if (!novo || comando) return;
          // Quem saiu me passou o comando.
          if (novo.host === eu.userId) {
            assumir(novo);
            return;
          }
          if (e && novo.host === e.host && novo.seq <= e.seq) return;
          estadoRef.current = novo;
          setEstado(novo);
          if (novo.fase === 'pergunta') setFimLocal(Date.now() + novo.restanteMs);
          return;
        }
        case 'tri:entrar':
          if (comando && e && e.fase === 'lobby') publicar(entrar(e, { userId: m.de, nome: String(m.nome ?? 'Alguém').slice(0, 40), avatar: (m.avatar as string | null) ?? null }));
          else if (comando && e) publicar(e);
          return;
        case 'tri:pedir':
          if (comando && e) publicar(e);
          return;
        case 'tri:sair':
          if (comando && e) publicar(sairDaTrilha(e, m.de));
          return;
        case 'tri:resposta':
          if (comando) registrarResposta(m.de, Number(m.n), Number(m.opcao));
          return;
      }
    });
  }, [ouvir, mesa, eu.userId, publicar, registrarResposta, assumir]);

  // Quem comandava saiu: o próximo jogador presente assume a mesa.
  useEffect(() => {
    const e = estadoRef.current;
    if (!e || e.host === eu.userId || e.fase === 'fim') {
      ausenteDesde.current = null;
      return;
    }
    const hostPresente = presentes.some((p) => p.userId === e.host);
    if (hostPresente) {
      ausenteDesde.current = null;
      return;
    }
    ausenteDesde.current = ausenteDesde.current ?? Date.now();
    if (Date.now() - ausenteDesde.current < 6000) return;
    const proximo = e.jogadores.find((j) => j.userId !== e.host && presentes.some((p) => p.userId === j.userId));
    if (proximo?.userId !== eu.userId) return;
    assumir(sairDaTrilha({ ...e, host: eu.userId }, e.host));
  }, [presentes, agora]); // eslint-disable-line react-hooks/exhaustive-deps

  // Roleta: as categorias passam rápido e param na sorteada.
  useEffect(() => {
    if (estado?.fase !== 'roleta') return;
    const cats = estado.categorias;
    let i = 0;
    const inicio = Date.now();
    const t = window.setInterval(() => {
      if (Date.now() - inicio > TEMPO_ROLETA - 700) {
        setRoleta(estado.categoria);
        window.clearInterval(t);
        return;
      }
      i = (i + 1) % cats.length;
      setRoleta(cats[i]);
    }, 90);
    return () => window.clearInterval(t);
  }, [estado?.fase, estado?.rodada]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Ações --------------------------------------------------------------------------
  const responder = (opcao: number) => {
    const e = estadoRef.current;
    if (!e || e.fase !== 'pergunta' || !e.pergunta || !souJogador || minha?.n === e.pergunta.n) return;
    setMinha({ n: e.pergunta.n, opcao });
    if (souHost) registrarResposta(eu.userId, e.pergunta.n, opcao);
    else enviar(mesa, 'tri:resposta', { n: e.pergunta.n, opcao });
  };

  const comecar = () => {
    const e = estadoRef.current;
    if (!e || !souHost) return;
    girar({ ...e, partida: novoId(), rodada: 0, usadas: [], vencedores: [], jogadores: e.jogadores.map((j) => ({ ...j, casa: 0, pontos: 0, acertos: 0 })) });
  };

  const deNovo = () => {
    const e = estadoRef.current;
    if (!e || !souHost) return;
    publicar({ ...e, fase: 'lobby', rodada: 0, categoria: null, pergunta: null, revelacao: null, vencedores: [], jogadores: e.jogadores.map((j) => ({ ...j, casa: 0, pontos: 0, acertos: 0 })) });
  };

  const sair = () => {
    const e = estadoRef.current;
    if (e && souJogador && e.fase !== 'fim' && e.fase !== 'lobby' && !window.confirm('Sair da partida agora? Seu peão sai do tabuleiro.')) return;
    if (!souHost) enviar(mesa, 'tri:sair', {});
    else if (e && e.jogadores.length > 1 && e.fase !== 'fim') {
      // Passa o comando para a próxima pessoa antes de sair.
      const resto = sairDaTrilha(e, eu.userId);
      enviar(mesa, 'tri:estado', { estado: { ...resto, host: resto.jogadores[0].userId, seq: e.seq + 1 } });
    }
    void anunciar(null);
    aoSair();
  };
  if (fecharRef) fecharRef.current = sair;

  // --- Desenho --------------------------------------------------------------------------
  const ranking = useMemo(() => (estado ? classificacao(estado) : []), [estado]);
  const restante = estado?.fase === 'pergunta' ? Math.max(0, fimLocal - agora) : 0;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden text-white" style={{ background: FELTRO }}>
      <header className="flex items-center gap-3 border-b border-white/15 px-3 py-2 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: PAPELAO, color: TINTA, boxShadow: `0 0 0 2px ${TINTA}` }}>
          <Arte nome="owl" className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold uppercase leading-none tracking-wide">Trilha do Saber</p>
          <p className="truncate text-[11px] text-white/65">
            {estado ? (estado.fase === 'lobby' ? 'Mesa aberta · esperando começar' : estado.fase === 'fim' ? 'Partida encerrada' : `Rodada ${estado.rodada} de ${estado.totalRodadas}`) : `Mesa de ${hostNome ?? 'alguém do grupo'}`}
            {souJogador ? '' : ' · assistindo'}
            {local ? (estado && estado.jogadores.length > 1 ? ' · contra o computador' : ' · sozinho') : ''}
          </p>
        </div>
        <button type="button" onClick={() => setRegras(true)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10">Regras</button>
      </header>

      {!estado ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <Arte nome="dice-six-faces-five" className="h-16 w-16 animate-bounce" style={{ color: PAPELAO }} />
          <p className="font-display text-xl font-bold">Entrando na mesa…</p>
          <p className="text-sm text-white/70">Se demorar, a mesa pode ter fechado.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Painel: lobby, roleta, pergunta, revelação, pódio */}
            <div className="order-1 lg:order-2">
              <Painel
                estado={estado}
                eu={eu}
                souHost={souHost}
                souJogador={souJogador}
                minha={minha}
                restante={restante}
                roleta={roleta}
                onResponder={responder}
                onComecar={comecar}
                onDeNovo={deNovo}
                onConfig={(mudanca) => souHost && publicar({ ...estado, ...mudanca })}
                local={local}
                comPlacar={Boolean(groupId)}
              />
              <Placar estado={estado} ranking={ranking} eu={eu.userId} />
            </div>

            {/* Tabuleiro */}
            <div className="order-2 lg:order-1">
              <Tabuleiro estado={estado} colunas={colunas} />
            </div>
          </div>
        </div>
      )}

      {regras && (
        <div className="fixed inset-0 z-[78] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Regras da Trilha do Saber">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-zinc-900 p-5 sm:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-zinc-50">Como jogar a Trilha do Saber</h2>
              <button type="button" onClick={() => setRegras(false)} aria-label="Fechar" className="rounded-full p-2 text-zinc-400 hover:text-zinc-100">
                <Icon name="close" size={18} />
              </button>
            </div>
            <RegrasDaTrilha />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabuleiro
// ---------------------------------------------------------------------------

/** O peão: a foto da pessoa, ou um disco na cor dela com a inicial. */
function Peao({ nome, avatar, cor, tamanho }: { nome: string; avatar: string | null; cor: string; tamanho: number }) {
  if (avatar) return <Avatar nome={nome} path={avatar} tamanho={tamanho} />;
  return (
    <span className="flex items-center justify-center rounded-full font-display font-extrabold text-white" style={{ width: tamanho, height: tamanho, background: cor, fontSize: tamanho * 0.48 }}>
      {nome.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

function posicao(i: number, colunas: number) {
  const linha = Math.floor(i / colunas);
  const col = linha % 2 === 0 ? i % colunas : colunas - 1 - (i % colunas);
  return { linha, col };
}

function Tabuleiro({ estado, colunas }: { estado: EstadoTrilha; colunas: number }) {
  const linhas = Math.ceil((CASAS + 1) / colunas);
  const porCasa = new Map<number, string[]>();
  for (const j of estado.jogadores) porCasa.set(j.casa, [...(porCasa.get(j.casa) ?? []), j.userId]);

  return (
    <div className="rounded-[1.75rem] p-3 sm:p-4" style={{ background: PAPELAO, boxShadow: `0 0 0 3px ${TINTA}, 0 18px 40px rgba(0,0,0,.45)` }}>
      <div className="relative grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${linhas}, minmax(0, 1fr))` }}>
        {Array.from({ length: CASAS + 1 }, (_, i) => {
          const { linha, col } = posicao(i, colunas);
          const cat = categoriaDaCasa(i);
          const especial = ESPECIAIS[i];
          const ponta = i === 0 || i === CASAS;
          return (
            <div
              key={i}
              className="relative flex aspect-square flex-col items-center justify-center rounded-xl text-white"
              style={{ gridRow: linha + 1, gridColumn: col + 1, background: corDaCasa(i), boxShadow: `0 0 0 2px ${TINTA}, inset 0 -4px 0 rgba(0,0,0,.18)` }}
              title={ponta ? (i === 0 ? 'Partida' : 'Chegada') : `${i} · ${rotuloDaCategoria(cat)}${especial ? (especial.tipo === 'estrela' ? ' · estrela: +1' : ` · ponte até a casa ${especial.para}`) : ''}`}
            >
              {ponta ? (
                <>
                  <Arte nome={i === 0 ? 'chess-pawn' : 'laurels-trophy'} className="h-[45%] w-[45%]" style={{ color: '#fde68a' }} />
                  <span className="font-display text-[9px] font-extrabold uppercase tracking-wide sm:text-[11px]">{i === 0 ? 'Partida' : 'Chegada'}</span>
                </>
              ) : (
                <>
                  <span className="absolute left-1 top-0.5 font-display text-[9px] font-bold opacity-80 sm:text-[11px]">{i}</span>
                  {cat && <Icon name={ICONE[cat]} size={16} className="opacity-90" />}
                  {especial?.tipo === 'estrela' && <span className="absolute bottom-0.5 right-1 text-xs text-yellow-200 sm:text-sm">★</span>}
                  {especial?.tipo === 'ponte' && <span className="absolute bottom-0.5 right-1 rounded bg-black/35 px-1 font-display text-[8px] font-bold sm:text-[10px]">→{especial.para}</span>}
                </>
              )}
            </div>
          );
        })}

        {/* Peões por cima (andam com transição) */}
        {estado.jogadores.map((j) => {
          const { linha, col } = posicao(Math.min(j.casa, CASAS), colunas);
          const juntos = porCasa.get(j.casa) ?? [j.userId];
          const k = juntos.indexOf(j.userId);
          const dx = juntos.length > 1 ? ((k % 3) - 1) * 26 : 0;
          const dy = juntos.length > 1 ? (Math.floor(k / 3) - 0.5) * 26 : 0;
          return (
            <span
              key={j.userId}
              className="pointer-events-none absolute z-10 flex items-center justify-center transition-all duration-700 ease-out"
              style={{
                width: `calc(100% / ${colunas})`,
                height: `calc(100% / ${linhas})`,
                left: `calc(100% / ${colunas} * ${col})`,
                top: `calc(100% / ${linhas} * ${linha})`,
                transform: `translate(${dx}%, ${dy}%)`,
              }}
              title={`${j.nome}: casa ${j.casa}`}
            >
              <span className="rounded-full" style={{ boxShadow: `0 0 0 3px ${j.cor}, 0 0 0 5px ${TINTA}, 0 6px 10px rgba(0,0,0,.45)` }}>
                <Peao nome={j.nome} avatar={j.avatar} cor={j.cor} tamanho={colunas === 6 ? 24 : 32} />
              </span>
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold sm:text-[11px]" style={{ color: TINTA }}>
        {CATEGORIAS_DO_QUIZ.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.cor, boxShadow: `0 0 0 1px ${TINTA}` }} /> {c.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel central
// ---------------------------------------------------------------------------

function Cartao({ children, cor }: { children: React.ReactNode; cor?: string }) {
  return (
    <div className="overflow-hidden rounded-3xl" style={{ background: PAPELAO, color: TINTA, boxShadow: `0 0 0 3px ${TINTA}, 0 14px 30px rgba(0,0,0,.4)` }}>
      {cor && <div className="h-2.5" style={{ background: cor }} />}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function Painel({
  estado,
  eu,
  souHost,
  souJogador,
  minha,
  restante,
  roleta,
  onResponder,
  onComecar,
  onDeNovo,
  onConfig,
  local,
  comPlacar,
}: {
  estado: EstadoTrilha;
  eu: Eu;
  souHost: boolean;
  souJogador: boolean;
  minha: { n: number; opcao: number } | null;
  restante: number;
  roleta: CategoriaDoQuiz | null;
  onResponder: (i: number) => void;
  onComecar: () => void;
  onDeNovo: () => void;
  onConfig: (m: Partial<EstadoTrilha>) => void;
  local: boolean;
  comPlacar: boolean;
}) {
  const host = estado.jogadores.find((j) => j.userId === estado.host);

  if (estado.fase === 'lobby') {
    return (
      <Cartao cor="#e11d48">
        <p className="font-display text-2xl font-extrabold uppercase">Mesa aberta</p>
        <p className="mt-1 text-sm opacity-80">{estado.jogadores.length} {estado.jogadores.length === 1 ? 'pessoa' : 'pessoas'} na mesa. {local ? (estado.jogadores.length > 1 ? 'Os adversários do computador já sentaram.' : 'Só você: vença o tabuleiro no seu tempo.') : 'Quem estiver na sala de jogos do grupo pode entrar.'}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {estado.jogadores.map((j) => (
            <li key={j.userId} className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-semibold" style={{ boxShadow: `0 0 0 2px ${j.cor}` }}>
              <Peao nome={j.nome} avatar={j.avatar} cor={j.cor} tamanho={24} /> {j.nome.split(' ')[0]}
              {j.userId === estado.host && <span className="text-[10px] opacity-60">anfitrião</span>}
            </li>
          ))}
        </ul>
        {souHost ? (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">Rodadas</p>
              <div className="mt-1 flex gap-1.5">
                {[8, 12, 16, 20].map((n) => (
                  <button key={n} type="button" onClick={() => onConfig({ totalRodadas: n })} className="rounded-xl px-3 py-1.5 font-display text-sm font-bold" style={estado.totalRodadas === n ? { background: TINTA, color: PAPELAO } : { boxShadow: `inset 0 0 0 2px ${TINTA}` }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">Categorias ({estado.categorias.length})</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {CATEGORIAS_DO_QUIZ.map((c) => {
                  const ativa = estado.categorias.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={ativa}
                      onClick={() => {
                        const nova = ativa ? estado.categorias.filter((x) => x !== c.id) : [...estado.categorias, c.id];
                        if (nova.length >= 3) onConfig({ categorias: nova });
                      }}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition"
                      style={ativa ? { background: c.cor, color: '#fff', boxShadow: `0 0 0 2px ${TINTA}` } : { boxShadow: `inset 0 0 0 1.5px ${TINTA}55`, opacity: 0.6 }}
                    >
                      <Icon name={ICONE[c.id]} size={12} /> {c.rotulo}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] opacity-60">Mínimo de 3 categorias.</p>
            </div>
            <button type="button" onClick={onComecar} className="w-full rounded-2xl py-3 font-display text-lg font-extrabold uppercase tracking-wide text-white" style={{ background: 'linear-gradient(180deg,#f43f5e,#be123c)', boxShadow: `0 0 0 3px ${TINTA}, 0 6px 0 ${TINTA}` }}>
              Começar a partida
            </button>
            {estado.jogadores.length === 1 && !local && <p className="text-center text-xs opacity-70">Dá para jogar sozinho, mas é bem mais divertido com o grupo.</p>}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl p-3 text-center text-sm font-semibold" style={{ boxShadow: `inset 0 0 0 2px ${TINTA}33` }}>
            {souJogador ? `Você está na mesa. Esperando ${host?.nome.split(' ')[0] ?? 'o anfitrião'} começar…` : 'A partida vai começar. Você está assistindo.'}
          </p>
        )}
      </Cartao>
    );
  }

  if (estado.fase === 'roleta') {
    const cat = roleta ?? estado.categoria;
    return (
      <Cartao cor={corDaCategoria(cat)}>
        <p className="text-xs font-bold uppercase tracking-[0.25em] opacity-70">Rodada {estado.rodada} · a roleta decide</p>
        <div className="mt-3 flex items-center gap-3 rounded-2xl p-4 text-white transition-colors duration-100" style={{ background: corDaCategoria(cat), boxShadow: `0 0 0 3px ${TINTA}` }}>
          {cat && <Icon name={ICONE[cat]} size={34} />}
          <span className="font-display text-3xl font-extrabold uppercase">{rotuloDaCategoria(cat)}</span>
        </div>
      </Cartao>
    );
  }

  if (estado.fase === 'pergunta' && estado.pergunta) {
    const respondi = minha?.n === estado.pergunta.n;
    const segundos = Math.ceil(restante / 1000);
    return (
      <Cartao cor={corDaCategoria(estado.categoria)}>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: corDaCategoria(estado.categoria) }}>
            {estado.categoria && <Icon name={ICONE[estado.categoria]} size={12} />} {rotuloDaCategoria(estado.categoria)}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-xs font-semibold opacity-70">{'★'.repeat(estado.pergunta.nivel)}</span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full font-display text-lg font-extrabold" style={{ background: `conic-gradient(${segundos <= 5 ? '#e11d48' : TINTA} ${(restante / (SEGUNDOS_POR_PERGUNTA * 1000)) * 360}deg, #e7dcc4 0deg)` }}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: PAPELAO }}>{segundos}</span>
            </span>
          </span>
        </div>
        <p className="mt-3 font-display text-xl font-bold leading-snug sm:text-2xl">{estado.pergunta.texto}</p>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {estado.pergunta.opcoes.map((o, i) => {
            const escolhida = respondi && minha?.opcao === i;
            return (
              <button
                key={i}
                type="button"
                disabled={!souJogador || respondi || restante <= 0}
                onClick={() => onResponder(i)}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-default sm:text-base"
                style={{
                  background: OPCOES[i],
                  boxShadow: escolhida ? `0 0 0 4px ${TINTA}, 0 0 0 7px #fde68a` : `0 0 0 3px ${TINTA}, 0 4px 0 ${TINTA}`,
                  opacity: respondi && !escolhida ? 0.55 : 1,
                }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/25 font-display text-lg font-extrabold">{LETRAS[i]}</span>
                {o}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs font-semibold opacity-70">
          {!souJogador ? 'Você está assistindo.' : respondi ? 'Resposta enviada! ' : ''}
          {estado.respondidos.length} de {estado.jogadores.length} responderam
        </p>
      </Cartao>
    );
  }

  if (estado.fase === 'revelacao' && estado.pergunta && estado.revelacao) {
    const r = estado.revelacao;
    const acertei = r.certos.includes(eu.userId);
    const nomes = Object.fromEntries(estado.jogadores.map((j) => [j.userId, j]));
    return (
      <Cartao cor={corDaCategoria(estado.categoria)}>
        {souJogador && (
          <p className="font-display text-2xl font-extrabold uppercase" style={{ color: acertei ? '#15803d' : '#be123c' }}>
            {acertei ? (r.maisRapido === eu.userId ? 'Acertou e foi o mais rápido!' : 'Acertou!') : r.escolhas[eu.userId] === -1 ? 'O tempo acabou' : 'Não foi dessa vez'}
          </p>
        )}
        <p className="mt-1 text-sm font-semibold opacity-80">{estado.pergunta.texto}</p>
        <div className="mt-3 space-y-1.5">
          {estado.pergunta.opcoes.map((o, i) => {
            const quem = Object.entries(r.escolhas).filter(([, x]) => x === i).map(([id]) => nomes[id]).filter(Boolean);
            const certa = i === r.correta;
            return (
              <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold" style={{ background: certa ? '#16a34a' : '#e7dcc4', color: certa ? '#fff' : TINTA, boxShadow: `0 0 0 2px ${TINTA}` }}>
                <span className="w-5 font-display">{LETRAS[i]}</span>
                <span className="min-w-0 flex-1">{o}</span>
                <span className="flex -space-x-1.5">
                  {quem.map((j) => (
                    <span key={j.userId} className="rounded-full" style={{ boxShadow: `0 0 0 2px ${j.cor}` }}>
                      <Peao nome={j.nome} avatar={j.avatar} cor={j.cor} tamanho={20} />
                    </span>
                  ))}
                </span>
                {certa && <Icon name="check" size={16} />}
              </div>
            );
          })}
        </div>
        <div className="mt-3 rounded-2xl p-3 text-sm leading-relaxed" style={{ background: '#fff7d6', boxShadow: `inset 0 0 0 2px ${TINTA}22` }}>
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider"><Arte nome="open-book" className="h-4 w-4" /> Você sabia?</p>
          <p className="mt-1">{r.curiosidade}</p>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold">
          {estado.jogadores.filter((j) => r.avancos[j.userId] > 0).map((j) => (
            <li key={j.userId} className="rounded-full px-2 py-0.5 text-white" style={{ background: j.cor }}>
              {j.nome.split(' ')[0]} +{r.avancos[j.userId]}{r.maisRapido === j.userId ? ' ⚡' : ''}
            </li>
          ))}
        </ul>
      </Cartao>
    );
  }

  if (estado.fase === 'fim') {
    const top = classificacao(estado).slice(0, 3);
    const ordem = [top[1], top[0], top[2]].filter(Boolean);
    return (
      <Cartao cor="#f59e0b">
        <p className="text-center font-display text-3xl font-extrabold uppercase">Fim de jogo!</p>
        <div className="mt-4 flex items-end justify-center gap-2">
          {ordem.map((j) => {
            const lugar = top.indexOf(j);
            const altura = ['h-28', 'h-20', 'h-14'][lugar];
            return (
              <div key={j.userId} className="flex w-24 flex-col items-center">
                {lugar === 0 && <Arte nome="laurels-trophy" className="mb-1 h-9 w-9" style={{ color: '#d97706' }} />}
                <span className="rounded-full" style={{ boxShadow: `0 0 0 3px ${j.cor}` }}>
                  <Peao nome={j.nome} avatar={j.avatar} cor={j.cor} tamanho={lugar === 0 ? 48 : 38} />
                </span>
                <span className="mt-1 max-w-full truncate text-xs font-bold">{j.nome.split(' ')[0]}</span>
                <span className="text-[10px] opacity-70">casa {j.casa} · {j.pontos} pts</span>
                <div className={`mt-1 flex w-full items-start justify-center rounded-t-xl pt-1 font-display text-2xl font-extrabold text-white ${altura}`} style={{ background: ['#d97706', '#64748b', '#b45309'][lugar], boxShadow: `0 0 0 2px ${TINTA}` }}>
                  {lugar + 1}º
                </div>
              </div>
            );
          })}
        </div>
        {souHost ? (
          <button type="button" onClick={onDeNovo} className="mt-4 w-full rounded-2xl py-3 font-display text-lg font-extrabold uppercase text-white" style={{ background: 'linear-gradient(180deg,#f43f5e,#be123c)', boxShadow: `0 0 0 3px ${TINTA}, 0 6px 0 ${TINTA}` }}>
            Jogar de novo
          </button>
        ) : comPlacar ? (
          <p className="mt-4 text-center text-sm opacity-70">O placar do grupo foi atualizado.</p>
        ) : null}
      </Cartao>
    );
  }
  return null;
}

function Placar({ estado, ranking, eu }: { estado: EstadoTrilha; ranking: EstadoTrilha['jogadores']; eu: string }) {
  if (estado.fase === 'lobby') return null;
  return (
    <div className="mt-4 rounded-3xl bg-black/25 p-3" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.15)' }}>
      <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wider text-white/70">Placar</p>
      <ol className="space-y-1.5">
        {ranking.map((j, i) => (
          <li key={j.userId} className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 ${j.userId === eu ? 'bg-white/10' : ''}`}>
            <span className="w-5 text-center font-display text-sm font-bold text-white/70">{i + 1}</span>
            <span className="rounded-full" style={{ boxShadow: `0 0 0 2px ${j.cor}` }}>
              <Peao nome={j.nome} avatar={j.avatar} cor={j.cor} tamanho={26} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{j.nome}</span>
            {estado.fase === 'pergunta' && estado.respondidos.includes(j.userId) && <Icon name="check" size={14} className="text-[#86efac]" />}
            <span className="text-right text-[11px] leading-tight text-white/75">
              <b className="text-sm text-white">casa {j.casa}</b>
              <br />
              {j.pontos} pts · {j.acertos}✓
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
