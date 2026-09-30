'use client';

import React from 'react';
import Arte from './Arte';
import { carta as definicao, ESCOLAS, PALAVRAS, textoDaCarta, type Carta } from '@/lib/jogos/arcanos/cartas';
import { ataqueDe, tem, vidaRestante, vidaTotal, type Criatura } from '@/lib/jogos/arcanos/motor';

// A estética do Arcanos: moldura escura com filete dourado, pergaminho na cor
// da escola, janela de arte com o brasão, gema de custo e placa de ataque e
// vida — como uma carta de fantasia clássica. Tudo escala a partir da largura.

const OURO = '#d4af37';
const RARIDADE: Record<Carta['raridade'], string> = { comum: '#9ca3af', rara: '#60a5fa', lendaria: '#f59e0b' };

export function GemaDeEter({ valor, tamanho = '1.9em', apagada = false }: { valor: number | string; tamanho?: string; apagada?: boolean }) {
  return (
    <span
      className="fonte-arcana relative inline-flex shrink-0 items-center justify-center rounded-full font-black text-white"
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: `calc(${tamanho} * 0.52)`,
        background: apagada ? 'radial-gradient(circle at 35% 30%, #94a3b8, #334155 70%)' : 'radial-gradient(circle at 35% 30%, #a5f3fc, #0891b2 45%, #083344 90%)',
        boxShadow: `0 0 0 2px ${OURO}, 0 2px 6px rgba(0,0,0,.5), inset 0 -3px 6px rgba(0,0,0,.35)`,
        textShadow: '0 1px 2px rgba(0,0,0,.8)',
      }}
    >
      {valor}
    </span>
  );
}

function Placa({ ataque, vida, ferida = false, forte = false }: { ataque: number; vida: number; ferida?: boolean; forte?: boolean }) {
  return (
    <span
      className="fonte-arcana inline-flex items-center gap-[0.35em] rounded-[0.5em] px-[0.5em] py-[0.15em] font-black"
      style={{ background: 'linear-gradient(180deg,#3a2c1c,#140e08)', color: '#f8e7b5', boxShadow: `0 0 0 1.5px ${OURO}, 0 2px 4px rgba(0,0,0,.5)` }}
    >
      <span style={{ color: forte ? '#86efac' : undefined }}>{ataque}</span>
      <span style={{ opacity: 0.6 }}>/</span>
      <span style={{ color: ferida ? '#fca5a5' : forte ? '#86efac' : undefined }}>{vida}</span>
    </span>
  );
}

