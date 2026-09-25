'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon, { type IconName } from './icons';
import { usePreferences, type Frequency, type MusicMix } from '@/lib/preferences';
import { CITIES, TOPICS, getTopic, type CategorySlug } from '@/lib/data';
import { BOOK_GENRES, FILM_GENRES, HOBBIES, MUSIC_GENRES, type GenreOption } from '@/lib/taxonomy';
import { haversineKm } from '@/lib/geo';

// O questionário é UMA página com todas as opções à vista. Antes eram oito
// passos: os subtemas só apareciam para os temas já marcados, as cidades
// ficavam numa caixa com rolagem e quem queria mudar um único gênero tinha de
// atravessar tudo de novo. Agora cada seção está na tela, o painel lateral
// mostra o que falta e o botão de salvar está sempre ao alcance.

const FREQUENCIES: { value: Frequency; label: string; hint: string }[] = [
  { value: 'diaria', label: 'Diária', hint: 'Curadoria fresca todo dia' },
  { value: 'semanal', label: 'Semanal', hint: 'Um resumo por semana' },
  { value: 'mensal', label: 'Mensal', hint: 'O essencial do mês' },
];

const RADII = [10, 25, 50, 100, 250];

// As duas perguntas de "jeito de ouvir": a trilha do Spotify segue as duas.
const HITS: { value: boolean; label: string; hint: string }[] = [
  { value: true, label: 'Sim, adoro os hits', hint: 'Os clássicos e sucessos que todo mundo conhece entram na trilha.' },
  { value: false, label: 'Não, quero fugir do óbvio', hint: 'Os mais tocados ficam de fora — só descobertas.' },
];
const MIXES: { value: MusicMix; label: string; hint: string }[] = [
  { value: 'misturar', label: 'Misturar novas e antigas', hint: 'Lançamentos junto com faixas de outras épocas.' },
  { value: 'famosas', label: 'Só as mais famosas', hint: 'As conhecidas do estilo, sem lançamentos.' },
  { value: 'lancamentos', label: 'Só lançamentos', hint: 'O que saiu do ano passado para cá.' },
];

type SecaoId = 'temas' | 'detalhes' | 'musica' | 'cinema' | 'livros' | 'hobbies' | 'regiao' | 'ritmo';

const SECOES: { id: SecaoId; rotulo: string; icon: IconName }[] = [
  { id: 'temas', rotulo: 'Temas', icon: 'sparkles' },
  { id: 'detalhes', rotulo: 'Detalhes', icon: 'compass' },
  { id: 'musica', rotulo: 'Música', icon: 'music' },
  { id: 'cinema', rotulo: 'Cinema', icon: 'film' },
  { id: 'livros', rotulo: 'Livros', icon: 'book' },
  { id: 'hobbies', rotulo: 'Hobbies', icon: 'palette' },
  { id: 'regiao', rotulo: 'Região', icon: 'mapPin' },
  { id: 'ritmo', rotulo: 'Ritmo', icon: 'clock' },
];

/** Estado do salvamento, mostrado ao lado do botão. */
type Estado =
  | { tipo: 'parado' }
  | { tipo: 'salvando' }
  | { tipo: 'aparelho' }
  | { tipo: 'erro'; mensagem: string };

/** Seletor de etiquetas reutilizado nos gêneros e subtemas. */
function Chips({
  options,
  selected,
  onToggle,
}: {
  options: GenreOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition ${
              active
                ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-200 shadow-[0_0_14px_-4px_rgba(31,208,242,0.7)]'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-emerald-400/40 hover:text-zinc-50'
            }`}
          >
            <Icon name={active ? 'check' : 'plus'} size={13} className={active ? '' : 'text-zinc-500'} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Painel de uma seção, com o número e o rótulo de HUD. */
function Secao({
  id,
  numero,
  titulo,
  apoio,
  feito,
  children,
}: {
  id: SecaoId;
  numero: number;
  titulo: string;
  apoio: string;
  feito: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={`q-${id}`} className="card-soft scroll-mt-24 p-5 md:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="rotulo-hud">
            {String(numero).padStart(2, '0')} / {SECOES[numero - 1].rotulo}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-50 md:text-2xl">{titulo}</h2>
          <p className="mt-1 text-sm text-zinc-400">{apoio}</p>
        </div>
        <span
          className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
            feito ? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300' : 'border-zinc-700 text-zinc-600'
          }`}
          title={feito ? 'Respondida' : 'Ainda sem resposta'}
        >
          <Icon name="check" size={14} />
        </span>
      </div>
      {children}
    </section>
  );
}

