// Sala de jogos local: a mesma conversa das mesas ao vivo, mas dentro do
// próprio aparelho. Serve para jogar sozinho ou contra o computador sem
// depender da conexão com o grupo — os jogos não sabem a diferença.

import { aplicar, embaralharBaralho, novaPartida, type Acao, type Estado, type Lado, type Participante } from './arcanos/motor';
import { ELEMENTOS_ORDEM, type Elemento } from './arcanos/cartas';
import { decidirJogada } from './arcanos/robo';
import { aplicarNova, embaralharNovo, novaPartidaGrimorios, outroNovo, type AcaoNova, type EstadoNovo, type ParticipanteNovo, type LadoNovo } from './arcanos/motor-grimorios';
import { decidirGrimorios } from './arcanos/robo-grimorios';
import { PERGUNTAS } from './perguntas';
import type { EstadoTrilha } from './trilha';
import type { MesaAnunciada, Mensagem, Presente } from './canal';

export interface CanalDeJogos {
  estado: 'conectando' | 'ok' | 'erro';
  presentes: Presente[];
  mesas: MesaAnunciada[];
  anunciar: (mesa: MesaAnunciada | null) => Promise<void>;
  enviar: (mesa: string, tipo: string, dados?: Record<string, unknown>) => void;
  ouvir: (f: (m: Mensagem) => void) => () => void;
}

export interface Pessoa {
  userId: string;
  nome: string;
  avatar: string | null;
}

/** Uma sala só deste aparelho: o que um manda, os outros recebem (fora da vez, como na rede). */
export function criarSalaLocal(pessoas: Pessoa[]): Map<string, CanalDeJogos> {
  const ouvintes = new Map<string, Set<(m: Mensagem) => void>>();
  const desde = Date.now();
  const presentes: Presente[] = pessoas.map((p, i) => ({ ...p, desde: desde + i, mesa: null }));
  const canais = new Map<string, CanalDeJogos>();
  for (const p of pessoas) {
    ouvintes.set(p.userId, new Set());
    canais.set(p.userId, {
      estado: 'ok',
      presentes,
      mesas: [],
      anunciar: async () => undefined,
      enviar: (mesa, tipo, dados = {}) => {
        const m: Mensagem = { ...dados, mesa, tipo, de: p.userId };
        setTimeout(() => {
          ouvintes.forEach((fs, id) => {
            if (id !== p.userId) fs.forEach((f) => f(m));
          });
        }, 0);
      },
      ouvir: (f) => {
        ouvintes.get(p.userId)!.add(f);
        return () => {
          ouvintes.get(p.userId)!.delete(f);
        };
      },
    });
  }
  return canais;
}

// ---------------------------------------------------------------------------
// Adversários do computador
// ---------------------------------------------------------------------------

export const ROBOS_DA_TRILHA: (Pessoa & { acerto: number; rapidez: number })[] = [
  { userId: 'robo-coruja', nome: 'Coruja Sábia', avatar: null, acerto: 0.72, rapidez: 0.45 },
  { userId: 'robo-raposa', nome: 'Raposa Curiosa', avatar: null, acerto: 0.6, rapidez: 0.65 },
  { userId: 'robo-tatu', nome: 'Tatu Apressado', avatar: null, acerto: 0.48, rapidez: 0.9 },
];

export const ROBO_DO_ARCANOS: Pessoa = { userId: 'robo-arcanos', nome: 'Mestre Arcano', avatar: null };

const sorteio = <T,>(lista: T[]) => lista[Math.floor(Math.random() * lista.length)];

/** Um robô da Trilha: entra na mesa e responde cada pergunta com a sua pontaria. */
export function iniciarRoboDaTrilha(canal: CanalDeJogos, mesa: string, robo: (typeof ROBOS_DA_TRILHA)[number]): () => void {
  let vivo = true;
  let respondida = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const depois = (ms: number, f: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (vivo) f();
    }, ms);
    timers.add(t);
  };
  const parar = canal.ouvir((m) => {
    if (m.mesa !== mesa || m.tipo !== 'tri:estado') return;
    const e = m.estado as EstadoTrilha;
    if (!e) return;
    const dentro = e.jogadores.some((j) => j.userId === robo.userId);
    if (e.fase === 'lobby' && !dentro) {
      canal.enviar(mesa, 'tri:entrar', { nome: robo.nome, avatar: null });
      return;
    }
    if (e.fase !== 'pergunta' || !e.pergunta || !dentro || respondida === e.pergunta.n || e.respondidos.includes(robo.userId)) return;
    const { n, texto, opcoes, nivel } = e.pergunta;
    respondida = n;
    const p = PERGUNTAS.find((x) => x.p === texto);
    const certa = p ? opcoes.indexOf(p.o[0]) : -1;
    const ajuste = nivel === 1 ? 0.12 : nivel === 3 ? -0.15 : 0;
    const acerta = certa >= 0 && Math.random() < robo.acerto + ajuste;
    const opcao = acerta ? certa : sorteio([0, 1, 2, 3].filter((i) => i !== certa));
    // Os mais rápidos respondem em 2–6 s; os calmos, em até 14 s.
    const ms = Math.min(e.restanteMs - 500, 2000 + Math.random() * (1 - robo.rapidez) * 12000 + Math.random() * 2500);
    depois(Math.max(800, ms), () => canal.enviar(mesa, 'tri:resposta', { n, opcao }));
  });
  return () => {
    vivo = false;
    timers.forEach(clearTimeout);
    parar();
    canal.enviar(mesa, 'tri:sair', {});
  };
}

