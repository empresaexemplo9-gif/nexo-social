'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Avatar from '@/components/Avatar';
import Icon from '@/components/icons';
import type { ItemExclusivo } from '@/lib/exclusivos';

type Item = ItemExclusivo & { quantidade?: number };
type Pessoa = { id: string; nome: string; avatar: string | null };

interface Proposta {
  id: string;
  status: 'aberta' | 'aceita' | 'recusada' | 'cancelada' | 'indisponivel';
  criadaEm: string;
  minha: boolean;
  de: Pessoa;
  para: Pessoa;
  oferece: Item | null;
  pede: Item | null;
}

interface Dados {
  repetidos: Item[];
  vitrine: { item: Item; tenho: number; pessoas: (Pessoa & { quantidade: number })[] }[];
  recebidas: Proposta[];
  enviadas: Proposta[];
  historico: Proposta[];
}

const STATUS: Record<Proposta['status'], string> = {
  aberta: 'Aberta',
  aceita: 'Trocada',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
  indisponivel: 'Não deu (o repetido acabou)',
};

function Miniatura({ item, tamanho = 'h-14 w-14' }: { item: Item | null; tamanho?: string }) {
  if (!item) return <span className={`${tamanho} grid place-items-center rounded-xl bg-zinc-800 text-[10px] text-zinc-500`}>—</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.thumbUrl}
      alt={item.title}
      title={item.title}
      className={`${tamanho} shrink-0 ${item.kind === 'button' ? 'rounded-full object-cover' : item.kind === 'wallpaper' ? 'rounded-xl object-cover' : 'object-contain'}`}
    />
  );
}

