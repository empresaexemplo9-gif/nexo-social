'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Icon, { type IconName } from '@/components/icons';
import { usePreferences } from '@/lib/preferences';
import { APARENCIA_PADRAO, type EscopoDoFundo } from '@/lib/aparencia-tipos';
import { porTema, type ItemExclusivo, type TipoExclusivo } from '@/lib/exclusivos';

export type AbaDosColecionaveis = 'adesivos' | 'bottons' | 'fundos';

const ABAS: { id: AbaDosColecionaveis; tipo: TipoExclusivo; rotulo: string; icone: IconName; vazio: string }[] = [
  { id: 'adesivos', tipo: 'sticker', rotulo: 'Adesivos', icone: 'sparkles', vazio: 'Seu álbum ainda está em branco. Os adesivos chegam de presente nos eventos e lançamentos.' },
  { id: 'bottons', tipo: 'button', rotulo: 'Bottons', icone: 'star', vazio: 'Nenhum botton por aqui ainda. Quando ganhar, ele fica preso no seu painel.' },
  { id: 'fundos', tipo: 'wallpaper', rotulo: 'Planos de fundo', icone: 'image', vazio: 'Nenhum plano de fundo exclusivo ainda.' },
];

const ESCOPOS: { id: EscopoDoFundo; rotulo: string; apoio: string }[] = [
  { id: 'home', rotulo: 'Só na home', apoio: 'O fundo aparece na página inicial.' },
  { id: 'todas', rotulo: 'Em todas as abas', apoio: 'O fundo vira o muro de todas as áreas.' },
];

/** Um giro pequeno e fixo para cada peça (o álbum parece colado à mão). */
const giro = (i: number) => [-4, 3, -2, 5, -1, 2, -3, 4][i % 8];

/**
 * Colecionáveis: o que o superadministrador enviou para a conta. Os adesivos
 * num álbum (cada tema/banda na sua página), os bottons presos num painel e os
 * planos de fundo — que valem só na home ou em todas as abas, como a pessoa
 * quiser. Nada expira.
 */
