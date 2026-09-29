'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/icons';
import YoutubePlaylist from '@/components/YoutubePlaylist';
import { DIET_FILTERS, type DietFilter, type Recipe } from '@/lib/bom-dia';
import type { BomDiaSources } from '@/lib/bom-dia-sources';
import { useBomDia } from './useBomDia';

const button = 'action-collage rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold disabled:opacity-50';
const card = 'rounded-2xl border border-zinc-800 bg-zinc-900 p-6';
const shortDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' });
const checkedDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return <article className={card}>
    <p className="text-xs font-medium text-emerald-400">{recipe.minutes} min · {recipe.servings}</p>
    <h3 className="mt-2 text-xl font-semibold">{recipe.title}</h3>
    <p className="mt-2 text-xs text-zinc-400">{recipe.tags.map(tag => DIET_FILTERS[tag]).join(' · ')}</p>
    <details className="mt-5" open>
      <summary className="cursor-pointer font-semibold text-emerald-400">Ingredientes e preparo</summary>
      <h4 className="mb-2 mt-4 text-sm font-semibold">Ingredientes</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">{recipe.ingredients.map(item => <li key={item}>{item}</li>)}</ul>
      <h4 className="mb-2 mt-4 text-sm font-semibold">Como fazer</h4>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">{recipe.steps.map(step => <li key={step}>{step}</li>)}</ol>
    </details>
  </article>;
}

function Sources({ round, day }: { round: number; day: string }) {
  const [data, setData] = useState<BomDiaSources | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`/api/bom-dia/novidades?rodada=${round}`, { signal: controller.signal, cache: 'no-store' })
      .then(async res => { if (!res.ok) throw Error('Não foi possível consultar as fontes agora.'); return res.json(); })
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt, round, day]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setAttempt(n => n + 1); };
    const timer = setInterval(refresh, 30 * 60_000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  return <section id="novidades" className="scroll-mt-24 space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-3xl font-semibold">Para continuar descobrindo</h2><p className="mt-1 text-sm text-zinc-400">Publicações em português, com a fonte original para você explorar.</p></div>
      <button type="button" disabled={loading} className={button} onClick={() => setAttempt(n => n + 1)}>{loading ? 'Consultando…' : 'Atualizar fontes'}</button>
    </div>
    {error && <p role="alert" className="text-sm text-clay-300">{error} As receitas e rotinas acima continuam disponíveis.</p>}
    {loading && !data && <p role="status">Consultando publicações e receitas…</p>}
    {data && <>
      {data.editorial && <article className={card}>
        <p className="text-xs text-emerald-400">Da curadoria Nexo · {shortDate.format(new Date(data.editorial.publishedAt))}</p>
        <h3 className="my-3 text-xl font-semibold">{data.editorial.recipeTitle}</h3>
        <p className="text-sm text-zinc-300">{data.editorial.recipeDescription}</p>
        {data.editorial.tip && <p className="mt-3 text-sm text-zinc-300">{data.editorial.tip}</p>}
      </article>}
      {data.items.length > 0 ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.items.map(item => <article key={item.url} className={card}>
        <p className="text-xs text-emerald-400">{item.source} · {item.kind}</p>
        <h3 className="my-3 text-lg font-semibold"><a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.title}</a></h3>
        <p className="text-xs text-zinc-400">{item.publishedAt ? `Publicado em ${shortDate.format(new Date(item.publishedAt))}` : 'Na seleção atual da fonte · data de publicação não informada'}</p>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-emerald-400 underline">Abrir na fonte →</a>
      </article>)}</div> : <p className={card}>Nenhuma publicação recente disponível nesta consulta. Explore o acervo acima ou consulte as fontes abaixo.</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-400">{data.sources.map(source => <p key={source.name}>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">{source.name}</a>: {source.ok && source.checkedAt ? `consulta em ${checkedDate.format(new Date(source.checkedAt))}` : 'indisponível nesta consulta'}
      </p>)}</div>
      <p className="text-xs text-zinc-500">As fontes são consultadas periodicamente. Sugestões do acervo se alternam diariamente; publicações externas dependem de cada fonte.</p>
    </>}
  </section>;
}

