'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Icon from '../../icons';
import Avatar from '../../Avatar';
import Arte from './Arte';
import { CartaGrande } from './CartaArcana';
import { RegrasDaTrilha, RegrasDoArcanos } from './Regras';
import { JOGOS } from './SalaDeJogos';
import { CATEGORIAS_DO_QUIZ } from '@/lib/jogos/perguntas';
import type { JogoId } from '@/lib/jogos/canal';
import type { GrupoResumo } from '@/lib/comunidade-tipos';

const VITRINE_DE_CARTAS = ['c10', 'm09', 'b09', 'l11', 's12'];

/**
 * Aba Jogos da Comunidade: a vitrine dos jogos, as regras e o atalho para
 * jogar ao vivo em um dos seus grupos (as partidas acontecem dentro do grupo).
 */
export default function JogosDaComunidade({ grupos, aoCriarGrupo }: { grupos: GrupoResumo[]; aoCriarGrupo: () => void }) {
  const [regras, setRegras] = useState<JogoId | null>(null);
  const ativos = grupos.filter((g) => g.myStatus === 'ativo');

  const EscolherGrupo = ({ jogo }: { jogo: JogoId }) =>
    ativos.length === 0 ? (
      <button type="button" onClick={aoCriarGrupo} className="rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-[#1a120a] hover:bg-white">
        Criar um grupo para jogar
      </button>
    ) : (
      <div className="flex flex-wrap gap-2">
        {ativos.slice(0, 6).map((g) => (
          <Link
            key={g.id}
            href={`/comunidade/${g.id}?aba=jogos&jogo=${jogo}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-3 text-xs font-bold text-[#1a120a] transition hover:bg-white"
          >
            <Avatar nome={g.name} path={g.imagePath} tamanho={24} quadrado />
            Jogar em {g.name}
          </Link>
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-300">
        Jogos ao vivo para jogar com o seu grupo. Abra uma mesa dentro de um grupo: quem estiver na sala de jogos entra, e o resto do grupo pode assistir.
      </p>

      {/* Trilha do Saber */}
      <article className="overflow-hidden rounded-3xl" style={{ background: JOGOS.trilha.fundo }}>
        <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: '#fbf3e0', color: '#2b2118', boxShadow: '0 0 0 3px #2b2118' }}>
                <Arte nome="owl" className="h-10 w-10" />
              </span>
              <div>
                <h2 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white">Trilha do Saber</h2>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#fbf3e0]">{JOGOS.trilha.tipo}</p>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85">{JOGOS.trilha.resumo}</p>
            <p className="mt-1 text-xs text-white/60">{JOGOS.trilha.pessoas} · 20 segundos por pergunta · roleta de categorias</p>
            <div className="mt-4 space-y-3">
              <EscolherGrupo jogo="trilha" />
              <button type="button" onClick={() => setRegras('trilha')} className="text-xs font-semibold text-white/80 underline-offset-2 hover:underline">
                Ver as regras completas
              </button>
            </div>
          </div>
          {/* Miniatura do tabuleiro */}
          <div className="grid grid-cols-5 gap-1.5 self-center rounded-2xl p-3" style={{ background: '#fbf3e0', boxShadow: '0 0 0 3px #2b2118' }} aria-hidden>
            {CATEGORIAS_DO_QUIZ.slice(0, 14).concat(CATEGORIAS_DO_QUIZ.slice(0, 1)).map((c, i) => (
              <span key={i} className="flex aspect-square items-center justify-center rounded-lg font-display text-[10px] font-bold text-white" style={{ background: c.cor, boxShadow: '0 0 0 2px #2b2118' }}>
                {i === 6 ? '★' : i + 1}
              </span>
            ))}
          </div>
        </div>
      </article>

      {/* Arcanos */}
      <article className="overflow-hidden rounded-3xl" style={{ background: JOGOS.arcanos.fundo }}>
        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <Arte nome="spell-book" className="h-14 w-14" style={{ color: '#d4af37', filter: 'drop-shadow(0 0 10px rgba(212,175,55,.5))' }} />
            <div>
              <h2 className="fonte-arcana text-3xl font-black text-[#fdf6e3]">Arcanos</h2>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f5d77a' }}>{JOGOS.arcanos.tipo} · duelo de escolas</p>
            </div>
          </div>
          <p className="fonte-pergaminho mt-3 max-w-2xl text-base leading-relaxed text-[#fdf6e3]/90">{JOGOS.arcanos.resumo}</p>
          <p className="mt-1 text-xs text-[#fef3c7]/60">{JOGOS.arcanos.pessoas} · 20 de vida · até 10 de éter · turnos de 90 segundos</p>
          <div className="-mx-5 mt-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:-mx-7 sm:px-7" aria-label="Algumas cartas">
            {VITRINE_DE_CARTAS.map((id) => (
              <CartaGrande key={id} id={id} largura={150} />
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <EscolherGrupo jogo="arcanos" />
            <button type="button" onClick={() => setRegras('arcanos')} className="text-xs font-semibold text-[#fef3c7]/80 underline-offset-2 hover:underline">
              Ver as regras completas
            </button>
          </div>
        </div>
      </article>

      {regras && (
        <div className="fixed inset-0 z-[78] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Regras: ${JOGOS[regras].nome}`}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-zinc-900 p-5 sm:rounded-3xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-zinc-50">Como jogar {JOGOS[regras].nome}</h2>
              <button type="button" onClick={() => setRegras(null)} aria-label="Fechar" className="rounded-full p-2 text-zinc-400 hover:text-zinc-100">
                <Icon name="close" size={18} />
              </button>
            </div>
            {regras === 'trilha' ? <RegrasDaTrilha /> : <RegrasDoArcanos />}
          </div>
        </div>
      )}
    </div>
  );
}
