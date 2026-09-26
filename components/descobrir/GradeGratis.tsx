'use client';

import React, { useEffect, useState } from 'react';
import Icon from '../icons';
import CartaoGratis, { type ItemGratisCliente } from './CartaoGratis';

export type AreaGratis = 'filmes' | 'livros' | 'audiolivros' | 'hobbies';

interface Resposta {
  itens: ItemGratisCliente[];
  usouYoutube: boolean;
  buscaExterna: string | null;
  avisos: string[];
  rodada: number;
  rodadas: number;
}

type Estado = { tipo: 'carregando' } | { tipo: 'ok'; r: Resposta; url: string } | { tipo: 'erro'; msg: string; url: string };

/** Guarda por sessão: trocar de aba e voltar não refaz a busca. */
const guardadas = new Map<string, Resposta>();

/**
 * Grade de conteúdo gratuito de uma área/gênero, no filtro da pessoa. Tudo abre
 * no reprodutor da plataforma; o que as fontes abertas não têm vem do YouTube.
 */
export default function GradeGratis({
  area,
  chave,
  estilo,
  idioma,
  limite,
  colunas = 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6',
}: {
  area: AreaGratis;
  chave: string;
  estilo: string;
  idioma: string;
  limite?: number;
  colunas?: string;
}) {
  const [rodada, setRodada] = useState(0);
  const [guardado, setEstado] = useState<Estado>({ tipo: 'carregando' });

  useEffect(() => setRodada(0), [area, chave, estilo, idioma]);

  const url = `/api/gratis?area=${area}&genero=${encodeURIComponent(chave)}&estilo=${estilo}&idioma=${idioma}&rodada=${rodada}`;
  // Resposta de outra aba/gênero nunca aparece como se fosse desta.
  const estado: Estado = guardado.tipo !== 'carregando' && guardado.url !== url ? { tipo: 'carregando' } : guardado;

  useEffect(() => {
    const ja = guardadas.get(url);
    if (ja) {
      setEstado({ tipo: 'ok', r: ja, url });
      return;
    }
    let vivo = true;
    setEstado({ tipo: 'carregando' });
    fetch(url)
      .then(async (res) => {
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
        guardadas.set(url, j);
        if (vivo) setEstado({ tipo: 'ok', r: j, url });
      })
      .catch((e) => vivo && setEstado({ tipo: 'erro', msg: e.message || 'Falha ao buscar.', url }));
    return () => {
      vivo = false;
    };
  }, [url]);

  const retrato = area === 'livros' || area === 'audiolivros';

  if (estado.tipo === 'carregando') {
    return (
      <div className={`grid gap-4 ${colunas}`} aria-busy="true">
        {Array.from({ length: limite ?? 6 }).map((_, i) => (
          <div key={i} className={`animate-pulse rounded-3xl bg-zinc-800/70 ${retrato ? 'aspect-[3/5]' : 'aspect-[4/3]'}`} />
        ))}
      </div>
    );
  }

  if (estado.tipo === 'erro') {
    return (
      <p className="rounded-2xl border border-red-900/40 bg-red-950/40 p-4 text-sm text-red-300">
        Não foi possível buscar agora: {estado.msg}
      </p>
    );
  }

  const { r } = estado;
  const itens = limite ? r.itens.slice(0, limite) : r.itens;

  return (
    <div className="space-y-4">
      {itens.length > 0 ? (
        <div className={`grid gap-4 ${colunas}`}>
          {itens.map((item) => (
            <CartaoGratis key={item.id} item={item} formato={retrato ? 'retrato' : 'video'} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-sm text-zinc-400">
          {area === 'hobbies'
            ? 'Os tutoriais tocam aqui dentro quando o YouTube está ligado à plataforma.'
            : 'Nada gratuito deste gênero nos acervos abertos agora.'}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        {r.rodadas > 1 && !limite && (
          <button
            type="button"
            onClick={() => setRodada((x) => (x + 1) % r.rodadas)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-clay-500/40 px-3 py-2 font-medium text-clay-300 transition hover:bg-clay-950"
          >
            <Icon name="refresh" size={13} /> Outras descobertas
          </button>
        )}
        {r.usouYoutube && <span>Completado com o YouTube, que toca aqui mesmo.</span>}
        {r.buscaExterna && (
          <a
            href={r.buscaExterna}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-emerald-400 hover:text-clay-400"
          >
            Ver mais no YouTube <Icon name="external" size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