/** O adversário do Arcanos: aceita o duelo, joga com a própria mão e responde a cada lance. */
export function iniciarRoboDoArcanos(canal: CanalDeJogos, mesa: string, elemento: Elemento = sortearElemento()): () => void {
  let vivo = true;
  let estado: Estado | null = null;
  let lado: Lado = 1;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pendentes = new Map<number, Acao>();

  const jogar = (acao: Acao) => {
    if (!estado) return;
    let r = aplicar(estado, acao);
    // Jogada recusada (não deveria acontecer): passa a vez para não travar.
    if (!r.ok) {
      r = aplicar(estado, { t: 'passar', lado });
      if (!r.ok) return;
    }
    const seq = estado.seq;
    estado = r.estado;
    // O robô rola os dados: a ação segue com os resultados, como a de qualquer jogador.
    canal.enviar(mesa, 'arc:acao', { acao: r.acao, seq });
    pensar();
  };

  const pensar = () => {
    clearTimeout(timer);
    const e = estado;
    if (!vivo || !e || e.vencedor !== null) return;
    if (e.ativo !== lado) return;
    // Espera a mesa terminar de animar a jogada anterior (dados, projéteis, impactos).
    const ms = 1900 + Math.random() * 1300;
    timer = setTimeout(() => {
      if (!vivo || !estado) return;
      const acao = decidirJogada(estado, lado);
      if (acao) jogar(acao);
    }, ms);
  };

  const parar = canal.ouvir((m) => {
    if (m.mesa !== mesa || !vivo) return;
    switch (m.tipo) {
      case 'arc:inicio': {
        const ps = m.participantes as [Participante, Participante];
        if (estado || !Array.isArray(ps)) return;
        const i = ps.findIndex((p) => p.userId === ROBO_DO_ARCANOS.userId);
        if (i < 0) return;
        lado = i as Lado;
        estado = novaPartida(ps, lado, embaralharBaralho(ps[lado].elemento));
        pensar();
        return;
      }
      case 'arc:acao': {
        if (!estado) return;
        const seq = Number(m.seq);
        if (seq < estado.seq) return;
        pendentes.set(seq, m.acao as Acao);
        while (estado && pendentes.has(estado.seq)) {
          const a = pendentes.get(estado.seq)!;
          pendentes.delete(estado.seq);
          const r = aplicar(estado, a);
          if (!r.ok) break;
          estado = r.estado;
        }
        pensar();
        return;
      }
    }
  });

  // Aceita o duelo que a pessoa abriu.
  const aceitar = () => !estado && vivo && canal.enviar(mesa, 'arc:aceitar', { nome: ROBO_DO_ARCANOS.nome, avatar: null, elemento });
  const t1 = setTimeout(aceitar, 500);
  const t2 = setTimeout(aceitar, 2500);

  return () => {
    vivo = false;
    clearTimeout(timer);
    clearTimeout(t1);
    clearTimeout(t2);
    parar();
  };
}

export function sortearElemento(): Elemento {
  return sorteio(ELEMENTOS_ORDEM);
}


/** Mesma sala e presença da plataforma; protocolo separado das partidas antigas. */
export function iniciarRoboDosGrimorios(canal: CanalDeJogos, mesa: string, elemento: Elemento = sortearElemento()): () => void {
  let vivo=true, estado: EstadoNovo|null=null, lado: LadoNovo=1;
  let timer: ReturnType<typeof setTimeout>|undefined;
  const pendentes=new Map<number,AcaoNova>();
  const pensar=()=> {
    clearTimeout(timer);
    if(!vivo||!estado||estado.vencedor!==null) return;
    if(estado.pendente ? estado.pendente.lado===lado : estado.ativo!==lado) return;
    timer=setTimeout(()=> {
      if(!estado||!vivo) return;
      const acao=decidirGrimorios(estado,lado); if(!acao) return;
      const seq=estado.seq, r=aplicarNova(estado,acao);
      if(r.ok) {estado=r.estado;canal.enviar(mesa,'arc2:acao',{acao,seq});pensar();}
    },600);
  };
  const parar=canal.ouvir((m)=> {
    if(!vivo||m.mesa!==mesa) return;
    if(m.tipo==='arc2:inicio'&&!estado) {
      const ps=m.participantes as [ParticipanteNovo,ParticipanteNovo];
      if(!Array.isArray(ps)||ps.length!==2) return;
      const i=ps.findIndex((p)=>p.userId===ROBO_DO_ARCANOS.userId);if(i<0)return;
      lado=i as LadoNovo;estado=novaPartidaGrimorios(ps,lado,embaralharNovo(ps[lado].elemento));pensar();
    } else if(m.tipo==='arc2:acao'&&estado) {
      const acao=m.acao as AcaoNova, seq=Number(m.seq);
      if(!Number.isInteger(seq)||seq<estado.seq||seq>estado.seq+30||!acao||acao.lado!==outroNovo(lado)||m.de!==estado.jogadores[acao.lado].userId)return;
      pendentes.set(seq,acao);
      while(estado&&pendentes.has(estado.seq)) {
        const a=pendentes.get(estado.seq)!;pendentes.delete(estado.seq);
        const r=aplicarNova(estado,a);if(!r.ok)break;estado=r.estado;
      }
      pensar();
    }
  });
  const aceitar=()=> !estado&&vivo&&canal.enviar(mesa,'arc2:aceitar',{nome:ROBO_DO_ARCANOS.nome,elemento});
  const t1=setTimeout(aceitar,400),t2=setTimeout(aceitar,2500);
  return ()=>{vivo=false;clearTimeout(timer);clearTimeout(t1);clearTimeout(t2);parar();};
}
