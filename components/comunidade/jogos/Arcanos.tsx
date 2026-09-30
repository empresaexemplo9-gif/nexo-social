'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../icons';
import Avatar from '../../Avatar';
import Arte from './Arte';
import { CartaGrande, CriaturaNoCampo, GemaDeEter, VersoDaCarta } from './CartaArcana';
import { RegrasDoArcanos } from './Regras';
import { carta as definicao, efeitoComAlvo, ESCOLAS, montarBaralho, type Escola } from '@/lib/jogos/arcanos/cartas';
import {
  acharCriatura,
  alvosDaCarta,
  aplicar,
  embaralharBaralho,
  novaPartida,
  outro,
  podeAtacar,
  podeBloquear,
  podeJogar,
  publico,
  type Acao,
  type Alvo,
  type Estado,
  type Lado,
  type Participante,
} from '@/lib/jogos/arcanos/motor';
import type { Mensagem, useCanalDeJogos } from '@/lib/jogos/canal';

type Canal = ReturnType<typeof useCanalDeJogos>;
type Eu = { userId: string; nome: string; avatar: string | null };

const TEMPO_DO_TURNO = 90_000;
const TEMPO_DO_BLOQUEIO = 30_000;
const OURO = '#d4af37';
const MESA_BG = 'radial-gradient(ellipse at 50% 45%, #3a2a1b 0%, #20160d 55%, #0d0906 100%)';

// ---------------------------------------------------------------------------
// A mesa
// ---------------------------------------------------------------------------

interface Props {
  canal: Canal;
  groupId: string;
  mesa: string;
  papel: 'host' | 'desafiante' | 'espectador';
  eu: Eu;
  escolas?: [Escola, Escola];
  hostNome?: string;
  aoSair: () => void;
}

