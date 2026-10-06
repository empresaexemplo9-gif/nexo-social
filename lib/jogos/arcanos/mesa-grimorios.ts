import { ehElemento } from './cartas';
import { aplicarNova, defensorNovo, embaralharNovo, novaPartidaGrimorios, publicoNovo, MODOS_NOVOS, type AcaoNova, type EstadoNovo, type LadoNovo, type ModoNovo, type ParticipanteNovo } from './motor-grimorios';
import type { CanalDeJogos } from '../sala-local';
import type { Mensagem } from '../canal';

export type LobbyGrimorios = { host: string; modo: ModoNovo; participantes: ParticipanteNovo[]; capacidade: number; iniciada: boolean };
type Opcoes = {
  canal: CanalDeJogos; mesa: string; eu: { userId: string; nome: string }; host: string;
  elemento?: ParticipanteNovo['elemento']; modo?: ModoNovo; capacidade?: number; espectador?: boolean;
  onEstado: (e: EstadoNovo) => void; onLobby: (l: LobbyGrimorios) => void; onAviso: (s: string) => void;
};

/** O anfitrião reserva elementos e ordena as jogadas. Mãos e decks nunca são enviados. */
export function criarMesaGrimorios(o: Opcoes) {
  let lider = o.host;
  let anfitriao = o.eu.userId === lider;
  let estado: EstadoNovo | null = null, viva = true;
  let lobby: LobbyGrimorios = { host: o.host, modo: o.modo ?? 'livre', capacidade: o.modo && o.modo !== 'livre' ? 6 : o.capacidade ?? 6, participantes: anfitriao && o.elemento ? [{ ...o.eu, elemento: o.elemento, equipe: 0 }] : [], iniciada: false };
  const pedidos = new Set<string>(), fila = new Map<number, AcaoNova>(), historico = new Map<number, AcaoNova>();
  const avisar = (de: string, texto: string) => { if (de === o.eu.userId) o.onAviso(texto); else o.canal.enviar(o.mesa, 'arc2:aviso', { para: de, texto }); };
  const publicarLobby = () => {
    o.onLobby(structuredClone(lobby)); o.canal.enviar(o.mesa, 'arc2:lobby', { lobby });
    void o.canal.anunciar({ id: o.mesa, jogo: 'arcanos', host: lider, hostNome: o.eu.nome, estado: lobby.iniciada ? 'jogando' : 'aberta', jogadores: lobby.participantes.map(p => p.userId), elementos: lobby.participantes.map(p => p.elemento), modo: lobby.modo, capacidade: lobby.capacidade, detalhe: `${MODOS_NOVOS[lobby.modo]} · ${lobby.participantes.length}/${lobby.capacidade}` });
  };
  const publicarEstado = () => { if (estado) o.canal.enviar(o.mesa, 'arc2:publico', { estado: publicoNovo(estado) }); };
  const definir = (e: EstadoNovo) => { estado = e; o.onEstado(e); };
  const receberInicio = (ps: ParticipanteNovo[], modo: ModoNovo) => {
    if (estado) return;
    const i = o.espectador ? -1 : ps.findIndex(p => p.userId === o.eu.userId);
    if (i < 0 && !o.espectador) return;
    try { definir(novaPartidaGrimorios(ps, i < 0 ? null : i as LadoNovo, i < 0 ? undefined : embaralharNovo(ps[i].elemento), modo)); }
    catch { o.onAviso('A formação da mesa é inválida.'); }
  };
  const confirmar = (de: string, acao: AcaoNova, pedido: string) => {
    if (!estado || !anfitriao || pedidos.has(`${de}:${pedido}`) || !acao || estado.jogadores[acao.lado]?.userId !== de) return;
    pedidos.add(`${de}:${pedido}`); if (pedidos.size > 300) pedidos.delete(pedidos.values().next().value!);
    const r = aplicarNova(estado, acao);
    if (!r.ok) { avisar(de, r.erro); return; }
    const seq = estado.seq; historico.set(seq, acao);
    definir(r.estado); o.onAviso(''); o.canal.enviar(o.mesa, 'arc2:commit', { seq, acao }); publicarEstado();
  };
  const receberCommit = (seq: number, acao: AcaoNova) => {
    if (!estado || !Number.isInteger(seq) || seq < estado.seq || seq > estado.seq + 300 || !acao) return;
    fila.set(seq, acao); historico.set(seq, acao);
    let next = estado;
    while (fila.has(next.seq)) {
      const a = fila.get(next.seq)!; fila.delete(next.seq);
      const r = aplicarNova(next, a);
      if (!r.ok) { o.onAviso('Uma jogada não pôde ser sincronizada.'); return; }
      next = r.estado;
    }
    if (next !== estado) { definir(next); o.onAviso(''); }
  };
  const timeLivre = () => {
    const n = lobby.modo === 'duplas' ? 3 : 2, max = lobby.modo === 'duplas' ? 2 : 3;
    return Array.from({ length: n }, (_, i) => i).sort((a,b) => lobby.participantes.filter(p => p.equipe === a).length - lobby.participantes.filter(p => p.equipe === b).length).find(i => lobby.participantes.filter(p => p.equipe === i).length < max) ?? 0;
  };
  const mudarElemento = (de: string, elemento: unknown, nome: unknown) => {
    if (!anfitriao || lobby.iniciada || !ehElemento(elemento)) return;
    const ocupado = lobby.participantes.find(p => p.elemento === elemento && p.userId !== de);
    if (ocupado) { avisar(de, `Esse grimório já foi escolhido por ${ocupado.nome}. Escolha outro elemento.`); publicarLobby(); return; }
    const existente = lobby.participantes.find(p => p.userId === de);
    if (existente) existente.elemento = elemento;
    else {
      if (lobby.participantes.length >= lobby.capacidade) { avisar(de, 'A mesa está completa.'); return; }
      lobby.participantes.push({ userId: de, nome: String(nome ?? 'Jogador').slice(0, 40), elemento, equipe: lobby.modo === 'livre' ? lobby.participantes.length : timeLivre() });
    }
    publicarLobby();
  };
  const anunciarEntrada = () => {
    if (!viva) return;
    if (estado) { if (!anfitriao) o.canal.enviar(o.mesa, 'arc2:sincronizar', { seq: estado.seq }); return; }
    if (anfitriao) publicarLobby();
    else { o.canal.enviar(o.mesa, 'arc2:pedir'); if (!o.espectador && o.elemento && !lobby.participantes.some(p => p.userId === o.eu.userId)) o.canal.enviar(o.mesa, 'arc2:aceitar', { nome: o.eu.nome, elemento: o.elemento }); }
  };
  const off = o.canal.ouvir((m: Mensagem) => {
    if (!viva || m.mesa !== o.mesa) return;
    if (m.tipo === 'arc2:lider' && m.de === lider && estado && estado.jogadores.some(j=>j.userId===m.lider&&j.campo.length)) {
      lider=String(m.lider); anfitriao=lider===o.eu.userId; lobby.host=lider;
      if(anfitriao){publicarLobby();publicarEstado();}
    } else if (m.tipo === 'arc2:aceitar') mudarElemento(m.de, m.elemento, m.nome);
    else if (m.tipo === 'arc2:lobby' && m.de === lider && !anfitriao && !estado) {
      const l = m.lobby as LobbyGrimorios;
      if (!l || l.host !== lider || !Array.isArray(l.participantes) || l.participantes.length > 6 || !['livre','duplas','trios'].includes(l.modo)) return;
      lobby = structuredClone(l); o.onLobby(lobby);
    } else if (m.tipo === 'arc2:equipe' && anfitriao && !lobby.iniciada && lobby.modo !== 'livre') {
      const p = lobby.participantes.find(p => p.userId === m.de), equipe = Number(m.equipe);
      if (!p || !Number.isInteger(equipe) || equipe < 0 || equipe >= (lobby.modo === 'duplas' ? 3 : 2)) return;
      if (lobby.participantes.filter(q => q.userId !== m.de && q.equipe === equipe).length >= (lobby.modo === 'duplas' ? 2 : 3)) { avisar(m.de, 'Esse time está completo.'); return; }
      p.equipe = equipe; publicarLobby();
    } else if (m.tipo === 'arc2:inicio' && m.de === lider && !anfitriao) receberInicio(m.participantes as ParticipanteNovo[], m.modo as ModoNovo);
    else if (m.tipo === 'arc2:pedido' && anfitriao) confirmar(m.de, m.acao as AcaoNova, String(m.pedido));
    else if (m.tipo === 'arc2:commit' && m.de === lider && !anfitriao) receberCommit(Number(m.seq), m.acao as AcaoNova);
    else if (m.tipo === 'arc2:publico' && m.de === lider && o.espectador) {
      const e = m.estado as EstadoNovo;
      if (e?.versao === 2 && Array.isArray(e.jogadores) && e.jogadores.length <= 6 && (!estado || e.seq >= estado.seq)) definir(publicoNovo(e));
    } else if (m.tipo === 'arc2:aviso' && m.de === lider && m.para === o.eu.userId) o.onAviso(String(m.texto));
    else if (m.tipo === 'arc2:pedir' && anfitriao) {
      if (!estado) publicarLobby(); else { o.canal.enviar(o.mesa, 'arc2:inicio', { participantes: lobby.participantes, modo: lobby.modo }); publicarEstado(); }
    } else if (m.tipo === 'arc2:sincronizar' && anfitriao && estado && estado.jogadores.some(p => p.userId === m.de)) {
      const seq = Number(m.seq);
      if (Number.isInteger(seq) && seq >= 0 && seq < estado.seq) for (const [n, a] of Array.from(historico)) if (n >= seq) o.canal.enviar(o.mesa, 'arc2:commit', { seq: n, acao: a });
    } else if (m.tipo === 'arc2:sair-lobby' && anfitriao && !estado && m.de !== lider) { lobby.participantes = lobby.participantes.filter(p => p.userId !== m.de); publicarLobby(); }
    else if (m.tipo === 'arc2:fechada' && m.de === lider) o.onAviso('O anfitrião fechou a mesa.');
  });
  const repetir = setInterval(anunciarEntrada, 4000); anunciarEntrada();
  return {
    jogar(acao: AcaoNova) {
      if (!estado || estado.eu === null || acao.lado !== estado.eu) return;
      const teste = aplicarNova(estado, acao); if (!teste.ok) { o.onAviso(teste.erro); return; }
      const pedido = `${estado.seq}:${globalThis.crypto.randomUUID()}`;
      if (anfitriao) confirmar(o.eu.userId, acao, pedido);
      else o.canal.enviar(o.mesa, 'arc2:pedido', { acao, pedido });
    },
    escolher(elemento: ParticipanteNovo['elemento']) { if (anfitriao) mudarElemento(o.eu.userId, elemento, o.eu.nome); else o.canal.enviar(o.mesa, 'arc2:aceitar', { nome: o.eu.nome, elemento }); },
    equipe(equipe: number) {
      if (anfitriao) { const p = lobby.participantes[0]; if (p && lobby.participantes.filter(q => q.userId !== p.userId && q.equipe === equipe).length < (lobby.modo === 'duplas' ? 2 : 3)) { p.equipe = equipe; publicarLobby(); } }
      else o.canal.enviar(o.mesa, 'arc2:equipe', { equipe });
    },
    configurar(modo: ModoNovo, capacidade: number) {
      if (!anfitriao || estado || !['livre','duplas','trios'].includes(modo)) return;
      const max = modo === 'livre' ? Math.max(2, Math.min(6, Math.floor(capacidade))) : 6;
      if (max < lobby.participantes.length) { o.onAviso('Já há mais jogadores na sala.'); return; }
      lobby.modo = modo; lobby.capacidade = max;
      lobby.participantes.forEach((p, i) => { p.equipe = modo === 'livre' ? i : i % (modo === 'duplas' ? 3 : 2); }); publicarLobby();
    },
    iniciar() {
      if (!anfitriao || estado) return;
      try {
        novaPartidaGrimorios(lobby.participantes, null, undefined, lobby.modo);
        lobby.iniciada = true;
        o.canal.enviar(o.mesa, 'arc2:inicio', { participantes: lobby.participantes, modo: lobby.modo });
        receberInicio(lobby.participantes, lobby.modo); publicarLobby(); publicarEstado();
      } catch (e) { o.onAviso(e instanceof Error ? e.message : 'Complete a formação.'); }
    },
    resolverPrazo() {
      if (!anfitriao || !estado || estado.vencedor !== null) return;
      // O anfitrião encerra a janela mesmo se o defensor se desconectar.
      const d = defensorNovo(estado);
      if (d !== null && d >= 0) confirmar(estado.jogadores[d].userId, { t: 'resolver', lado: d }, `prazo:${estado.seq}`);
      else if (!estado.pendente) {
        const j = estado.jogadores[estado.ativo];
        const acao: AcaoNova = !j.comprou && (j.baralhoQtd || j.reservaQtd) ? { t: 'comprar', lado: estado.ativo, pilha: j.baralhoQtd ? 'magia' : 'mana' } : { t: 'passar', lado: estado.ativo };
        confirmar(j.userId, acao, `prazo:${estado.seq}`);
      }
    },
    fechar() {
      if(anfitriao&&estado&&estado.vencedor===null){const proximo=estado.jogadores.find(j=>j.userId!==o.eu.userId&&j.campo.length);if(proximo)o.canal.enviar(o.mesa,'arc2:lider',{lider:proximo.userId});}
      viva=false;clearInterval(repetir);off();if(!estado)o.canal.enviar(o.mesa,anfitriao?'arc2:fechada':'arc2:sair-lobby');
    },
  };
}