/** Texto de regras com as palavras-chave em negrito. */
function Regras({ c }: { c: Carta }) {
  const nomes = Object.values(PALAVRAS).map((p) => p.nome);
  const marcar = (t: string) => {
    const partes = t.split(new RegExp(`(${['Ao entrar:', 'Ao morrer:', ...nomes].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g'));
    return partes.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : <React.Fragment key={i}>{p}</React.Fragment>));
  };
  return (
    <>
      {textoDaCarta(c).map((l, i) => (
        <p key={i} className="leading-[1.18]">{marcar(l)}</p>
      ))}
    </>
  );
}

/** A carta inteira (mão, prévia, coleção). */
export function CartaGrande({
  id,
  largura = 176,
  onClick,
  desabilitada = false,
  destaque = false,
  titulo,
}: {
  id: string;
  largura?: number;
  onClick?: () => void;
  desabilitada?: boolean;
  destaque?: boolean;
  titulo?: string;
}) {
  const c = definicao(id);
  const e = ESCOLAS[c.escola];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={titulo}
      aria-label={onClick ? `${c.nome}, custo ${c.custo}${c.tipo === 'criatura' ? `, ${c.ataque}/${c.vida}` : ''}` : undefined}
      className={`relative block shrink-0 select-none rounded-[0.9em] p-[0.32em] text-left transition duration-200 ${onClick ? 'hover:-translate-y-2 focus-visible:-translate-y-2 focus-visible:outline-none' : ''} ${desabilitada ? 'opacity-55 saturate-50' : ''}`}
      style={{
        width: largura,
        aspectRatio: '5 / 7',
        fontSize: largura / 12,
        background: 'linear-gradient(145deg,#2d2319,#0e0a06)',
        boxShadow: destaque
          ? `0 0 0 2px ${OURO}, 0 0 22px 4px ${e.brilho}, 0 10px 24px rgba(0,0,0,.55)`
          : `0 0 0 1px rgba(212,175,55,.55), 0 8px 18px rgba(0,0,0,.45)`,
      }}
    >
      <span
        className="flex h-full flex-col overflow-hidden rounded-[0.65em]"
        style={{
          background: `linear-gradient(180deg, ${e.clara} 0%, #f4e9cf 55%, #eadbb6 100%)`,
          boxShadow: `inset 0 0 0 0.18em ${e.cor}, inset 0 0 1.6em rgba(80,50,10,.25)`,
        }}
      >
        {/* Nome e custo */}
        <span className="flex items-center gap-[0.3em] px-[0.45em] pb-[0.15em] pt-[0.4em]">
          <span className="fonte-arcana min-w-0 flex-1 truncate font-bold leading-none" style={{ color: e.escura, fontSize: '0.92em' }}>
            {c.nome}
          </span>
          <GemaDeEter valor={c.custo} tamanho="1.75em" />
        </span>

        {/* Arte */}
        <span
          className="relative mx-[0.4em] flex items-center justify-center overflow-hidden rounded-[0.35em]"
          style={{
            height: '40%',
            background: `radial-gradient(circle at 50% 38%, ${e.brilho} 0%, ${e.cor} 38%, ${e.escura} 100%)`,
            boxShadow: `inset 0 0 0 0.12em ${OURO}, inset 0 0 1.2em rgba(0,0,0,.55)`,
          }}
        >
          <span
            aria-hidden
            className="absolute inset-0 opacity-25"
            style={{ backgroundImage: 'repeating-conic-gradient(from 0deg at 50% 40%, rgba(255,255,255,.18) 0deg 6deg, transparent 6deg 18deg)' }}
          />
          <Arte nome={c.arte} className="relative h-[78%] w-[78%]" style={{ color: e.clara, filter: `drop-shadow(0 0.15em 0.25em rgba(0,0,0,.6)) drop-shadow(0 0 0.6em ${e.brilho})` }} />
        </span>

        {/* Linha de tipo */}
        <span className="mx-[0.4em] mt-[0.3em] flex items-center gap-[0.3em] rounded-[0.25em] px-[0.35em] py-[0.12em]" style={{ background: `${e.cor}22`, boxShadow: `inset 0 0 0 1px ${e.cor}55` }}>
          <span className="fonte-arcana min-w-0 flex-1 truncate font-bold" style={{ color: e.escura, fontSize: '0.62em' }}>{c.linha}</span>
          <span className="h-[0.6em] w-[0.6em] rotate-45 rounded-[0.1em]" style={{ background: RARIDADE[c.raridade], boxShadow: '0 0 0 1px rgba(0,0,0,.45)' }} title={c.raridade} />
        </span>

        {/* Texto */}
        <span className="fonte-pergaminho mx-[0.45em] mt-[0.25em] flex min-h-0 flex-1 flex-col gap-[0.2em] overflow-hidden" style={{ color: '#2b1d0e', fontSize: '0.7em' }}>
          <Regras c={c} />
          <span className="mt-auto border-t pt-[0.2em] italic leading-[1.15]" style={{ borderColor: `${e.cor}44`, color: '#5b4630', fontSize: '0.92em' }}>
            {c.sabor}
          </span>
        </span>

        <span className="flex items-end justify-between px-[0.45em] pb-[0.35em] pt-[0.15em]">
          <Arte nome={e.arte} className="h-[1em] w-[1em]" style={{ color: e.cor }} titulo={e.nome} />
          {c.tipo === 'criatura' ? <Placa ataque={c.ataque ?? 0} vida={c.vida ?? 0} /> : <span className="fonte-arcana text-[0.55em] font-bold uppercase tracking-widest" style={{ color: e.escura }}>Feitiço</span>}
        </span>
      </span>
    </Tag>
  );
}

/** O verso: para a mão do adversário e o baralho. */
export function VersoDaCarta({ largura = 60, className = '' }: { largura?: number; className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-[10%] ${className}`}
      style={{
        width: largura,
        aspectRatio: '5 / 7',
        background: 'radial-gradient(circle at 50% 50%, #5b2c83 0%, #2a1240 55%, #120718 100%)',
        boxShadow: `0 0 0 1px ${OURO}, inset 0 0 0 ${largura * 0.05}px #120718, inset 0 0 0 ${largura * 0.07}px ${OURO}, 0 4px 10px rgba(0,0,0,.45)`,
      }}
    >
      <span aria-hidden className="absolute inset-[12%] rounded-[8%] opacity-40" style={{ backgroundImage: 'repeating-conic-gradient(rgba(212,175,55,.6) 0deg 5deg, transparent 5deg 20deg)' }} />
      <span className="fonte-arcana relative font-black" style={{ color: OURO, fontSize: largura * 0.42, textShadow: '0 0 8px rgba(212,175,55,.7)' }}>A</span>
    </span>
  );
}