/** Uma proposta: quem dá o quê por quê. */
function LinhaDaProposta({ p, children }: { p: Proposta; children?: React.ReactNode }) {
  const outra = p.minha ? p.para : p.de;
  // Do ponto de vista de quem vê: o que eu dou e o que eu recebo.
  const dou = p.minha ? p.oferece : p.pede;
  const recebo = p.minha ? p.pede : p.oferece;
  return (
    <li className="card-soft flex flex-wrap items-center gap-3 p-3">
      <Avatar nome={outra.nome} path={outra.avatar} tamanho={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-100">{p.minha ? `Para ${outra.nome}` : `${outra.nome} propôs`}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Miniatura item={dou} tamanho="h-10 w-10" /> você dá
          </span>
          <Icon name="refresh" size={14} className="shrink-0 text-zinc-500" />
          <span className="flex items-center gap-1.5">
            <Miniatura item={recebo} tamanho="h-10 w-10" /> você recebe
          </span>
        </div>
      </div>
      {children}
    </li>
  );
}

/**
 * Trocas: repetido por repetido, para ninguém perder o último. A vitrine
 * mostra o que outras pessoas têm repetido (primeiro o que falta na sua
 * coleção); você oferece um repetido seu, e a troca acontece quando a outra
 * pessoa aceita.
 */
export default function Trocas({ onMudou, irParaMissoes }: { onMudou: () => void; irParaMissoes: () => void }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  // Propondo: o item que eu quero e de quem; depois escolho o que ofereço.
  const [propondo, setPropondo] = useState<{ item: Item; pessoa: Pessoa } | null>(null);

  const carregar = useCallback(() => {
    fetch('/api/exclusivos/trocas', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Não foi possível carregar as trocas.');
        setDados(j);
        setErro('');
      })
      .catch((e) => setErro((e as Error).message));
  }, []);

  useEffect(() => carregar(), [carregar]);

  const postar = async (corpo: Record<string, unknown>, sucesso: string) => {
    setOcupado(true);
    setAviso('');
    try {
      const r = await fetch('/api/exclusivos/trocas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não foi possível concluir agora.');
      if (corpo.acao === 'responder' && j.status === 'indisponivel') setAviso('Não deu: um dos repetidos já não estava mais lá. Nada mudou.');
      else setAviso(sucesso);
      carregar();
      onMudou();
      return true;
    } catch (e) {
      setAviso(`❌ ${(e as Error).message}`);
      return false;
    } finally {
      setOcupado(false);
    }
  };

  if (!dados && !erro) return <p className="card-soft p-8 text-center text-sm text-zinc-400">Abrindo as trocas…</p>;
  if (erro) return <p className="card-soft p-5 text-sm text-red-300">{erro}</p>;
  if (!dados) return null;

  const semRepetidos = !dados.repetidos.length;

  return (
    <div className="space-y-8">
      {aviso && (
        <p role="status" className="card-soft p-3 text-sm text-zinc-200">
          {aviso}
        </p>
      )}

      {dados.recebidas.length > 0 && (
        <section className="space-y-3" aria-label="Propostas recebidas">
          <h2 className="font-display text-2xl font-bold text-zinc-50">Propostas para você</h2>
          <ul className="space-y-2">
            {dados.recebidas.map((p) => (
              <LinhaDaProposta key={p.id} p={p}>
                <div className="flex gap-2">
                  <button type="button" disabled={ocupado} onClick={() => void postar({ acao: 'responder', troca: p.id, aceitar: true }, '✓ Troca feita! Já está na sua coleção.')} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-zinc-950 disabled:opacity-60">
                    Aceitar
                  </button>
                  <button type="button" disabled={ocupado} onClick={() => void postar({ acao: 'responder', troca: p.id, aceitar: false }, 'Proposta recusada.')} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 disabled:opacity-60">
                    Recusar
                  </button>
                </div>
              </LinhaDaProposta>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-label="Seus repetidos">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-bold text-zinc-50">Seus repetidos</h2>
          <span className="text-xs text-zinc-400">Só repetido se troca — você sempre fica com um.</span>
        </div>
        {semRepetidos ? (
          <p className="card-soft p-5 text-sm text-zinc-400">
            Você ainda não tem repetidos. Eles aparecem quando o sorteio das missões traz um item que você já tem.{' '}
            <button type="button" onClick={irParaMissoes} className="font-semibold text-emerald-400 hover:underline">
              Ver missões
            </button>
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
            {dados.repetidos.map((item) => (
              <li key={item.id} className="card-soft relative p-2 text-center">
                <span className="item-repetido">×{item.quantidade}</span>
                <Miniatura item={item} tamanho="mx-auto h-16 w-16" />
                <p className="mt-1 truncate text-[11px] font-semibold text-zinc-300">{item.title}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-label="Repetidos da comunidade">
        <h2 className="font-display text-2xl font-bold text-zinc-50">Repetidos da comunidade</h2>
        {!dados.vitrine.length ? (
          <p className="card-soft p-5 text-sm text-zinc-400">Ninguém tem repetidos para trocar agora. Volte depois das missões da semana.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dados.vitrine.map((v) => (
              <li key={v.item.id} className="card-soft flex gap-3 p-3">
                <Miniatura item={v.item} tamanho="h-20 w-20" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-50">{v.item.title}</p>
                  <p className="truncate text-[11px] text-zinc-400">{[v.item.collection, v.item.edition].filter(Boolean).join(' · ')}</p>
                  <p className={`mt-0.5 text-[11px] font-semibold ${v.tenho ? 'text-zinc-500' : 'text-amber-300'}`}>{v.tenho ? `Você tem ${v.tenho}` : 'Falta na sua coleção'}</p>
                  <ul className="mt-2 space-y-1">
                    {v.pessoas.slice(0, 4).map((p) => (
                      <li key={p.id} className="flex items-center gap-2">
                        <Avatar nome={p.nome} path={p.avatar} tamanho={22} />
                        <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{p.nome}</span>
                        <button
                          type="button"
                          disabled={semRepetidos || ocupado}
                          title={semRepetidos ? 'Você precisa de um repetido para oferecer' : `Propor troca a ${p.nome}`}
                          onClick={() => setPropondo({ item: v.item, pessoa: p })}
                          className="shrink-0 rounded-lg border border-emerald-500/60 px-2 py-1 text-[11px] font-semibold text-emerald-400 disabled:opacity-40"
                        >
                          Propor
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dados.enviadas.length > 0 && (
        <section className="space-y-3" aria-label="Propostas enviadas">
          <h2 className="font-display text-2xl font-bold text-zinc-50">Suas propostas</h2>
          <ul className="space-y-2">
            {dados.enviadas.map((p) => (
              <LinhaDaProposta key={p.id} p={p}>
                <button type="button" disabled={ocupado} onClick={() => void postar({ acao: 'cancelar', troca: p.id }, 'Proposta cancelada.')} className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 disabled:opacity-60">
                  Cancelar
                </button>
              </LinhaDaProposta>
            ))}
          </ul>
        </section>
      )}

      {dados.historico.length > 0 && (
        <section className="space-y-3" aria-label="Trocas anteriores">
          <h2 className="font-display text-xl font-bold text-zinc-50">Anteriores</h2>
          <ul className="space-y-2">
            {dados.historico.map((p) => (
              <LinhaDaProposta key={p.id} p={p}>
                <span className={`text-xs font-semibold ${p.status === 'aceita' ? 'text-emerald-400' : 'text-zinc-500'}`}>{STATUS[p.status]}</span>
              </LinhaDaProposta>
            ))}
          </ul>
        </section>
      )}

      {/* Escolher o que oferecer */}
      {propondo && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-5" role="dialog" aria-modal="true" aria-label="Propor troca" onClick={() => setPropondo(null)}>
          <div className="card-soft max-h-[85vh] w-full max-w-md overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold text-zinc-50">O que você oferece?</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Em troca de <strong className="text-zinc-200">{propondo.item.title}</strong> de {propondo.pessoa.nome}. Escolha um repetido seu:
            </p>
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {dados.repetidos
                .filter((r) => r.id !== propondo.item.id)
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={async () => {
                        const ok = await postar({ acao: 'propor', para: propondo.pessoa.id, oferece: r.id, pede: propondo.item.id }, `✓ Proposta enviada para ${propondo.pessoa.nome}. A troca acontece quando aceitar.`);
                        if (ok) setPropondo(null);
                      }}
                      className="card-soft relative block w-full p-2 text-center hover:ring-2 hover:ring-emerald-400 disabled:opacity-60"
                    >
                      <span className="item-repetido">×{r.quantidade}</span>
                      <Miniatura item={r} tamanho="mx-auto h-14 w-14" />
                      <span className="mt-1 block truncate text-[11px] text-zinc-300">{r.title}</span>
                    </button>
                  </li>
                ))}
            </ul>
            {!dados.repetidos.some((r) => r.id !== propondo.item.id) && <p className="mt-3 text-sm text-zinc-400">Seu único repetido é este mesmo item — não dá para trocar por ele.</p>}
            <button type="button" onClick={() => setPropondo(null)} className="mt-4 text-sm text-zinc-400 hover:text-zinc-100">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