function useLargura() {
  const [w, setW] = useState(1024);
  useEffect(() => {
    const f = () => setW(window.innerWidth);
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return w;
}

export default function Arcanos({ canal, groupId, mesa, papel, eu, escolas, hostNome, aoSair }: Props) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [aviso, setAviso] = useState('');
  const [esperando, setEsperando] = useState(papel === 'host' ? 'Esperando um desafiante aceitar o duelo…' : papel === 'desafiante' ? `Chamando ${hostNome ?? 'o anfitrião'} para o duelo…` : 'Entrando para assistir…');
  const [modo, setModo] = useState<{ tipo: 'normal' } | { tipo: 'alvo'; inst: string; carta: string } | { tipo: 'ataque' }>({ tipo: 'normal' });
  const [selAtaque, setSelAtaque] = useState<string[]>([]);
  const [bloqueios, setBloqueios] = useState<Record<string, string>>({});
  const [bloqueador, setBloqueador] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [regras, setRegras] = useState(false);
  const [log, setLog] = useState(false);
  const [agora, setAgora] = useState(Date.now());
  const [prazo, setPrazo] = useState(Date.now() + TEMPO_DO_TURNO);
  const [desync, setDesync] = useState(false);
  const [ausenteDesde, setAusenteDesde] = useState<number | null>(null);
  const estadoRef = useRef<Estado | null>(null);
  const pendentes = useRef(new Map<number, Acao>());
  const oponenteRef = useRef<Participante | null>(null);
  const porTempoEnviado = useRef<string>('');
  const gravou = useRef(false);
  const largura = useLargura();
  const pequeno = largura < 640;

  const { enviar, ouvir, anunciar, presentes } = canal;
  const souJogador = estado?.eu !== null && estado?.eu !== undefined;
  const lado = (estado?.eu ?? 0) as Lado;

  const definir = useCallback((e: Estado) => {
    estadoRef.current = e;
    setEstado(e);
  }, []);

  // Começa a partida neste aparelho (jogadores embaralham o próprio baralho).
  const iniciar = useCallback(
    (participantes: [Participante, Participante]) => {
      const meuLado = participantes.findIndex((p) => p.userId === eu.userId);
      if (meuLado < 0) return;
      const l = meuLado as Lado;
      const meu = embaralharBaralho(montarBaralho(participantes[l].escolas), l);
      pendentes.current.clear();
      gravou.current = false;
      const e = novaPartida(participantes, l, meu);
      definir(e);
      setEsperando('');
      enviar(mesa, 'arc:publico', { estado: publico(e) });
    },
    [definir, eu.userId, enviar, mesa],
  );

  // Aplica uma jogada minha e manda para a mesa.
  const jogar = useCallback(
    (acao: Acao) => {
      const atual = estadoRef.current;
      if (!atual) return;
      const r = aplicar(atual, acao);
      if (!r.ok) {
        setAviso(r.erro);
        return;
      }
      definir(r.estado);
      enviar(mesa, 'arc:acao', { acao, seq: atual.seq });
      enviar(mesa, 'arc:publico', { estado: publico(r.estado) });
      setModo({ tipo: 'normal' });
      setSelAtaque([]);
      setAviso('');
    },
    [definir, enviar, mesa],
  );

  // Anfitrião: anuncia a mesa aberta.
  useEffect(() => {
    if (papel !== 'host' || !escolas) return;
    void anunciar({ id: mesa, jogo: 'arcanos', host: eu.userId, hostNome: eu.nome, estado: 'aberta', jogadores: [eu.userId], detalhe: `${ESCOLAS[escolas[0]].nome} + ${ESCOLAS[escolas[1]].nome}` });
    return () => void anunciar(null);
  }, [papel, escolas, anunciar, mesa, eu.userId, eu.nome]);

  // Desafiante: pede para entrar até o anfitrião responder.
  useEffect(() => {
    if (papel !== 'desafiante' || !escolas || estado) return;
    let n = 0;
    const pedir = () => {
      n += 1;
      if (n > 6) {
        setEsperando('O anfitrião não respondeu. A mesa pode ter fechado.');
        return;
      }
      enviar(mesa, 'arc:aceitar', { nome: eu.nome, avatar: eu.avatar, escolas });
    };
    pedir();
    const t = window.setInterval(pedir, 3000);
    return () => window.clearInterval(t);
  }, [papel, escolas, estado, enviar, mesa, eu.nome, eu.avatar]);

  // Espectador: pede o estado público.
  useEffect(() => {
    if (papel !== 'espectador') return;
    enviar(mesa, 'arc:pedir', {});
    const t = window.setInterval(() => !estadoRef.current && enviar(mesa, 'arc:pedir', {}), 4000);
    return () => window.clearInterval(t);
  }, [papel, enviar, mesa]);

  // Mensagens da mesa.
  useEffect(() => {
    return ouvir((m: Mensagem) => {
      if (m.mesa !== mesa) return;
      const atual = estadoRef.current;
      switch (m.tipo) {
        case 'arc:aceitar': {
          if (papel !== 'host' || !escolas) return;
          if (oponenteRef.current && oponenteRef.current.userId !== m.de) {
            enviar(mesa, 'arc:ocupada', { para: m.de });
            return;
          }
          const esc = m.escolas as [Escola, Escola];
          if (!Array.isArray(esc) || esc.length !== 2 || !esc.every((x) => x in ESCOLAS)) return;
          if (oponenteRef.current && atual) return; // já começou: o desafiante vai receber o início abaixo
          const ele: Participante = { userId: m.de, nome: String(m.nome ?? 'Desafiante').slice(0, 40), escolas: esc };
          oponenteRef.current = ele;
          const meu: Participante = { userId: eu.userId, nome: eu.nome, escolas };
          const participantes: [Participante, Participante] = Math.random() < 0.5 ? [meu, ele] : [ele, meu];
          enviar(mesa, 'arc:inicio', { participantes });
          void anunciar({ id: mesa, jogo: 'arcanos', host: eu.userId, hostNome: eu.nome, estado: 'jogando', jogadores: [eu.userId, m.de], detalhe: `${eu.nome.split(' ')[0]} × ${ele.nome.split(' ')[0]}` });
          iniciar(participantes);
          return;
        }
        case 'arc:inicio': {
          const ps = m.participantes as [Participante, Participante];
          if (!Array.isArray(ps) || ps.length !== 2) return;
          if (ps.some((p) => p.userId === eu.userId)) {
            if (!atual) iniciar(ps);
          }
          return;
        }
        case 'arc:ocupada':
          if (m.para === eu.userId && !atual) setEsperando('Outra pessoa já aceitou este duelo. Volte ao lobby e abra o seu.');
          return;
        case 'arc:acao': {
          if (!atual || atual.eu === null) return;
          const acao = m.acao as Acao;
          const seq = Number(m.seq);
          if (seq < atual.seq) return;
          pendentes.current.set(seq, acao);
          let e = atual;
          while (pendentes.current.has(e.seq)) {
            const a = pendentes.current.get(e.seq)!;
            pendentes.current.delete(e.seq);
            const r = aplicar(e, a);
            if (!r.ok) {
              setDesync(true);
              break;
            }
            e = r.estado;
          }
          if (e !== atual) {
            definir(e);
            // Quem assiste recebe o estado dos dois lados (se um se perder, o outro chega).
            enviar(mesa, 'arc:publico', { estado: publico(e) });
          }
          return;
        }
        case 'arc:publico': {
          if (atual?.eu !== null && atual) return; // quem joga tem o próprio estado
          const e = m.estado as Estado;
          if (e && (!atual || e.seq >= atual.seq)) {
            definir(e);
            setEsperando('');
          }
          return;
        }
        case 'arc:pedir':
          if (atual && atual.eu !== null) enviar(mesa, 'arc:publico', { estado: publico(atual) });
          return;
        case 'arc:saiu':
          if (atual && atual.eu !== null && atual.vencedor === null && m.de === atual.jogadores[outro(atual.eu)].userId) {
            const r = aplicar(atual, { t: 'desistir', lado: outro(atual.eu) });
            if (r.ok) definir(r.estado);
          }
          return;
      }
    });
  }, [ouvir, mesa, papel, escolas, eu.userId, eu.nome, enviar, anunciar, iniciar, definir]);

  // Relógio: prazo do turno e do bloqueio.
  useEffect(() => {
    if (!estado) return;
    setPrazo(Date.now() + (estado.fase === 'bloqueio' ? TEMPO_DO_BLOQUEIO : TEMPO_DO_TURNO));
    setAviso('');
    setBloqueios({});
    setBloqueador(null);
  }, [estado?.turno, estado?.fase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  // O tempo acabou: a jogada automática sai uma vez só por fase.
  useEffect(() => {
    const e = estadoRef.current;
    if (!e || e.eu === null || e.vencedor !== null) return;
    const chave = `${e.seq}:${e.fase}`;
    if (porTempoEnviado.current === chave) return;
    if (e.fase === 'principal' && e.ativo === e.eu && agora > prazo) {
      porTempoEnviado.current = chave;
      jogar({ t: 'passar', lado: e.eu, porTempo: true });
    } else if (e.fase === 'bloqueio' && e.ativo !== e.eu && agora > prazo) {
      porTempoEnviado.current = chave;
      jogar({ t: 'bloquear', lado: e.eu, bloqueios, porTempo: true });
    } else if (e.fase === 'bloqueio' && e.ativo === e.eu && agora > prazo + 15_000) {
      porTempoEnviado.current = chave;
      jogar({ t: 'bloquear', lado: e.eu, bloqueios: {}, porTempo: true });
    }
  }, [agora, prazo, jogar, bloqueios]);

  // Adversário sumiu da sala?
  const oponenteId = estado && estado.eu !== null ? estado.jogadores[outro(estado.eu)].userId : null;
  const oponentePresente = !oponenteId || presentes.some((p) => p.userId === oponenteId);
  useEffect(() => {
    if (oponentePresente || !estado || estado.vencedor !== null) setAusenteDesde(null);
    else setAusenteDesde((a) => a ?? Date.now());
  }, [oponentePresente, estado?.vencedor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fim: grava o resultado (uma vez).
  useEffect(() => {
    if (!estado || estado.eu === null || estado.vencedor === null || gravou.current) return;
    gravou.current = true;
    const v = estado.vencedor;
    const [a, b] = estado.jogadores;
    void fetch(`/api/comunidade/grupos/${groupId}/jogos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mesa,
        jogo: 'arcanos',
        vencedor: v === 'empate' ? null : estado.jogadores[v].userId,
        jogadores: [a.userId, b.userId],
        resumo: v === 'empate' ? `${a.nome} e ${b.nome} empataram` : `${estado.jogadores[v].nome} venceu em ${Math.ceil(estado.turno / 2)} rodadas`,
      }),
    }).catch(() => undefined);
  }, [estado, groupId, mesa]);

  const sair = () => {
    const e = estadoRef.current;
    if (e && e.eu !== null && e.vencedor === null && !window.confirm('Sair agora conta como desistência. Sair mesmo?')) return;
    if (e && e.eu !== null && e.vencedor === null) jogar({ t: 'desistir', lado: e.eu });
    enviar(mesa, 'arc:saiu', {});
    void anunciar(null);
    aoSair();
  };

  // --- Interação -----------------------------------------------------------------
  const alvosPossiveis = useMemo<Alvo[]>(() => (estado && modo.tipo === 'alvo' ? alvosDaCarta(estado, lado, modo.carta) : []), [estado, modo, lado]);
  const ehAlvo = (a: Alvo) => alvosPossiveis.some((x) => (x.tipo === 'heroi' ? a.tipo === 'heroi' && a.lado === x.lado : a.tipo === 'criatura' && a.id === x.id));

  const clicarNaMao = (inst: string, cartaId: string) => {
    if (!estado || !souJogador) return;
    const erro = podeJogar(estado, lado, cartaId);
    if (erro) {
      setZoom(cartaId);
      setAviso(erro);
      return;
    }
    const c = definicao(cartaId);
    if (efeitoComAlvo(c) && alvosDaCarta(estado, lado, cartaId).length) {
      setModo({ tipo: 'alvo', inst, carta: cartaId });
      setAviso(`Escolha o alvo de ${c.nome}.`);
      return;
    }
    jogar({ t: 'jogar', lado, inst, carta: cartaId });
  };

  const escolherAlvo = (a: Alvo) => {
    if (modo.tipo !== 'alvo' || !ehAlvo(a)) return;
    jogar({ t: 'jogar', lado, inst: modo.inst, carta: modo.carta, alvo: a });
  };

  const clicarCriatura = (id: string) => {
    if (!estado) return;
    const c = acharCriatura(estado, id);
    if (!c) return;
    if (modo.tipo === 'alvo') return escolherAlvo({ tipo: 'criatura', id });
    if (!souJogador) return setZoom(c.carta);
    // Bloqueio: escolho meu bloqueador e depois o atacante.
    if (estado.fase === 'bloqueio' && estado.ativo !== lado) {
      if (c.dono === lado) {
        if (Object.values(bloqueios).includes(id)) {
          setBloqueios((b) => Object.fromEntries(Object.entries(b).filter(([, v]) => v !== id)));
          return;
        }
        setBloqueador(bloqueador === id ? null : id);
        return;
      }
      if (estado.atacantes.includes(id) && bloqueador) {
        const b = acharCriatura(estado, bloqueador);
        if (b && podeBloquear(c, b)) {
          setBloqueios((x) => ({ ...Object.fromEntries(Object.entries(x).filter(([, v]) => v !== bloqueador)), [id]: bloqueador }));
          setBloqueador(null);
          setAviso('');
        } else setAviso('Essa criatura não alcança quem voa.');
      }
      return;
    }
    if (modo.tipo === 'ataque' && c.dono === lado && podeAtacar(estado, c)) {
      setSelAtaque((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
      return;
    }
    setZoom(c.carta);
  };

  // --- Desenho -------------------------------------------------------------------
  const cabecalho = (
    <header className="flex items-center gap-3 border-b px-3 py-2 sm:px-5" style={{ borderColor: 'rgba(212,175,55,.3)' }}>
      <Arte nome="spell-book" className="h-7 w-7 shrink-0" style={{ color: OURO }} />
      <div className="min-w-0 flex-1">
        <p className="fonte-arcana truncate text-base font-black leading-none text-[#fdf6e3] sm:text-lg">Arcanos · Duelo de Escolas</p>
        <p className="truncate text-[11px] text-[#fef3c7]/60">{papel === 'espectador' ? 'Você está assistindo' : 'Ao vivo no grupo'}</p>
      </div>
      <button type="button" onClick={() => setLog((v) => !v)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#fef3c7]/80 hover:bg-white/10">Registro</button>
      <button type="button" onClick={() => setRegras(true)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#fef3c7]/80 hover:bg-white/10">Regras</button>
      <button type="button" onClick={sair} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#fecaca] hover:bg-[#ef4444]/20">Sair</button>
    </header>
  );

  if (!estado) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: MESA_BG }}>
        {cabecalho}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex -space-x-6">
            <VersoDaCarta largura={70} className="-rotate-12" />
            <VersoDaCarta largura={70} />
            <VersoDaCarta largura={70} className="rotate-12" />
          </div>
          <p className="fonte-arcana max-w-sm text-lg font-bold text-[#fdf6e3]">{esperando}</p>
          {papel === 'host' && escolas && (
            <p className="fonte-pergaminho text-sm text-[#fef3c7]/70">Seu grimório: {ESCOLAS[escolas[0]].nome} + {ESCOLAS[escolas[1]].nome}. A mesa aparece para todo mundo que está na sala de jogos do grupo.</p>
          )}
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#fde68a] border-t-transparent" />
        </div>
        {regras && <ModalRegras onFechar={() => setRegras(false)} />}
      </div>
    );
  }

  const eu0 = estado.eu ?? 0;
  const baixo = estado.eu !== null ? estado.eu : 0;
  const cima = outro(baixo);
  const jBaixo = estado.jogadores[baixo];
  const jCima = estado.jogadores[cima];
  const minhaVez = souJogador && estado.ativo === eu0;
  const defendendo = souJogador && estado.fase === 'bloqueio' && estado.ativo !== eu0;
  const restante = Math.max(0, prazo - agora);
  const total = estado.fase === 'bloqueio' ? TEMPO_DO_BLOQUEIO : TEMPO_DO_TURNO;
  const tamCriatura = pequeno ? 66 : 96;
  const tamMao = pequeno ? 112 : 150;

  const heroi = (l: Lado) => {
    const j = estado.jogadores[l];
    const alvoAqui = modo.tipo === 'alvo' && ehAlvo({ tipo: 'heroi', lado: l });
    return (
      <button
        type="button"
        onClick={() => escolherAlvo({ tipo: 'heroi', lado: l })}
        disabled={!alvoAqui}
        className={`relative flex items-center gap-2 rounded-2xl px-2 py-1.5 transition ${alvoAqui ? 'animate-pulse' : ''}`}
        style={{ background: 'rgba(0,0,0,.35)', boxShadow: alvoAqui ? '0 0 0 2px #ef4444, 0 0 16px #ef4444' : `0 0 0 1px rgba(212,175,55,.4)` }}
        aria-label={`${j.nome}: ${j.vida} de vida`}
      >
        <Avatar nome={j.nome} tamanho={pequeno ? 30 : 38} />
        <span className="text-left">
          <span className="fonte-arcana block max-w-[7rem] truncate text-xs font-bold text-[#fdf6e3] sm:max-w-[10rem] sm:text-sm">{j.nome}</span>
          <span className="flex gap-1">
            {j.escolas.map((x) => (
              <Arte key={x} nome={ESCOLAS[x].arte} className="h-3.5 w-3.5" style={{ color: ESCOLAS[x].brilho }} titulo={ESCOLAS[x].nome} />
            ))}
          </span>
        </span>
        <span className="fonte-arcana ml-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-lg font-black text-white" style={{ background: 'radial-gradient(circle at 35% 30%, #f87171, #991b1b)', boxShadow: `0 0 0 1.5px ${OURO}` }}>
          <Arte nome="heart-drop" className="h-4 w-4" /> {j.vida}
        </span>
      </button>
    );
  };

  const eter = (l: Lado) => {
    const j = estado.jogadores[l];
    return (
      <span className="flex items-center gap-1" aria-label={`Éter ${j.eter} de ${j.eterMax}`}>
        {pequeno ? (
          <GemaDeEter valor={`${j.eter}/${j.eterMax}`} tamanho="2.1rem" />
        ) : (
          Array.from({ length: j.eterMax }, (_, i) => <GemaDeEter key={i} valor="" tamanho="1rem" apagada={i >= j.eter} />)
        )}
        {!pequeno && <span className="fonte-arcana ml-1 text-sm font-bold text-[#a5f3fc]">{j.eter}/{j.eterMax}</span>}
      </span>
    );
  };

  const campo = (l: Lado) => {
    const j = estado.jogadores[l];
    return (
      <div className="flex min-h-[7rem] flex-wrap items-center justify-center gap-2 px-2 py-3 sm:min-h-[9rem] sm:gap-3">
        {j.campo.length === 0 && <span className="fonte-pergaminho text-sm italic text-[#fef3c7]/35">campo vazio</span>}
        {j.campo.map((c) => {
          const bloqueando = Object.entries(bloqueios).find(([, b]) => b === c.id);
          const bloqueadoPor = bloqueios[c.id];
          const combateAtacante = estado.fase === 'bloqueio' && estado.atacantes.includes(c.id);
          return (
            <CriaturaNoCampo
              key={c.id}
              c={c}
              largura={tamCriatura}
              onClick={() => clicarCriatura(c.id)}
              podeAtacar={minhaVez && modo.tipo === 'ataque' && podeAtacar(estado, c)}
              selecionada={selAtaque.includes(c.id) || bloqueador === c.id}
              alvo={modo.tipo === 'alvo' && ehAlvo({ tipo: 'criatura', id: c.id })}
              atacando={combateAtacante || selAtaque.includes(c.id)}
              marca={
                bloqueando
                  ? `bloqueia ${definicao(acharCriatura(estado, bloqueando[0])?.carta ?? 'c01').nome}`
                  : bloqueadoPor
                    ? 'bloqueada'
                    : combateAtacante
                      ? 'atacando'
                      : undefined
              }
            />
          );
        })}
      </div>
    );
  };

  const faseTexto = estado.vencedor !== null
    ? 'Fim da partida'
    : estado.fase === 'bloqueio'
      ? defendendo
        ? 'Você está sendo atacado: escolha seus bloqueadores'
        : `${jCima.nome.split(' ')[0]} está escolhendo bloqueios`
      : minhaVez
        ? modo.tipo === 'ataque'
          ? 'Toque nas criaturas que vão atacar'
          : 'Sua vez: jogue cartas ou ataque'
        : `Vez de ${estado.jogadores[estado.ativo].nome.split(' ')[0]}`;

  const mao = souJogador ? (jBaixo.mao ?? []) : [];
  const segredos = jBaixo.segredos;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden text-[#fdf6e3]" style={{ background: MESA_BG }}>
      {cabecalho}

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {/* Adversário */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3 sm:px-5">
          {heroi(cima)}
          <div className="flex items-center gap-3">
            {eter(cima)}
            <span className="flex items-center gap-1 text-xs text-[#fef3c7]/70" title="Cartas na mão">
              <VersoDaCarta largura={18} /> {jCima.maoQtd}
            </span>
            <span className="flex items-center gap-1 text-xs text-[#fef3c7]/70" title="Cartas no baralho">
              <Arte nome="spell-book" className="h-4 w-4" /> {jCima.baralhoQtd}
            </span>
          </div>
        </div>
        {campo(cima)}

        {/* Faixa do meio */}
        <div className="mx-3 flex flex-col gap-2 rounded-2xl px-3 py-2.5 sm:mx-5 sm:flex-row sm:items-center" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,.08), rgba(212,175,55,.2), rgba(212,175,55,.08))', boxShadow: 'inset 0 0 0 1px rgba(212,175,55,.35)' }}>
          <div className="min-w-0 flex-1">
            <p className="fonte-arcana text-sm font-bold text-[#fdf6e3]">{faseTexto}</p>
            {estado.vencedor === null && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(restante / total) * 100}%`, background: restante < 10_000 ? '#ef4444' : OURO }} />
              </div>
            )}
            {aviso && <p className="mt-1 text-xs text-[#fde68a]">{aviso}</p>}
          </div>
          {souJogador && estado.vencedor === null && (
            <div className="flex flex-wrap gap-2">
              {modo.tipo === 'alvo' && <BotaoMesa onClick={() => { setModo({ tipo: 'normal' }); setAviso(''); }} fraco>Cancelar</BotaoMesa>}
              {minhaVez && estado.fase === 'principal' && modo.tipo === 'normal' && !estado.atacou && jBaixo.campo.some((c) => podeAtacar(estado, c)) && (
                <BotaoMesa onClick={() => { setModo({ tipo: 'ataque' }); setSelAtaque(jBaixo.campo.filter((c) => podeAtacar(estado, c)).map((c) => c.id)); }}>
                  <Arte nome="crossed-swords" className="h-4 w-4" /> Atacar
                </BotaoMesa>
              )}
              {minhaVez && modo.tipo === 'ataque' && (
                <>
                  <BotaoMesa onClick={() => { setModo({ tipo: 'normal' }); setSelAtaque([]); }} fraco>Cancelar</BotaoMesa>
                  <BotaoMesa onClick={() => jogar({ t: 'atacar', lado: eu0, atacantes: selAtaque })} disabled={!selAtaque.length} perigo>
                    Atacar com {selAtaque.length}
                  </BotaoMesa>
                </>
              )}
              {minhaVez && estado.fase === 'principal' && modo.tipo === 'normal' && <BotaoMesa onClick={() => jogar({ t: 'passar', lado: eu0 })}>Passar a vez</BotaoMesa>}
              {defendendo && (
                <BotaoMesa onClick={() => jogar({ t: 'bloquear', lado: eu0, bloqueios })} perigo>
                  {Object.keys(bloqueios).length ? `Confirmar ${Object.keys(bloqueios).length} bloqueio(s)` : 'Sem bloqueios'}
                </BotaoMesa>
              )}
            </div>
          )}
        </div>
        {defendendo && <p className="px-5 pt-1 text-center text-[11px] text-[#fef3c7]/70">Toque numa criatura sua e depois no atacante que ela vai bloquear.</p>}

        {campo(baixo)}

        {/* Eu */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 sm:px-5">
          {heroi(baixo)}
          <div className="flex items-center gap-3">
            {eter(baixo)}
            <span className="flex items-center gap-1 text-xs text-[#fef3c7]/70" title="Cartas no baralho">
              <Arte nome="spell-book" className="h-4 w-4" /> {jBaixo.baralhoQtd}
            </span>
          </div>
        </div>

        {/* Mão */}
        {souJogador ? (
          <div className="flex gap-2 overflow-x-auto px-3 pb-4 pt-3 sm:justify-center sm:px-5" aria-label="Sua mão">
            {mao.length === 0 && <span className="fonte-pergaminho py-6 text-sm italic text-[#fef3c7]/40">mão vazia</span>}
            {mao.map((inst) => {
              const id = segredos[inst];
              if (!id) return null;
              const pode = !podeJogar(estado, eu0, id);
              const escolhendo = modo.tipo === 'alvo' && modo.inst === inst;
              return (
                <div key={inst} className="relative">
                  <CartaGrande id={id} largura={tamMao} onClick={() => clicarNaMao(inst, id)} desabilitada={!pode && minhaVez} destaque={escolhendo || (pode && minhaVez && modo.tipo === 'normal')} />
                  <button type="button" onClick={() => setZoom(id)} className="absolute -right-1 -top-1 rounded-full bg-black/70 p-1 text-[#fef3c7]" aria-label="Ver a carta de perto">
                    <Icon name="search" size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-5 pb-6 text-center text-xs text-[#fef3c7]/60">Você está assistindo: as mãos ficam escondidas.</p>
        )}

        {log && (
          <aside className="fixed bottom-4 right-4 z-[72] max-h-[45vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-3 text-xs" style={{ background: 'rgba(15,10,6,.95)', boxShadow: `0 0 0 1px ${OURO}` }}>
            <p className="fonte-arcana mb-1 font-bold" style={{ color: OURO }}>Registro</p>
            <ol className="space-y-1 text-[#fef3c7]/85">
              {[...estado.log].reverse().map((l, i) => <li key={i}>{l}</li>)}
            </ol>
          </aside>
        )}

        {ausenteDesde && estado.vencedor === null && agora - ausenteDesde > 30_000 && souJogador && (
          <div className="fixed inset-x-4 bottom-4 z-[73] mx-auto max-w-md rounded-2xl p-4 text-center" style={{ background: 'rgba(15,10,6,.96)', boxShadow: `0 0 0 1px ${OURO}` }}>
            <p className="fonte-arcana font-bold">{jCima.nome} saiu da sala de jogos.</p>
            <p className="mt-1 text-xs text-[#fef3c7]/70">Se não voltar, você pode encerrar a partida com a vitória.</p>
            <div className="mt-3 flex justify-center">
              <BotaoMesa onClick={() => jogar({ t: 'desistir', lado: cima })}>Reivindicar vitória</BotaoMesa>
            </div>
          </div>
        )}

        {desync && (
          <div className="fixed inset-x-4 top-20 z-[73] mx-auto max-w-md rounded-2xl p-4 text-center" style={{ background: 'rgba(60,10,10,.96)', boxShadow: '0 0 0 1px #ef4444' }}>
            <p className="fonte-arcana font-bold">As mesas se desencontraram.</p>
            <p className="mt-1 text-xs text-[#fee2e2]/80">A conexão perdeu uma jogada. Encerre esta partida e comece outra.</p>
            <div className="mt-3 flex justify-center">
              <BotaoMesa onClick={sair}>Encerrar</BotaoMesa>
            </div>
          </div>
        )}
      </div>

      {zoom && (
        <button type="button" onClick={() => setZoom(null)} className="fixed inset-0 z-[74] flex items-center justify-center bg-black/75 p-6" aria-label="Fechar a carta">
          <CartaGrande id={zoom} largura={Math.min(300, largura - 48)} />
        </button>
      )}

      {estado.vencedor !== null && <FimDoDuelo estado={estado} onSair={sair} />}
      {regras && <ModalRegras onFechar={() => setRegras(false)} />}
    </div>
  );
}

function BotaoMesa({ children, onClick, disabled, fraco, perigo }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; fraco?: boolean; perigo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="fonte-arcana inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-wider transition disabled:opacity-40 sm:text-sm"
      style={
        fraco
          ? { background: 'rgba(0,0,0,.35)', color: '#fde68a', boxShadow: '0 0 0 1px rgba(212,175,55,.45)' }
          : perigo
            ? { background: 'linear-gradient(180deg,#f87171,#b91c1c)', color: '#fff', boxShadow: `0 0 0 1px ${OURO}, 0 3px 10px rgba(0,0,0,.45)` }
            : { background: `linear-gradient(180deg,#f5d77a,${OURO})`, color: '#1c1208', boxShadow: '0 3px 10px rgba(0,0,0,.45)' }
      }
    >
      {children}
    </button>
  );
}

function FimDoDuelo({ estado, onSair }: { estado: Estado; onSair: () => void }) {
  const v = estado.vencedor;
  const venci = estado.eu !== null && v === estado.eu;
  const titulo = v === 'empate' ? 'Empate!' : estado.eu === null ? `${estado.jogadores[v as Lado].nome} venceu!` : venci ? 'Vitória!' : 'Derrota';
  return (
    <div className="fixed inset-0 z-[76] flex items-center justify-center bg-black/70 p-6" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: MESA_BG, boxShadow: `0 0 0 1px ${OURO}, 0 0 40px rgba(212,175,55,.35)` }}>
        <Arte nome={venci || v === 'empate' ? 'laurels-trophy' : 'crossed-swords'} className="mx-auto h-20 w-20" style={{ color: OURO, filter: 'drop-shadow(0 0 12px rgba(212,175,55,.6))' }} />
        <h2 className="fonte-arcana mt-3 text-3xl font-black text-[#fdf6e3]">{titulo}</h2>
        {estado.motivo && <p className="fonte-pergaminho mt-2 text-sm text-[#fef3c7]/80">{estado.motivo}</p>}
        <p className="mt-1 text-xs text-[#fef3c7]/60">{Math.ceil(estado.turno / 2)} rodadas · o placar do grupo foi atualizado.</p>
        <div className="mt-5 flex justify-center">
          <BotaoMesa onClick={onSair}>Voltar à sala de jogos</BotaoMesa>
        </div>
      </div>
    </div>
  );
}

function ModalRegras({ onFechar }: { onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-[78] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Regras do Arcanos">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-zinc-900 p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="fonte-arcana text-xl font-black text-zinc-50">Como jogar Arcanos</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-full p-2 text-zinc-400 hover:text-zinc-100">
            <Icon name="close" size={18} />
          </button>
        </div>
        <RegrasDoArcanos />
      </div>
    </div>
  );
}