/** Uma criatura no campo. */
export function CriaturaNoCampo({
  c,
  largura = 92,
  onClick,
  podeAtacar = false,
  selecionada = false,
  alvo = false,
  marca,
  atacando = false,
}: {
  c: Criatura;
  largura?: number;
  onClick?: () => void;
  podeAtacar?: boolean;
  selecionada?: boolean;
  alvo?: boolean;
  /** Etiqueta pequena em cima (ex.: "bloqueia Urso"). */
  marca?: string;
  atacando?: boolean;
}) {
  const d = definicao(c.carta);
  const e = ESCOLAS[d.escola];
  const atk = ataqueDe(c);
  const vida = vidaRestante(c);
  const escudo = tem(c, 'escudo');
  const brilho = alvo ? '#ef4444' : selecionada ? '#f97316' : podeAtacar ? '#4ade80' : null;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      data-criatura={c.id}
      title={`${d.nome} — ${textoDaCarta(d).join(' ')}`}
      aria-label={`${d.nome}, ${atk} de ataque, ${vida} de vida${c.exausta ? ', exausta' : ''}${c.congelada ? ', congelada' : ''}`}
      className={`relative shrink-0 select-none rounded-[0.8em] p-[0.2em] text-left transition duration-300 ${c.exausta ? 'rotate-[8deg] saturate-[.6]' : ''} ${atacando ? '-translate-y-3' : ''} ${alvo ? 'animate-pulse' : ''}`}
      style={{
        width: largura,
        aspectRatio: '4 / 5',
        fontSize: largura / 8,
        background: 'linear-gradient(145deg,#2d2319,#0e0a06)',
        boxShadow: `${brilho ? `0 0 0 2px ${brilho}, 0 0 16px 2px ${brilho}` : `0 0 0 1px rgba(212,175,55,.5)`}${escudo ? `, 0 0 0 4px rgba(250,204,21,.55)` : ''}, 0 6px 14px rgba(0,0,0,.45)`,
      }}
    >
      <span className="relative flex h-full flex-col overflow-hidden rounded-[0.6em]" style={{ background: `radial-gradient(circle at 50% 35%, ${e.brilho} 0%, ${e.cor} 45%, ${e.escura} 100%)` }}>
        <Arte nome={d.arte} className="mx-auto mt-[0.35em] h-[58%] w-[70%]" style={{ color: e.clara, filter: `drop-shadow(0 0.1em 0.2em rgba(0,0,0,.6))` }} />
        <span className="fonte-arcana mt-auto truncate px-[0.3em] text-center font-bold leading-tight" style={{ color: '#fdf6e3', fontSize: '0.78em', textShadow: '0 1px 2px rgba(0,0,0,.8)' }}>
          {d.nome}
        </span>
        <span className="flex items-center justify-between px-[0.25em] pb-[0.25em] pt-[0.1em]">
          <span className="fonte-arcana flex h-[1.7em] min-w-[1.7em] items-center justify-center rounded-full px-[0.2em] font-black" style={{ background: '#1c1410', color: atk > (d.ataque ?? 0) ? '#86efac' : '#fde68a', boxShadow: `0 0 0 1px ${OURO}` }}>
            {atk}
          </span>
          <span className="flex gap-[0.15em]">
            {c.palavras.concat(c.palavrasFim).filter((p, i, a) => a.indexOf(p) === i && p !== 'escudo').slice(0, 3).map((p) => (
              <span key={p} className="rounded-[0.3em] bg-black/45 px-[0.25em] text-[0.55em] font-bold uppercase text-[#fef3c7]" title={PALAVRAS[p].texto}>
                {PALAVRAS[p].nome.slice(0, 3)}
              </span>
            ))}
          </span>
          <span className="fonte-arcana flex h-[1.7em] min-w-[1.7em] items-center justify-center rounded-full px-[0.2em] font-black" style={{ background: '#1c1410', color: vida < vidaTotal(c) ? '#fca5a5' : vidaTotal(c) > (d.vida ?? 0) ? '#86efac' : '#fde68a', boxShadow: `0 0 0 1px ${OURO}` }}>
            {vida}
          </span>
        </span>
        {c.congelada && (
          <span aria-hidden className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(160deg, rgba(186,230,253,.55), rgba(56,189,248,.35))', backdropFilter: 'blur(1px)' }}>
            <span className="text-[1.6em]">❄</span>
          </span>
        )}
      </span>
      {marca && (
        <span className="absolute -top-[0.9em] left-1/2 z-10 max-w-[140%] -translate-x-1/2 truncate whitespace-nowrap rounded-full px-[0.5em] py-[0.1em] text-[0.62em] font-bold text-white" style={{ background: '#b91c1c', boxShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
          {marca}
        </span>
      )}
    </Tag>
  );
}
