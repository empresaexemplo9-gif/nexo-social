'use client';

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ELEMENTOS, ELEMENTOS_ORDEM, type Elemento } from '@/lib/jogos/arcanos/cartas';
import { cartaNova, personagensDoGrimorio, GLOSSARIO_NOVO, type CartaNova } from '@/lib/jogos/arcanos/grimorios';
import { alvosAtaqueNovo, alvosNovos, combatente, manaLivreNova, aliadosNovos, defensorNovo, podeReagirNovo, MODOS_NOVOS, podeAtaqueNovo, podeCartaNova, type AcaoNova, type Combatente, type EstadoNovo, type JogadorNovo, type LadoNovo } from '@/lib/jogos/arcanos/motor-grimorios';
import { ArteGrimorio } from './CartasGrimorios';
import styles from './CampoDeBatalha.module.css';
import MiniaturasDoTabuleiro from './MiniaturasDoTabuleiro';

export type SelecaoDeBatalha = { tipo: 'carta' | 'ataque'; id: string };
interface Props {
  estado: EstadoNovo; selecionada: SelecaoDeBatalha | null; segundos: number;
  onJogar: (acao: AcaoNova) => void; onSelecionar: (s: SelecaoDeBatalha | null) => void;
  onAlvo: (id: string) => void; onInspecionar: (c: CartaNova) => void; onAviso: (s: string) => void;
  onCartas: () => void; onRegras: () => void; onSair: () => void; onRevanche?: () => void;
}
const CENARIOS: Record<Elemento, string> = {
  fogo: 'Fortaleza da Forja Rubra', agua: 'Cidadela das Marés', terra: 'Fortaleza das Raízes',
  ar: 'Cidadela dos Quatro Ventos', luz: 'Santuário da Aurora', escuridao: 'Fortaleza do Eclipse',
};
const FUNCOES: Record<string, string> = { tank: 'Tank', mago: 'Mago', suporte: 'Suporte', guerreiro: 'Guerreiro', arqueiro: 'Arqueiro' };
const SIMBOLOS: Record<string, string> = { tank: '⛨', mago: '✦', suporte: '✚', guerreiro: '⚔', arqueiro: '➶' };
const ROTULOS: Record<string, string> = { atordoamento: 'Atordoado', congelamento: 'Congelado', enraizamento: 'Enraizado', desorientacao: 'Desorientado', vulnerabilidade: 'Vulnerável', regeneracao: 'Regeneração', queimadura: 'Queimadura', evasao: 'Evasão', determinacao: 'Determinação', tenacidade: 'Tenacidade' };
const FRENTE = [6, 0, 2, 1, 7], RETAGUARDA = [8, 4, 3, 5, 9];
const TINTA = (el: Elemento) => ({ '--cor': ELEMENTOS[el].clara, '--brilho': ELEMENTOS[el].brilho, '--sombra': ELEMENTOS[el].escura } as React.CSSProperties);

