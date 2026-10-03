'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon, { type IconName } from '@/components/icons';
import { textoDoPremio, type MissaoParaCliente } from '@/lib/missoes';
import { NOME_DO_TIPO, type ItemExclusivo } from '@/lib/exclusivos';

interface Dados {
  semana: string;
  renovaEm: string;
  missoes: MissaoParaCliente[];
}

type Premio = { missao: MissaoParaCliente; itens: (ItemExclusivo & { quantidade: number })[] };

/** "renova em 3 dias" / "renova amanhã" / "renova hoje". */
function quandoRenova(iso: string) {
  const dias = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (dias <= 1) return dias <= 0 ? 'renova hoje' : 'renova amanhã';
  return `renova em ${dias} dias`;
}

function Cartao({ m, ocupado, onResgatar }: { m: MissaoParaCliente; ocupado: boolean; onResgatar: () => void }) {
  const pct = Math.round((Math.min(m.progresso, m.meta) / m.meta) * 100);
  return (
    <article className={`missao card-soft flex flex-col gap-3 p-4 ${m.estado === 'pronta' ? 'missao--pronta' : ''} ${m.estado === 'resgatada' ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="missao-icone grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
          <Icon name={m.icone as IconName} size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-tight text-zinc-50">{m.titulo}</h3>
          <p className="mt-0.5 text-sm text-zinc-300">{m.descricao}</p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
          <span>
            {Math.min(m.progresso, m.meta)} de {m.meta}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="gift" size={12} /> {textoDoPremio(m)}
          </span>
        </div>
        <div className="missao-barra mt-1.5 h-2 overflow-hidden rounded-full" role="progressbar" aria-valuemin={0} aria-valuemax={m.meta} aria-valuenow={Math.min(m.progresso, m.meta)} aria-label={m.titulo}>
          <span className="block h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-auto flex items-center justify-end gap-2">
        {m.estado === 'resgatada' ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Icon name="check" size={14} /> Resgatada
          </span>
        ) : m.estado === 'pronta' ? (
          <button type="button" disabled={ocupado} onClick={onResgatar} className="action-patch action-patch--ink inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 disabled:opacity-60">
            <Icon name="gift" size={15} /> {ocupado ? 'Sorteando…' : 'Resgatar'}
          </button>
        ) : (
          <Link href={m.link} className="action-collage action-collage--paper inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold">
            Fazer agora <Icon name="arrowRight" size={13} />
          </Link>
        )}
      </div>
    </article>
  );
}

/**
 * Missões: o que a pessoa faz na plataforma e libera colecionáveis sorteados
 * (o servidor confere no uso real; nada aqui é marcado na mão). As da semana
 * voltam toda segunda; as conquistas valem uma vez.
 */
export default function Missoes({ onGanhou, irParaTrocas }: { onGanhou: () => void; irParaTrocas: () => void }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState('');
  const [resgatando, setResgatando] = useState<string | null>(null);
  const [premio, setPremio] = useState<Premio | null>(null);

  const carregar = useCallback(() => {
    fetch('/api/missoes', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Não foi possível carregar as missões.');
        setDados(j);
        setErro('');
      })
      .catch((e) => setErro((e as Error).message));
  }, []);

  useEffect(() => carregar(), [carregar]);

  useEffect(() => {
    if (!premio) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPremio(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [premio]);

  const resgatar = async (m: MissaoParaCliente) => {
    setResgatando(m.id);
    setErro('');
    try {
      const r = await fetch('/api/missoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ missao: m.id }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não foi possível resgatar agora.');
      setPremio({ missao: m, itens: j.itens ?? [] });
      onGanhou();
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setResgatando(null);
    }
  };

  if (!dados && !erro) return <p className="card-soft p-8 text-center text-sm text-zinc-400">Abrindo as missões…</p>;

  const semanais = dados?.missoes.filter((m) => m.periodo === 'semanal') ?? [];
  const conquistas = dados?.missoes.filter((m) => m.periodo === 'unica') ?? [];
  const prontas = dados?.missoes.filter((m) => m.estado === 'pronta').length ?? 0;
  const ordem = (a: MissaoParaCliente, b: MissaoParaCliente) => ['pronta', 'andamento', 'resgatada'].indexOf(a.estado) - ['pronta', 'andamento', 'resgatada'].indexOf(b.estado);

  return (
    <div className="space-y-8">
      <section className="card-soft flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        <span className="missao-icone grid h-12 w-12 shrink-0 place-items-center rounded-2xl">
          <Icon name="trophy" size={22} />
        </span>
        <div className="min-w-0 flex-1 text-sm text-zinc-300">
          <p className="font-display text-xl font-bold text-zinc-50">Use a plataforma, ganhe colecionáveis</p>
          <p className="mt-1">
            Cada missão cumprida sorteia adesivos, bottons ou planos de fundo de qualquer tema — às vezes mais de um. Se sair repetido,
            dá para trocar com outras pessoas.
          </p>
        </div>
        {prontas > 0 && <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-zinc-950">{prontas} para resgatar</span>}
      </section>

      {erro && <p className="card-soft p-4 text-sm text-red-300">{erro}</p>}

      {dados && (
        <>
          <section className="space-y-3" aria-label="Missões da semana">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-bold text-zinc-50">Da semana</h2>
              <span className="text-xs text-zinc-400">{quandoRenova(dados.renovaEm)}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...semanais].sort(ordem).map((m) => (
                <Cartao key={m.id} m={m} ocupado={resgatando === m.id} onResgatar={() => void resgatar(m)} />
              ))}
            </div>
          </section>
          <section className="space-y-3" aria-label="Conquistas">
            <h2 className="font-display text-2xl font-bold text-zinc-50">Conquistas</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...conquistas].sort(ordem).map((m) => (
                <Cartao key={m.id} m={m} ocupado={resgatando === m.id} onResgatar={() => void resgatar(m)} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* O prêmio: os itens sorteados aparecem um a um */}
      {premio && (
        <div className="premio-fundo fixed inset-0 z-[90] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Itens sorteados" onClick={() => setPremio(null)}>
          <div className="w-full max-w-lg text-center" onClick={(e) => e.stopPropagation()}>
            <p className="rotulo-hud text-white/70">{premio.missao.titulo}</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold text-white">{premio.itens.length > 1 ? `Você ganhou ${premio.itens.length} itens!` : 'Você ganhou!'}</h2>
            <ul className="mt-6 flex flex-wrap justify-center gap-4">
              {premio.itens.map((item, i) => (
                <li key={`${item.id}-${i}`} className="premio-carta w-36" style={{ animationDelay: `${0.25 + i * 0.45}s` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbUrl} alt={item.title} className={`mx-auto h-32 w-32 drop-shadow-2xl ${item.kind === 'button' ? 'rounded-full object-cover' : item.kind === 'wallpaper' ? 'rounded-xl object-cover' : 'object-contain'}`} />
                  <p className="mt-2 truncate text-sm font-bold text-white">{item.title}</p>
                  <p className="truncate text-[11px] text-white/60">
                    {NOME_DO_TIPO[item.kind].um} · {item.collection}
                  </p>
                  {item.quantidade > 1 && <p className="mt-1 text-[11px] font-bold text-amber-300">Repetido (×{item.quantidade}) — dá para trocar</p>}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setPremio(null)} className="premio-botao rounded-full px-5 py-2.5 text-sm font-bold">
                Guardar na coleção
              </button>
              {premio.itens.some((i) => i.quantidade > 1) && (
                <button
                  type="button"
                  onClick={() => {
                    setPremio(null);
                    irParaTrocas();
                  }}
                  className="premio-botao premio-botao--claro rounded-full px-5 py-2.5 text-sm font-semibold"
                >
                  Trocar repetidos
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