export default function Colecionaveis({ abaInicial }: { abaInicial: AbaDosColecionaveis }) {
  const { prefs, ready, save } = usePreferences();
  const aparencia = prefs.aparencia ?? APARENCIA_PADRAO;
  const emUso = aparencia.exclusivo;
  const [aba, setAba] = useState<AbaDosColecionaveis>(abaInicial);
  const [itens, setItens] = useState<ItemExclusivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState<ItemExclusivo | null>(null);

  useEffect(() => {
    fetch('/api/exclusivos', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Não foi possível carregar seus colecionáveis.');
        setItens(j.items ?? []);
      })
      .catch((e) => setErro((e as Error).message))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aberto]);

  const trocarAba = (a: AbaDosColecionaveis) => {
    setAba(a);
    window.history.replaceState(null, '', a === 'adesivos' ? '/colecionaveis' : `/colecionaveis?aba=${a}`);
  };

  const atual = ABAS.find((a) => a.id === aba)!;
  const temas = useMemo(() => porTema(itens.filter((i) => i.kind === atual.tipo)), [itens, atual.tipo]);
  const conta = (t: TipoExclusivo) => itens.filter((i) => i.kind === t).length;
  const fundoEmUso = itens.find((i) => i.id === emUso?.id);

  const usarFundo = (item: ItemExclusivo, escopo: EscopoDoFundo) =>
    void save({ aparencia: { ...aparencia, exclusivo: { id: item.id, url: item.url, escopo } } });
  const mudarEscopo = (escopo: EscopoDoFundo) => emUso && void save({ aparencia: { ...aparencia, exclusivo: { ...emUso, escopo } } });
  const tirarFundo = () => void save({ aparencia: { ...aparencia, exclusivo: null } });

  return (
    <div className="min-h-screen font-sans text-zinc-100 antialiased">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-10">
        <header className="space-y-4">
          <div>
            <p className="rotulo-hud">Presentes da nexo.social</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-zinc-50 md:text-5xl">Colecionáveis</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-300">
              Adesivos, bottons e planos de fundo que você ganhou, cada tema no seu espaço. É seu — não expira.
            </p>
          </div>
          <div role="tablist" aria-label="Colecionáveis" className="flex flex-wrap gap-2">
            {ABAS.map((a) => (
              <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => trocarAba(a.id)} className="q-chip q-aba q-chip--simples">
                <Icon name={a.icone} size={15} /> {a.rotulo}
                <span className="opacity-70">{carregando ? '…' : conta(a.tipo)}</span>
              </button>
            ))}
          </div>
        </header>

        {carregando && <p className="card-soft p-8 text-center text-sm text-zinc-400">Abrindo sua coleção…</p>}
        {erro && <p className="card-soft p-5 text-sm text-red-300">{erro}</p>}
        {!carregando && !erro && !temas.length && aba !== 'fundos' && <p className="card-soft p-8 text-center text-sm text-zinc-400">{atual.vazio}</p>}

        {/* --- Adesivos: o álbum, uma página por tema ------------------------------------------ */}
        {aba === 'adesivos' &&
          temas.map((t) => (
            <section key={t.tema} className="album-pagina card-soft q-moldura relative overflow-hidden p-5 md:p-7" aria-label={`Adesivos de ${t.tema}`}>
              <h2 className="album-fita font-display text-2xl font-bold text-zinc-50">{t.tema}</h2>
              {t.tipos[0].edicoes.map((e) => (
                <div key={e.edicao || '—'} className="mt-5">
                  {e.edicao && <p className="mb-2 font-mao text-xl text-zinc-400">{e.edicao}</p>}
                  <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
                    {e.itens.map((item, i) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => setAberto(item)} className="album-adesivo group block w-full text-center" style={{ '--giro': `${giro(i)}deg` } as React.CSSProperties}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.thumbUrl} alt={item.title} loading="lazy" className="mx-auto aspect-square w-full object-contain" />
                          <span className="mt-1 block truncate text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-100">{item.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="mt-6 text-right text-[11px] text-zinc-500">Eles estão no chat, em Adesivos → {t.tema}.</p>
            </section>
          ))}

        {/* --- Bottons: presos no painel, um painel por tema ----------------------------------- */}
        {aba === 'bottons' &&
          temas.map((t) => (
            <section key={t.tema} className="painel-bottons relative overflow-hidden rounded-3xl p-5 md:p-7" aria-label={`Bottons de ${t.tema}`}>
              <h2 className="relative font-display text-2xl font-bold text-white">{t.tema}</h2>
              {t.tipos[0].edicoes.map((e) => (
                <div key={e.edicao || '—'} className="relative mt-4">
                  {e.edicao && <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">{e.edicao}</p>}
                  <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                    {e.itens.map((item, i) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => setAberto(item)} className="botton-preso group block w-full" style={{ '--giro': `${giro(i + 3)}deg` } as React.CSSProperties} aria-label={item.title}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.thumbUrl} alt="" loading="lazy" className="aspect-square w-full rounded-full object-cover" />
                        </button>
                        <p className="mt-2 truncate text-center text-[11px] font-semibold text-white/70">{item.title}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}

        {/* --- Planos de fundo: só na home ou em todas as abas -------------------------------- */}
        {aba === 'fundos' && (
          <>
            {ready && emUso && (
              <div className="card-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fundoEmUso?.thumbUrl ?? emUso.url} alt="" className="aspect-video w-full rounded-xl object-cover sm:w-44" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-500">Plano de fundo em uso</p>
                  <p className="truncate text-sm font-bold text-zinc-50">{fundoEmUso?.title ?? 'Plano de fundo exclusivo'}</p>
                  <div role="radiogroup" aria-label="Onde usar o plano de fundo" className="mt-2 flex flex-wrap gap-1.5">
                    {ESCOPOS.map((e) => (
                      <button key={e.id} type="button" role="radio" aria-checked={emUso.escopo === e.id} title={e.apoio} onClick={() => mudarEscopo(e.id)} className="q-chip q-chip--simples">
                        {e.rotulo}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={tirarFundo} className="self-start rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-zinc-50 sm:self-center">
                  Voltar ao fundo padrão
                </button>
              </div>
            )}
            {!carregando && !erro && !temas.length && <p className="card-soft p-8 text-center text-sm text-zinc-400">{atual.vazio}</p>}
            {temas.map((t) => (
              <section key={t.tema} className="space-y-3" aria-label={`Planos de fundo de ${t.tema}`}>
                <h2 className="font-display text-2xl font-bold text-zinc-50">{t.tema}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {t.tipos[0].edicoes.flatMap((e) => e.itens).map((item) => {
                    const ativo = emUso?.id === item.id;
                    return (
                      <article key={item.id} className={`card-soft overflow-hidden ${ativo ? 'ring-2 ring-emerald-400' : ''}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbUrl} alt={item.title} className="aspect-video w-full object-cover" loading="lazy" />
                        <div className="space-y-2 p-3">
                          <p className="truncate text-sm font-bold text-zinc-50">{item.title}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ESCOPOS.map((esc) => {
                              const este = ativo && emUso?.escopo === esc.id;
                              return (
                                <button key={esc.id} type="button" aria-pressed={este} onClick={() => usarFundo(item, esc.id)} title={esc.apoio} className="action-patch rounded-xl px-3 py-1.5 text-xs font-bold">
                                  {este ? `Em uso · ${esc.rotulo.toLowerCase()}` : `Usar ${esc.rotulo.toLowerCase()}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      {/* Ver de perto */}
      {aberto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6" role="dialog" aria-modal="true" aria-label={aberto.title} onClick={() => setAberto(null)}>
          <figure className="max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={aberto.url} alt={aberto.title} className={`mx-auto max-h-[60vh] w-auto drop-shadow-2xl ${aberto.kind === 'button' ? 'rounded-full' : ''}`} />
            <figcaption className="mt-4 text-white">
              <span className="block font-display text-2xl font-bold">{aberto.title}</span>
              <span className="block text-sm text-white/70">{[aberto.collection, aberto.edition].filter(Boolean).join(' · ')}</span>
              <span className="mt-1 block text-xs text-white/50">Envie no chat: Adesivos → {aberto.collection}</span>
            </figcaption>
            <button type="button" onClick={() => setAberto(null)} className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
              Fechar
            </button>
          </figure>
        </div>
      )}
    </div>
  );
}