function Selo({ elemento, className }: { elemento: Elemento; className?: string }) {
  const caminhos: Record<Elemento, React.ReactNode> = {
    fogo: <path d="M12 2C14 8 20 10 19 16a7 7 0 0 1-14 0c-1-5 3-7 4-11 0 4 2 5 3 6 2-3 0-5 0-9Z" />,
    agua: <path d="M12 2C10 6 4 12 4 16a8 8 0 0 0 16 0c0-4-6-10-8-14Z" />,
    terra: <path d="m2 20 7-15 4 9 3-5 6 11H2Zm5-7 3 2 3-1" />,
    ar: <path d="M2 7h13c6 0 5-8 1-5M2 12h17c5 0 5 7 1 7M2 17h9c5 0 5 6 1 6" />,
    luz: <><circle cx="12" cy="12" r="5" /><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" /></>,
    escuridao: <path d="M17 3a9 9 0 1 0 4 15A10 10 0 0 1 17 3Z" />,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{caminhos[elemento]}</svg>;
}

type Pulso = { chave: string; unidade: string; tipo: 'dano' | 'cura' | 'escudo' | 'especial' | 'controle'; texto: string };
const SEM_PULSOS: Pulso[] = [];
function usePulsos(e: EstadoNovo) {
  const anterior = useRef<EstadoNovo | null>(null);
  const [pulsos, setPulsos] = useState<Pulso[]>([]);
  useEffect(() => {
    const antes = anterior.current; anterior.current = e;
    if (!antes || antes.seq === e.seq) return;
    const novos: Pulso[] = [];
    const novoCampo = new Map(e.jogadores.flatMap(j => j.campo).map(p => [p.id, p]));
    for (const p of antes.jogadores.flatMap(j => j.campo)) {
      const n = novoCampo.get(p.id);
      const vida = n?.vida ?? 0, escudo = n?.escudo ?? 0;
      const adicionar = (tipo: Pulso['tipo'], texto: string) => novos.push({ chave: `${e.seq}:${p.id}:${tipo}`, unidade: p.id, tipo, texto });
      if (vida < p.vida) adicionar('dano', `−${p.vida - vida} VIDA`);
      if (vida > p.vida) adicionar('cura', `+${vida - p.vida} VIDA`);
      if (escudo !== p.escudo) adicionar('escudo', `${escudo > p.escudo ? '+' : '−'}${Math.abs(escudo - p.escudo)} ESCUDO`);
      if (n && n.usoEspecial > p.usoEspecial) adicionar('especial', cartaNova(p.carta).especial!.nome);
      const novoStatus = n?.efeitos.find(x => !p.efeitos.some(v => v.tipo === x.tipo));
      if (novoStatus) adicionar('controle', ROTULOS[novoStatus.tipo] ?? novoStatus.tipo);
    }
    setPulsos(v => [...v, ...novos].slice(-24));
    const t = setTimeout(() => setPulsos([]), 2300);
    return () => clearTimeout(t);
  }, [e]);
  return pulsos;
}

const Unidade = memo(function Unidade({ carta, pessoa, id, alvo, escolhida, conjurando, sobAtaque, podeAtacar, pulsos, onClick, onInspecionar, registrar }: {
  carta: CartaNova; pessoa?: Combatente; id: string; alvo: boolean; escolhida: boolean; conjurando: boolean; sobAtaque: boolean; podeAtacar: boolean;
  pulsos: Pulso[]; onClick: (id: string) => void; onInspecionar: (c: CartaNova) => void; registrar: (id: string, node: HTMLElement | null) => void;
}) {
  const nome = carta.nome.split(',')[0], vivo = !!pessoa && pessoa.vida > 0;
  const congelado = pessoa?.efeitos.some(x => x.tipo === 'congelamento');
  const queimando = pessoa?.efeitos.some(x => x.tipo === 'queimadura');
  return <article ref={node => registrar(id, node)} className={`${styles.unidade} ${!vivo ? styles.eliminada : ''} ${alvo ? styles.alvo : ''} ${escolhida ? styles.escolhida : ''} ${conjurando ? styles.conjurando : ''} ${sobAtaque ? styles.sobAtaque : ''} ${congelado ? styles.congelada : ''} ${queimando ? styles.queimando : ''}`} style={TINTA(carta.elemento)} data-unidade={id}>
    <button className={styles.ficha} onClick={() => vivo ? onClick(id) : onInspecionar(carta)} aria-label={`${nome}, ${vivo ? `vida ${pessoa.vida}, escudo ${pessoa.escudo}${alvo ? ', escolher alvo' : ''}` : 'eliminado'}`} aria-pressed={escolhida}>
      <span className={styles.baseMiniatura} data-miniatura-base={vivo ? id : undefined} data-miniatura-personagem={vivo ? carta.id : undefined} aria-hidden="true" /><div className={styles.retrato} data-miniatura-carta="true"><ArteGrimorio c={carta} altura={64} /><span className={styles.funcao} title={FUNCOES[carta.funcao!]}>{SIMBOLOS[carta.funcao!]}</span>{!!pessoa?.escudo && <span className={styles.escudo} title={`${pessoa.escudo} pontos de escudo`}>⛨ {pessoa.escudo}</span>}{podeAtacar && <span className={styles.pronto} title="Pode atacar" aria-label="Pode atacar" />}</div>
      <strong className={styles.nome}>{nome}</strong>
      <div className={styles.numeros}><span>♥ {pessoa?.vida ?? 0}<small>/{carta.vida}</small></span><span>⚔ {carta.ataque}{pessoa?.atacou ? ' ✓' : ''}</span></div>
      <div className={styles.barraVida}><i style={{ width: `${(pessoa?.vida ?? 0) / carta.vida! * 100}%` }} /></div>
      {!vivo && <span className={styles.morto}>Eliminado</span>}
    </button>
    <button className={styles.info} onClick={() => onInspecionar(carta)} aria-label={`Ver carta de ${nome}`}>i</button>
    {pessoa && <div className={styles.status}>{pessoa.efeitos.slice(0, 3).map(x => <span key={x.tipo} title={GLOSSARIO_NOVO[x.tipo]}>{ROTULOS[x.tipo] ?? x.tipo}</span>)}</div>}
    <div className={styles.pulsos} aria-live="off">{pulsos.map((v, i) => <span key={v.chave} className={styles[v.tipo]} style={{ '--nivel': i } as React.CSSProperties}>{v.texto}</span>)}</div>
  </article>;
});

function Fonte({ jogador, pequena = false }: { jogador: JogadorNovo; pequena?: boolean }) {
  const livre = manaLivreNova(jogador);
  return <div className={`${styles.fonte} ${pequena ? styles.fontePequena : ''}`} style={TINTA(jogador.elemento)}>
    <div className={styles.fonteTitulo}><Selo elemento={jogador.elemento} /><span>{pequena ? 'Mana em campo' : 'Sua fonte de mana'}<b>{livre}<small>/{jogador.fonte}</small></b></span></div>
    <div className={styles.cristais} role="img" aria-label={`${livre} de ${jogador.fonte} cargas disponíveis; capacidade 12`}>{Array.from({ length: 12 }, (_, i) => <i key={i} className={`${i < jogador.fonte ? styles.cristalAtivo : ''} ${i < jogador.gasta ? styles.cristalGasto : ''}`} />)}</div>
    {!pequena && <small>As cargas se renovam no seu turno.</small>}
  </div>;
}

function Memorial({ jogador, onInspecionar }: { jogador: JogadorNovo; onInspecionar: (c: CartaNova) => void }) {
  return <div className={styles.memorial}><p>Eliminados <b>{jogador.mortos.length}</b></p><div>{jogador.mortos.length ? jogador.mortos.map(id => <button key={id} title={cartaNova(id).nome} aria-label={`Ver personagem eliminado ${cartaNova(id).nome}`} onClick={() => onInspecionar(cartaNova(id))}>{cartaNova(id).nome.split(',')[0]}</button>) : <span>Nenhuma baixa</span>}</div></div>;
}

function MapaDeConjuracao({ e, referencias, palco }: { e: EstadoNovo; referencias: React.MutableRefObject<Map<string, HTMLElement>>; palco: React.RefObject<HTMLDivElement> }) {
  const [linhas, setLinhas] = useState<string[]>([]);
  useLayoutEffect(() => {
    const area = palco.current, pendente = e.pendente;
    if (!area || !pendente) { setLinhas([]); return; }
    const atualizar = () => {
      const caixa = area.getBoundingClientRect(), de = referencias.current.get(pendente.conjurador)?.getBoundingClientRect();
      if (!de || !caixa.width || !caixa.height) return;
      const ponto = (r: DOMRect) => [(r.left + r.width / 2 - caixa.left) / caixa.width * 1000, (r.top + r.height / 2 - caixa.top) / caixa.height * 1000];
      const [x, y] = ponto(de);
      const ids = Array.from(new Set([...(pendente.alvo ? [pendente.alvo] : []), ...pendente.alvosGrupo]));
      setLinhas(ids.flatMap(id => { const para = referencias.current.get(id)?.getBoundingClientRect(); if (!para) return []; const [tx, ty] = ponto(para); return [`M${x} ${y} Q${(x + tx) / 2 + 65} ${(y + ty) / 2} ${tx} ${ty}`]; }));
    };
    atualizar(); const observer = new ResizeObserver(atualizar); observer.observe(area);
    return () => observer.disconnect();
  }, [e.pendente, palco, referencias]);
  if (!e.pendente || !linhas.length) return null;
  return <svg className={styles.trajetos} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" style={{ color: ELEMENTOS[e.jogadores[e.pendente.lado].elemento].clara }}><defs><marker id="ponta-conjuracao" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="currentColor" strokeWidth="1.5" /></marker></defs>{linhas.map((d, i) => <g key={`${e.seq}:${i}`}><path d={d} className={styles.trajetoAura} /><path d={d} className={styles.trajeto} markerEnd="url(#ponta-conjuracao)" /></g>)}</svg>;
}

export default function CampoDeBatalha({ estado: e, selecionada, segundos, onJogar, onSelecionar, onAlvo, onInspecionar, onAviso, onCartas, onRegras, onSair, onRevanche }: Props) {
  const lado = e.eu ?? 0, meu = e.jogadores[lado], rival = e.jogadores.find((j, i) => !aliadosNovos(e, lado, i as LadoNovo)) ?? e.jogadores[0], espectador = e.eu === null;
  const [cenario, setCenario] = useState<Elemento>(meu.elemento), [animacoes, setAnimacoes] = useState(true), [registro, setRegistro] = useState(false);
  const [angulo, setAngulo] = useState(.12);
  const vivos = useMemo(() => e.jogadores.flatMap(j => j.campo), [e.jogadores]);
  const outros = e.jogadores.filter(j => j !== meu);
  const nomeVencedor = e.vencedor === null || e.vencedor === 'empate' ? '' : e.modo === 'livre' ? e.jogadores[e.vencedor].nome : `Time ${e.jogadores[e.vencedor].equipe + 1}`;
  const palco = useRef<HTMLDivElement>(null), referencias = useRef(new Map<string, HTMLElement>());
  const pulsos = usePulsos(e);
  const pulsosPorUnidade = useMemo(() => {
    const mapa = new Map<string, Pulso[]>();
    if (animacoes) for (const p of pulsos) mapa.set(p.unidade, [...(mapa.get(p.unidade) ?? []), p]);
    return mapa;
  }, [pulsos, animacoes]);
  const vez = !espectador && e.ativo === lado && !e.pendente && e.vencedor === null;
  const alvos = useMemo(() => selecionada ? selecionada.tipo === 'ataque' ? alvosAtaqueNovo(e, lado) : alvosNovos(e, lado, cartaNova(selecionada.id)) : [], [e, lado, selecionada]);
  const registrar = useCallback((id: string, el: HTMLElement | null) => { if (el) referencias.current.set(id, el); else referencias.current.delete(id); }, []);
  const clicar = useCallback((id: string) => {
    const p = combatente(e, id); if (!p) return;
    if (alvos.includes(id)) { onAlvo(id); return; }
    if (!espectador && p.dono === lado && podeAtaqueNovo(e, p)) { onSelecionar({ tipo: 'ataque', id }); onAviso('Escolha um dos alvos iluminados para o ataque.'); }
    else onInspecionar(cartaNova(p.carta));
  }, [e, alvos, espectador, lado, onAlvo, onSelecionar, onAviso, onInspecionar]);
  const usar = (c: CartaNova) => {
    if (c.alvo === 'grupo' || c.alvo === 'si') onJogar({ t: 'jogar', lado, carta: c.id, alvo: c.alvo === 'si' ? meu.campo.find(p => p.carta === c.conjurador)?.id : undefined });
    else { onSelecionar({ tipo: 'carta', id: c.id }); onAviso(`Escolha um ${c.alvo === 'aliado' ? 'aliado' : 'inimigo'} iluminado para ${c.nome}.`); }
  };
  const linha = (j: JogadorNovo, indices: number[], rotulo: string) => {
    const cartas = personagensDoGrimorio(j.elemento), dono = e.jogadores.indexOf(j) as LadoNovo;
    return <div className={styles.linha} aria-label={`${j.nome}: ${rotulo}`}><span className={styles.rotuloLinha}>{rotulo}</span><div className={styles.formacao}>{indices.map(i => { const c = cartas[i], id = `${dono}:${c.id}`, p = j.campo.find(p => p.id === id); return <Unidade key={id} id={id} carta={c} pessoa={p} alvo={!!p && alvos.includes(id)} escolhida={selecionada?.id === id} conjurando={e.pendente?.conjurador === id} sobAtaque={e.pendente?.alvo === id || !!e.pendente?.alvosGrupo.includes(id)} podeAtacar={!!p && !espectador && p.dono === lado && podeAtaqueNovo(e, p)} pulsos={pulsosPorUnidade.get(id) ?? SEM_PULSOS} onClick={clicar} onInspecionar={onInspecionar} registrar={registrar} />; })}</div></div>;
  };
  const cabecalho = (j: JogadorNovo, proprio: boolean) => <div className={styles.exercito} style={TINTA(j.elemento)}><Selo elemento={j.elemento} /><div><strong>{j.nome}</strong><span>{ELEMENTOS[j.elemento].nome} · {j.campo.length} vivos{e.modo !== 'livre' ? ` · Time ${j.equipe + 1}` : ''}</span></div><div className={styles.maoOculta} aria-label={`${j.maoQtd} magias e feitiços na mão${proprio ? '' : ' oculta'}`}>{Array.from({ length: Math.min(4, j.maoQtd) }, (_, i) => <i key={i} />)}<b>{j.maoQtd}</b></div></div>;
  const podePassar = vez && (meu.comprou || !meu.baralhoQtd && !meu.reservaQtd);
  const podeReagir = !espectador && podeReagirNovo(e, lado);
  const podeResolver = !espectador && defensorNovo(e) === lado;
  const titulo = e.vencedor !== null ? e.vencedor === 'empate' ? 'Empate' : `${nomeVencedor} venceu` : e.pendente ? e.pendente.dano ? `Golpe de ${e.pendente.dano} pontos` : 'Conjuração em preparação' : vez ? 'Sua vez' : espectador ? `Vez de ${e.jogadores[e.ativo].nome}` : 'Vez do adversário';
  const instrucao = e.vencedor !== null ? 'O duelo terminou.' : e.pendente ? podeReagir ? 'Use um escudo de suporte ou aplique o golpe.' : 'O defensor está preparando sua resposta.' : selecionada ? 'Escolha um alvo iluminado no campo.' : vez ? !meu.comprou && (meu.baralhoQtd || meu.reservaQtd) ? 'Comece comprando magia/feitiço ou mana.' : 'Conjure suas cartas ou selecione um personagem para atacar.' : 'Você pode preparar uma reação com escudo de suporte.';
  const conjuradorSelecionado = selecionada?.tipo === 'carta' ? cartaNova(selecionada.id).conjurador : undefined;
  return <div className={styles.arena} data-elemento={cenario} data-animacoes={animacoes} style={TINTA(cenario)}>
    <div className={styles.cenario}><Image src={`/jogos/arcanos/campos/${cenario}.png`} alt="" fill sizes="100vw" priority unoptimized /></div><div className={styles.nevoa} aria-hidden="true" /><div className={styles.particulas} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--i': i } as React.CSSProperties} />)}</div>
    <div className={styles.conteudo}>
      <header className={styles.cabecalho}><div><p>DRAP · ARCANOS</p><h1>{CENARIOS[cenario]}</h1></div><div className={styles.ferramentas}><label>Cenário<select aria-label="Cenário do campo" value={cenario} onChange={v => setCenario(v.target.value as Elemento)}>{ELEMENTOS_ORDEM.map(el => <option key={el} value={el}>{ELEMENTOS[el].nome}</option>)}</select></label><button onClick={() => setAnimacoes(a => !a)} aria-pressed={animacoes} title="Ativar ou desativar animações">{animacoes ? 'Efeitos ligados' : 'Efeitos desligados'}</button><button onClick={onCartas}>Cartas</button><button onClick={onRegras}>Regras</button><button onClick={onSair}>Sair</button></div></header>
      <div className={styles.mesa}>
        <aside className={styles.alaEsquerda} aria-label="Baralhos e personagens eliminados" data-zona="decks"><div className={styles.painel}><h2>DECKS DOS JOGADORES</h2>{outros.map(j => <div key={j.userId} className={styles.reservaJogador}><strong style={{ color: ELEMENTOS[j.elemento].clara }}>{j.nome}</strong><div className={styles.pilhasRivais}><span>✦<b>{j.baralhoQtd}</b><small>Magias / feitiços</small></span><span>◇<b>{j.reservaQtd}</b><small>Mana</small></span></div><p className={styles.nota}>Mão oculta · {j.maoQtd} magias · {j.maoManaQtd} manas</p><Memorial jogador={j} onInspecionar={onInspecionar} /></div>)}</div><div className={styles.painel}><h2>SEUS DECKS</h2><button className={`${styles.pilha} ${styles.pilhaMagia}`} disabled={!vez || meu.comprou || !meu.baralhoQtd} onClick={() => onJogar({ t: 'comprar', lado, pilha: 'magia' })} aria-label={`Comprar magia/feitiço · ${meu.baralhoQtd}`}><Selo elemento={meu.elemento} /><b>{meu.baralhoQtd}</b><span>Comprar magia<br />ou feitiço</span></button><small className={styles.nota}>Escolha uma das duas pilhas por turno.</small></div></aside>
        <div ref={palco} className={styles.palco} aria-label="Tabuleiro de batalha" data-zona="tabuleiro" data-camera="superior">
          <div className={styles.tabuleiroCabecalho}><div><small>CAMPO · CARTAS EM JOGO</small><h2>{MODOS_NOVOS[e.modo]} · {e.jogadores.length} jogadores</h2></div><div className={styles.girarMiniaturas}><button aria-label="Girar miniaturas para a esquerda" onClick={() => setAngulo(a => a - .5)}>↶</button><span>Visão de cima</span><button aria-label="Girar miniaturas para a direita" onClick={() => setAngulo(a => a + .5)}>↷</button></div></div><MiniaturasDoTabuleiro campo={vivos} palco={palco} angulo={angulo} animacoes={animacoes}/><div className={styles.anel} aria-hidden="true"><Selo elemento={cenario} /></div>
          <div className={styles.centro} data-reacao={!!e.pendente}><div className={styles.relogio} style={{ '--tempo': `${Math.min(100, segundos / (e.pendente ? 20 : 100) * 100)}%` } as React.CSSProperties}><Selo elemento={e.jogadores[e.ativo].elemento} /><span>{e.vencedor === null ? segundos : '✓'}</span></div><div className={styles.chamada}><small>Turno {e.turno}{espectador ? ' · Assistindo' : ''}</small><h2>{titulo}</h2><p>{instrucao}</p>{e.pendente && <span className={styles.magiaPendente}>{e.pendente.carta ? cartaNova(e.pendente.carta).nome : 'Ataque básico'}{e.pendente.alvo && combatente(e, e.pendente.alvo) ? ` → ${cartaNova(combatente(e, e.pendente.alvo)!.carta).nome.split(',')[0]}` : ''}</span>}</div><div className={styles.acoes}>{selecionada && <button onClick={() => { onSelecionar(null); onAviso(''); }}>Cancelar seleção</button>}{!espectador && e.vencedor === null && (e.pendente ? <button className={styles.botaoAcao} disabled={!podeResolver} onClick={() => onJogar({ t: 'resolver', lado })}>Aplicar golpe</button> : <button className={styles.botaoAcao} disabled={!podePassar} onClick={() => onJogar({ t: 'passar', lado })}>Encerrar turno</button>)}</div></div><nav className={styles.navegarExercitos} aria-label="Ir para o exército">{e.jogadores.map((j,i)=><button key={j.userId} style={{color:ELEMENTOS[j.elemento].clara}} onClick={()=>palco.current?.querySelectorAll<HTMLElement>('[data-exercito]').forEach(el=>{if(el.dataset.exercito===j.userId)el.scrollIntoView({block:'nearest',inline:'nearest',behavior:animacoes?'smooth':'auto'});})}>{j===meu&&!espectador?'Seu campo':j.nome} · {e.modo==='livre'?ELEMENTOS[j.elemento].nome:'Time '+(j.equipe+1)}{i===e.ativo?' ◉':''}</button>)}</nav><div className={styles.outrosExercitos} data-area-formacoes="true" aria-label="Exércitos no tabuleiro"><section className={styles.ladoProprio} aria-label="Sua formação" data-exercito={meu.userId} data-ativo={e.ativo === lado}>{cabecalho(meu,true)}{linha(meu, FRENTE, 'Linha de frente')}{linha(meu, RETAGUARDA, 'Retaguarda')}<div className={styles.manasEmCampo} aria-label="Suas cartas de mana no tabuleiro"><strong>MANA EM CAMPO · {meu.manaEmJogo.length}</strong><div>{meu.manaEmJogo.map((id,i)=><button key={id+':'+i} title={cartaNova(id).nome} aria-label={'Ver mana em campo '+cartaNova(id).nome} onClick={()=>onInspecionar(cartaNova(id))}><ArteGrimorio c={cartaNova(id)} altura={42}/><span>+{cartaNova(id).cargas}</span></button>)}{!meu.manaEmJogo.length&&<small>As manas usadas saem da mão e ficam aqui.</small>}</div></div></section>{outros.map(j=><section key={j.userId} className={styles.ladoRival} data-exercito={j.userId} aria-label={j.nome+' · '+(aliadosNovos(e,lado,e.jogadores.indexOf(j) as LadoNovo)?'Aliado':'Adversário')} data-ativo={e.jogadores[e.ativo]===j}>{cabecalho(j,false)}<p className={styles.relacao}>{aliadosNovos(e,lado,e.jogadores.indexOf(j) as LadoNovo)?'ALIADO · PODE RECEBER SUA CURA E ESCUDO':'ADVERSÁRIO'}{e.jogadores[e.ativo]===j?' · JOGANDO AGORA':''}</p>{linha(j,RETAGUARDA,'Retaguarda')}{linha(j,FRENTE,'Linha de frente')}</section>)}</div><p className={styles.dicaJogadores}>{outros.length>1?'Use os nomes acima para navegar entre os exércitos.':''}</p>


          {animacoes && <MapaDeConjuracao e={e} referencias={referencias} palco={palco} />}
        </div>
        <aside className={styles.alaDireita} aria-label="Fontes e baralho de mana"><div className={styles.painel}>{outros.map(j=><div key={j.userId} className={styles.reservaJogador}><strong>{j.nome}</strong><Fonte jogador={j} pequena /></div>)}<div className={styles.condicaoVitoria}>Vence quem mantém pelo menos um personagem vivo.</div></div><div className={styles.painel}><Fonte jogador={meu} /><button className={`${styles.pilha} ${styles.pilhaMana}`} disabled={!vez || meu.comprou || !meu.reservaQtd} onClick={() => onJogar({ t: 'comprar', lado, pilha: 'mana' })} aria-label={`Comprar mana · ${meu.reservaQtd}`}><span className={styles.gemaGrande} /><b>{meu.reservaQtd}</b><span>Comprar mana</span></button><div className={styles.descarte}><strong>DESCARTE · {meu.descarte.length}</strong>{!!meu.descarte.length&&<button onClick={()=>onInspecionar(cartaNova(meu.descarte[meu.descarte.length-1]))}>Ver última magia usada</button>}</div><Memorial jogador={meu} onInspecionar={onInspecionar} /></div></aside>
      </div>
      {!espectador && e.vencedor === null && <section className={styles.mao} aria-label="Suas cartas na mão" data-zona="mao"><div className={styles.maoCabecalho}><h2>MÃO · SUAS CARTAS <small>{meu.maoQtd} magias/feitiços</small></h2><p>⚔ Ataques {meu.ataques}/2 · {meu.comprou ? 'Compra feita' : 'Compra pendente'}</p></div><div className={styles.cartasNaMao}><div className={styles.manasNaMao}><small>MANAS NA MÃO</small>{(meu.maoMana ?? []).map((id, i) => { const c = cartaNova(id); return <button key={`${id}:${i}`} disabled={!vez || !meu.comprou || meu.jogouMana || meu.fonte + c.cargas! > 12} onClick={() => onJogar({ t: 'mana', lado, carta: id })} aria-label={`+${c.cargas} mana · ${c.nome}`} title={c.nome}><i className={styles.gemaGrande} /><span>+{c.cargas} mana</span></button>; })}{!meu.maoManaQtd && <span>Nenhuma mana</span>}</div>{(meu.mao ?? []).map((id, i) => { const c = cartaNova(id), erro = podeCartaNova(e, lado, id), destaque = selecionada?.id === id; return <article key={`${id}:${i}`} className={`${styles.cartaDaMao} ${destaque ? styles.cartaSelecionada : ''} ${c.conjurador === conjuradorSelecionado ? styles.conjuradorNaMao : ''}`} style={TINTA(c.elemento)}><button className={styles.usarCarta} aria-label={`Usar ${c.nome}`} disabled={!!erro} title={erro ?? c.texto} onClick={() => usar(c)}><span className={styles.custo}>{c.custo}</span><ArteGrimorio c={c} altura={62} /><strong>{c.nome}</strong><span className={styles.tipoCarta}>{c.tipo === 'magia' ? 'Magia' : 'Feitiço'} · {c.conjurador ? cartaNova(c.conjurador).nome.split(',')[0] : ''}</span><span className={styles.resumoCarta}>{erro ?? c.texto}</span></button><button className={styles.detalheMao} onClick={() => onInspecionar(c)}>Ver carta</button></article>; })}</div></section>}
      {e.vencedor !== null && <section className={styles.resultado} role="status"><Selo elemento={e.vencedor === 'empate' ? cenario : e.jogadores[e.vencedor].elemento} /><h2>{titulo}</h2><p>{e.vencedor === 'empate' ? 'Nenhum personagem permaneceu em campo.' : `${e.vencedores.reduce<number>((n,i)=>n+e.jogadores[i].campo.length,0)} personagem(ns) do vencedor permaneceram em campo.`}</p>{onRevanche && <button className={styles.botaoAcao} onClick={onRevanche}>Jogar novamente</button>}</section>}
      <footer className={styles.rodape}><span>Tank ⛨ · Guerreiro ⚔ · Mago ✦ · Suporte ✚ · Arqueiro ➶</span><button onClick={() => setRegistro(a => !a)} aria-expanded={registro}>Registro do duelo</button></footer>
      {registro && <ol className={styles.registro} aria-label="Registro do duelo">{e.log.map((s, i) => <li key={i}>{s}</li>)}</ol>}
    </div>
  </div>;
}