export default function BomDiaView({ initialDay, initialRound = 0 }: { initialDay: string; initialRound?: number }) {
  const { day, round, diet, setDiet, next, selection } = useBomDia(initialDay, initialRound);
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(`${day}T12:00:00Z`));
  return <>
    <section className="texture-grain relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-clay-500/15 via-zinc-900 to-emerald-950/30 p-6 md:p-10">
      <Link href="/" className="text-xs text-zinc-400 underline">← Voltar para a home</Link>
      <div className="mt-6 text-emerald-400"><Icon name="sunrise" size={40} /></div>
      <p className="mt-4 text-sm font-medium capitalize text-emerald-400">{dateLabel}</p>
      <h1 className="mt-2 text-5xl font-semibold md:text-6xl">Bom dia. <span className="italic text-clay-400">Experimente algo novo.</span></h1>
      <p className="mt-4 max-w-2xl text-base text-zinc-300">Uma receita para fazer, um momento para se movimentar e ideias para cuidar da sua rotina.</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="button" onClick={next} className={`${button} bg-emerald-400 text-zinc-950`}><span className="inline-flex items-center gap-2"><Icon name="refresh" size={16} /> Ver outras ideias</span></button>
        <p role="status" aria-live="polite" className="text-xs text-zinc-400">{round ? `Seleção alternativa ${round}` : 'Seleção de hoje'} · muda diariamente no horário de Brasília</p>
      </div>
      <nav aria-label="Seções do Bom Dia" className="mt-7 flex flex-wrap gap-2">
        {[['receita', 'Receitas'], ['treino', 'Movimento'], ['habito', 'Dicas'], ['trilha', 'Música'], ['novidades', 'Descobertas']].map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-full border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">{label}</a>)}
      </nav>
    </section>
    <section id="receita" className="scroll-mt-24 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-3xl font-semibold">Hoje na sua cozinha</h2><p className="mt-1 text-sm text-zinc-400">Três ideias do acervo de {selection.totalRecipes} receitas para este filtro.</p></div>
        <label className="flex max-w-full flex-col gap-2 text-sm sm:flex-row sm:items-center">Preferência alimentar<select value={diet} onChange={e => setDiet(e.target.value as DietFilter)} className="max-w-full rounded-lg border border-zinc-700 bg-zinc-900 p-2">{Object.entries(DIET_FILTERS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">{selection.recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>
      <p className="text-xs text-zinc-400">Os filtros consideram os ingredientes indicados. Confira rótulos, alergênicos e risco de contaminação cruzada. Os tempos são aproximados.</p>
    </section>
    <section id="treino" className="scroll-mt-24 space-y-5">
      <h2 className="text-3xl font-semibold">Um pouco de movimento</h2>
      <article className={`${card} grid gap-6 md:grid-cols-[1fr_2fr]`}>
        <div><p className="text-sm font-semibold text-emerald-400">Rotina leve · cerca de {selection.routine.minutes} min</p><h3 className="mt-2 text-2xl font-semibold">{selection.routine.title}</h3><p className="mt-3 text-sm text-zinc-400">{selection.routine.equipment}</p><button type="button" className={`${button} mt-5`} onClick={next}>Ver outra seleção</button></div>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-zinc-300">{selection.routine.steps.map(step => <li key={step}>{step}</li>)}</ol>
      </article>
      <p className="text-sm text-zinc-400">Sugestões gerais para adultos, sem prescrição individual. Respeite seus limites e pare se sentir dor, tontura ou mal-estar. Se tiver restrições, adapte com um profissional.</p>
      <a className="inline-block text-xs text-emerald-400 underline" href="https://bvsms.saude.gov.br/bvs/publicacoes/guia_atividade_fisica_populacao_brasileira.pdf" target="_blank" rel="noopener noreferrer">Orientações gerais: Guia de Atividade Física do Ministério da Saúde →</a>
    </section>
    <section id="habito" className="scroll-mt-24 space-y-5"><h2 className="text-3xl font-semibold">Pequenas ideias, espaço para variar</h2><div className="grid gap-5 md:grid-cols-3">{selection.tips.map(tip => <article className={card} key={tip.id}><Icon name="bulb" className="text-clay-400" size={23} /><h3 className="mb-2 mt-3 text-xl font-semibold">{tip.title}</h3><p className="text-sm leading-relaxed text-zinc-300">{tip.body}</p></article>)}</div></section>
    <section id="trilha" className="scroll-mt-24 space-y-5"><div><h2 className="text-3xl font-semibold">Dê o play na sua manhã</h2><p className="mt-1 text-sm text-zinc-400">Seus estilos musicais, com novas seleções para explorar. Sem preferências, começamos com lo-fi.</p></div><div className={card}><YoutubePlaylist variation={selection.musicVariation} fallbackGenre="lofi" /></div></section>
    <Sources round={round} day={day} />
  </>;
}