export default function Questionnaire() {
  const router = useRouter();
  const { prefs, ready, complete } = usePreferences();

  const [interests, setInterests] = useState<CategorySlug[]>(prefs.interests);
  const [subtopics, setSubtopics] = useState<string[]>(prefs.subtopics ?? []);
  const [musicGenres, setMusicGenres] = useState<string[]>(prefs.musicGenres ?? []);
  const [musicHits, setMusicHits] = useState<boolean>(prefs.musicHits ?? false);
  const [musicMix, setMusicMix] = useState<MusicMix>(prefs.musicMix ?? 'misturar');
  const [filmGenres, setFilmGenres] = useState<string[]>(prefs.filmGenres ?? []);
  const [bookGenres, setBookGenres] = useState<string[]>(prefs.bookGenres ?? []);
  const [hobbies, setHobbies] = useState<string[]>(prefs.hobbies ?? []);
  const [city, setCity] = useState<string | null>(prefs.city);
  const [radiusKm, setRadiusKm] = useState<number>(prefs.radiusKm);
  const [frequency, setFrequency] = useState<Frequency>(prefs.frequency);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'parado' });

  // O perfil chega em duas ondas (aparelho e depois conta). Enquanto ninguém
  // mexeu no formulário, ele acompanha — assim "Ajustar perfil" abre com as
  // respostas de antes em vez de uma tela em branco que obriga a refazer tudo.
  const touched = useRef(false);
  useEffect(() => {
    if (!ready || touched.current) return;
    setInterests(prefs.interests);
    setSubtopics(prefs.subtopics ?? []);
    setMusicGenres(prefs.musicGenres ?? []);
    setMusicHits(prefs.musicHits ?? false);
    setMusicMix(prefs.musicMix ?? 'misturar');
    setFilmGenres(prefs.filmGenres ?? []);
    setBookGenres(prefs.bookGenres ?? []);
    setHobbies(prefs.hobbies ?? []);
    setCity(prefs.city);
    setRadiusKm(prefs.radiusKm);
    setFrequency(prefs.frequency);
  }, [ready, prefs]);

  const mexeu = () => {
    touched.current = true;
    if (estado.tipo !== 'salvando') setEstado({ tipo: 'parado' });
  };

  const toggle = <T extends string>(list: T[], set: (v: T[]) => void, value: T) => {
    mexeu();
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  /** Desmarcar um tema leva junto os subtemas que só existem nele. */
  const toggleTema = (slug: CategorySlug) => {
    mexeu();
    if (!interests.includes(slug)) {
      setInterests([...interests, slug]);
      return;
    }
    const restantes = interests.filter((s) => s !== slug);
    const deOutros = new Set(restantes.flatMap((s) => getTopic(s)?.subtopics ?? []));
    const doTema = new Set(getTopic(slug)?.subtopics ?? []);
    setInterests(restantes);
    setSubtopics(subtopics.filter((s) => !doTema.has(s) || deOutros.has(s)));
  };

  /** Escolher um subtema é dizer que o tema interessa: marca os dois. */
  const toggleSubtema = (slug: CategorySlug, nome: string) => {
    mexeu();
    if (subtopics.includes(nome)) {
      setSubtopics(subtopics.filter((s) => s !== nome));
      return;
    }
    setSubtopics([...subtopics, nome]);
    if (!interests.includes(slug)) setInterests([...interests, slug]);
  };

  const chooseCity = (v: string | null) => {
    mexeu();
    setCity(v);
  };
  const chooseRadius = (v: number) => {
    mexeu();
    setRadiusKm(v);
  };
  const chooseFrequency = (v: Frequency) => {
    mexeu();
    setFrequency(v);
  };

  const detectCity = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setDetectMsg('Geolocalização não disponível neste dispositivo.');
      return;
    }
    setDetecting(true);
    setDetectMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const nearest = [...CITIES].sort((a, b) => haversineKm(me, a.coords) - haversineKm(me, b.coords))[0];
        chooseCity(nearest.name);
        setDetectMsg(`Detectamos que você está perto de ${nearest.name}.`);
        setDetecting(false);
      },
      () => {
        setDetectMsg('Não conseguimos acessar sua localização. Selecione a cidade abaixo.');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const respondidas: Record<SecaoId, boolean> = {
    temas: interests.length > 0,
    detalhes: subtopics.length > 0,
    musica: musicGenres.length > 0,
    cinema: filmGenres.length > 0,
    livros: bookGenres.length > 0,
    hobbies: hobbies.length > 0,
    regiao: Boolean(city),
    ritmo: true,
  };
  const totalRespondidas = Object.values(respondidas).filter(Boolean).length;
  const podeSalvar = interests.length > 0;

  const salvar = async () => {
    if (!podeSalvar) {
      document.getElementById('q-temas')?.scrollIntoView({ behavior: 'smooth' });
      setEstado({ tipo: 'erro', mensagem: 'Escolha ao menos um tema para a plataforma saber o que te mostrar.' });
      return;
    }
    setEstado({ tipo: 'salvando' });
    // `complete` grava no aparelho e sobe para a conta. Se a subida falhar, a
    // escolha fica marcada como pendente e sobe no próximo acesso — não volta
    // mais para a versão antiga.
    const res = await complete({
      interests,
      subtopics,
      musicGenres,
      musicHits,
      musicMix,
      filmGenres,
      bookGenres,
      hobbies,
      city,
      radiusKm,
      frequency,
    });
    if (!res.ok) {
      setEstado({
        tipo: 'erro',
        mensagem: `${res.error} Suas escolhas ficaram guardadas neste aparelho e sobem para a conta na próxima vez que você abrir a plataforma — ou tente salvar de novo.`,
      });
      return;
    }
    if (res.scope === 'aparelho') {
      // Salvo, mas só aqui: sem login não há conta para levar a outros aparelhos.
      setEstado({ tipo: 'aparelho' });
      return;
    }
    router.push('/');
  };

  const topicosPorId = useMemo(() => new Map(TOPICS.map((t) => [t.slug, t])), []);

  const resumo: [string, string][] = [
    ['Temas', interests.map((s) => topicosPorId.get(s)?.label).filter(Boolean).join(', ')],
    ['Detalhes', subtopics.join(', ')],
    ['Música', musicGenres.map((g) => MUSIC_GENRES.find((x) => x.id === g)?.label).filter(Boolean).join(', ')],
    ['Jeito de ouvir', `${MIXES.find((m) => m.value === musicMix)?.label} · ${musicHits ? 'com os hits' : 'sem os hits'}`],
    ['Cinema', filmGenres.map((g) => FILM_GENRES.find((x) => x.id === g)?.label).filter(Boolean).join(', ')],
    ['Livros', bookGenres.map((g) => BOOK_GENRES.find((x) => x.id === g)?.label).filter(Boolean).join(', ')],
    ['Hobbies', hobbies.map((h) => HOBBIES.find((x) => x.id === h)?.label).filter(Boolean).join(', ')],
    ['Região', city ? `${city} · ${radiusKm} km` : ''],
    ['Ritmo', FREQUENCIES.find((f) => f.value === frequency)?.label ?? ''],
  ];

  const botaoSalvar = (extra = '') => (
    <button
      type="button"
      onClick={salvar}
      disabled={estado.tipo === 'salvando'}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:bg-emerald-300 disabled:opacity-60 ${extra}`}
    >
      {estado.tipo === 'salvando' ? 'Salvando…' : 'Salvar meu perfil'} <Icon name="check" size={15} />
    </button>
  );

  const aviso =
    estado.tipo === 'erro' ? (
      <p role="alert" className="rounded-xl border border-clay-700/60 bg-clay-950/50 px-4 py-3 text-xs leading-relaxed text-clay-200">
        {estado.mensagem}
      </p>
    ) : estado.tipo === 'aparelho' ? (
      <div role="status" className="space-y-2 rounded-xl border border-emerald-700/60 bg-emerald-950/50 px-4 py-3 text-xs leading-relaxed text-emerald-200">
        <p>
          Perfil salvo neste aparelho. Para ele valer também no celular e em outros navegadores,{' '}
          <Link href="/login" className="font-semibold underline">
            entre na sua conta
          </Link>{' '}
          — ele sobe sozinho.
        </p>
        <Link href="/" className="inline-flex items-center gap-1 font-semibold text-emerald-300 hover:underline">
          Ver minha home <Icon name="arrowRight" size={13} />
        </Link>
      </div>
    ) : null;

  return (
    <div className="grid grid-cols-1 gap-6 pb-28 lg:grid-cols-12 lg:gap-8 lg:pb-0">
      {/* Painel lateral: progresso, atalhos, resumo e salvar */}
      <aside className="lg:col-span-4 xl:col-span-3">
        <div className="card-soft cantos-hud space-y-5 p-5 lg:sticky lg:top-24">
          <div>
            <p className="rotulo-hud">Progresso</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-emerald-300 texto-neon">
              {totalRespondidas}
              <span className="text-lg text-zinc-500">/{SECOES.length}</span>
            </p>
            <div className="mt-3 flex gap-1">
              {SECOES.map((s) => (
                <span
                  key={s.id}
                  className={`h-1.5 flex-1 rounded-full ${respondidas[s.id] ? 'bg-emerald-400 shadow-[0_0_8px_rgba(31,208,242,0.8)]' : 'bg-zinc-800'}`}
                />
              ))}
            </div>
          </div>

          <nav aria-label="Seções do questionário" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-1">
            {SECOES.map((s, i) => (
              <a
                key={s.id}
                href={`#q-${s.id}`}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-zinc-300 transition hover:bg-zinc-900 hover:text-emerald-300"
              >
                <span className="font-mono text-[10px] text-zinc-500">{String(i + 1).padStart(2, '0')}</span>
                <Icon name={s.icon} size={14} className={respondidas[s.id] ? 'text-emerald-400' : 'text-zinc-600'} />
                <span className="truncate">{s.rotulo}</span>
              </a>
            ))}
          </nav>

          <dl className="hidden space-y-2 border-t border-zinc-800 pt-4 text-xs lg:block">
            {resumo.map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{k}</dt>
                <dd className="mt-0.5 text-zinc-200">{v || '—'}</dd>
              </div>
            ))}
          </dl>

          <div className="hidden space-y-3 lg:block">
            {botaoSalvar('w-full')}
            {aviso}
          </div>
        </div>
      </aside>

      {/* Todas as seções, na ordem */}
      <div className="space-y-6 lg:col-span-8 xl:col-span-9">
        <Secao id="temas" numero={1} titulo="Quais assuntos combinam com você?" apoio="Escolha quantos quiser — isso define o que aparece primeiro." feito={respondidas.temas}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {TOPICS.map((t) => {
              const active = interests.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTema(t.slug)}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                    active
                      ? `${t.accent.border} ${t.accent.bg} shadow-[0_0_18px_-6px_rgba(31,208,242,0.6)]`
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-600'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.accent.bg} ${t.accent.text}`}>
                    <Icon name={t.icon} size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-zinc-50">{t.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-400">{t.tagline}</span>
                  </span>
                  <span className={active ? t.accent.text : 'text-zinc-600'}>
                    <Icon name={active ? 'check' : 'plus'} size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        </Secao>

        <Secao
          id="detalhes"
          numero={2}
          titulo="Dentro de cada tema, o que mais interessa?"
          apoio="Todos os subtemas estão aqui. Escolher um já marca o tema dele."
          feito={respondidas.detalhes}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {TOPICS.map((t) => {
              const seguindo = interests.includes(t.slug);
              return (
                <div
                  key={t.slug}
                  className={`rounded-xl border p-3.5 transition ${seguindo ? `${t.accent.border} bg-zinc-950/60` : 'border-zinc-800/80 bg-zinc-950/40'}`}
                >
                  <p className={`mb-2.5 flex items-center gap-1.5 text-xs font-semibold ${seguindo ? t.accent.text : 'text-zinc-400'}`}>
                    <Icon name={t.icon} size={14} /> {t.label}
                  </p>
                  <Chips
                    options={t.subtopics.map((s) => ({ id: s, label: s, query: s }))}
                    selected={subtopics}
                    onToggle={(nome) => toggleSubtema(t.slug, nome)}
                  />
                </div>
              );
            })}
          </div>
        </Secao>

        <Secao id="musica" numero={3} titulo="Que música você ouve?" apoio="Monta sua trilha no Spotify e sugere shows." feito={respondidas.musica}>
          <Chips options={MUSIC_GENRES} selected={musicGenres} onToggle={(id) => toggle(musicGenres, setMusicGenres, id)} />

          {/* Jeito de ouvir: as duas escolhas que decidem hits x descobertas */}
          <div className="mt-6 grid grid-cols-1 gap-5 border-t border-zinc-800 pt-5 xl:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-semibold text-zinc-100">Você gosta dos hits e clássicos do estilo?</legend>
              <p className="mt-0.5 text-xs text-zinc-400">As músicas que todo mundo conhece — os “clichês”.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {HITS.map((o) => (
                  <button
                    key={String(o.value)}
                    type="button"
                    aria-pressed={musicHits === o.value}
                    onClick={() => {
                      mexeu();
                      setMusicHits(o.value);
                    }}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      musicHits === o.value
                        ? 'border-emerald-400/70 bg-emerald-400/10 shadow-[0_0_18px_-6px_rgba(31,208,242,0.6)]'
                        : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-600'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-zinc-50">{o.label}</span>
                    <span className="mt-1 block text-xs text-zinc-400">{o.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-semibold text-zinc-100">Como você prefere a sua trilha?</legend>
              <p className="mt-0.5 text-xs text-zinc-400">Vale para todos os estilos que você marcou.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {MIXES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={musicMix === o.value}
                    onClick={() => {
                      mexeu();
                      setMusicMix(o.value);
                    }}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      musicMix === o.value
                        ? 'border-emerald-400/70 bg-emerald-400/10 shadow-[0_0_18px_-6px_rgba(31,208,242,0.6)]'
                        : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-600'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-zinc-50">{o.label}</span>
                    <span className="mt-1 block text-xs text-zinc-400">{o.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </Secao>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Secao id="cinema" numero={4} titulo="Cinema e séries" apoio="Indicações de filmes, mostras e sessões." feito={respondidas.cinema}>
            <Chips options={FILM_GENRES} selected={filmGenres} onToggle={(id) => toggle(filmGenres, setFilmGenres, id)} />
          </Secao>
          <Secao id="livros" numero={5} titulo="O que você gosta de ler?" apoio="Livros, clubes de leitura e feiras." feito={respondidas.livros}>
            <Chips options={BOOK_GENRES} selected={bookGenres} onToggle={(id) => toggle(bookGenres, setBookGenres, id)} />
          </Secao>
        </div>

        <Secao id="hobbies" numero={6} titulo="O que você gosta de fazer?" apoio="Seus hobbies ajudam a sugerir oficinas e encontros." feito={respondidas.hobbies}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {HOBBIES.map((h) => {
              const active = hobbies.includes(h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(hobbies, setHobbies, h.id)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-medium transition ${
                    active
                      ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-200 shadow-[0_0_14px_-4px_rgba(31,208,242,0.7)]'
                      : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-emerald-400/40'
                  }`}
                >
                  <Icon name={h.icon} size={17} className="shrink-0" /> {h.label}
                </button>
              );
            })}
          </div>
        </Secao>

        <Secao id="regiao" numero={7} titulo="Onde você está?" apoio="Serve para ordenar os eventos por proximidade." feito={respondidas.regiao}>
          <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={detectCity}
                disabled={detecting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/20 disabled:opacity-60"
              >
                <Icon name="mapPin" size={16} /> {detecting ? 'Detectando…' : 'Detectar minha cidade'}
              </button>
              {detectMsg && <p className="text-xs text-zinc-400">{detectMsg}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {CITIES.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={city === c.name}
                  onClick={() => chooseCity(city === c.name ? null : c.name)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                    city === c.name
                      ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-200'
                      : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-emerald-400/40 hover:text-zinc-100'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-zinc-400">Raio para eventos: {radiusKm} km</p>
              <div className="flex flex-wrap gap-2">
                {RADII.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={radiusKm === r}
                    onClick={() => chooseRadius(r)}
                    className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-medium transition ${
                      radiusKm === r
                        ? 'bg-emerald-400 font-semibold text-zinc-950 shadow-glow'
                        : 'border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Secao>

        <Secao id="ritmo" numero={8} titulo="Com que frequência quer receber?" apoio="Ajusta o ritmo da newsletter e das indicações." feito={respondidas.ritmo}>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={frequency === f.value}
                onClick={() => chooseFrequency(f.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  frequency === f.value
                    ? 'border-emerald-400/70 bg-emerald-400/10 shadow-[0_0_18px_-6px_rgba(31,208,242,0.6)]'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-600'
                }`}
              >
                <span className="block text-sm font-semibold text-zinc-50">{f.label}</span>
                <span className="mt-1 block text-xs text-zinc-400">{f.hint}</span>
              </button>
            ))}
          </div>
        </Secao>

      </div>

      {/* Barra de salvar no celular, acima da barra de abas */}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 space-y-2 px-4 md:bottom-4 lg:hidden">
        {/* O aviso fica junto do botão: no fim da página ninguém o veria. */}
        {aviso && <div className="rounded-xl bg-zinc-950/95 backdrop-blur-xl">{aviso}</div>}
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-zinc-950/90 p-3 shadow-neon backdrop-blur-xl">
          <p className="flex-1 font-mono text-[11px] uppercase tracking-widest text-zinc-400">
            {totalRespondidas}/{SECOES.length} respondidas
          </p>
          {botaoSalvar()}
        </div>
      </div>
    </div>
  );
}
