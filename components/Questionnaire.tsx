'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './icons';
import { usePreferences, type Frequency } from '@/lib/preferences';
import { CITIES, TOPICS, getTopic, type CategorySlug } from '@/lib/data';
import { BOOK_GENRES, FILM_GENRES, HOBBIES, MUSIC_GENRES, type GenreOption } from '@/lib/taxonomy';
import { haversineKm } from '@/lib/geo';

const FREQUENCIES: { value: Frequency; label: string; hint: string }[] = [
  { value: 'diaria', label: 'Diária', hint: 'Curadoria fresca todo dia' },
  { value: 'semanal', label: 'Semanal', hint: 'Um resumo por semana' },
  { value: 'mensal', label: 'Mensal', hint: 'O essencial do mês' },
];

const RADII = [10, 25, 50, 100, 250];

/** Seletor de etiquetas reutilizado nos passos de gênero. */
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
            onClick={() => onToggle(o.id)}
            className={`inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-medium transition ${
              active
                ? 'border-emerald-600 bg-emerald-950/50 text-emerald-300'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100'
            }`}
          >
            {active && <Icon name="check" size={13} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Questionnaire() {
  const router = useRouter();
  const { prefs, complete } = usePreferences();

  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<CategorySlug[]>(prefs.interests);
  const [subtopics, setSubtopics] = useState<string[]>(prefs.subtopics ?? []);
  const [musicGenres, setMusicGenres] = useState<string[]>(prefs.musicGenres ?? []);
  const [filmGenres, setFilmGenres] = useState<string[]>(prefs.filmGenres ?? []);
  const [bookGenres, setBookGenres] = useState<string[]>(prefs.bookGenres ?? []);
  const [hobbies, setHobbies] = useState<string[]>(prefs.hobbies ?? []);
  const [city, setCity] = useState<string | null>(prefs.city);
  const [radiusKm, setRadiusKm] = useState<number>(prefs.radiusKm);
  const [frequency, setFrequency] = useState<Frequency>(prefs.frequency);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const STEPS = ['Temas', 'Detalhes', 'Música', 'Cinema', 'Livros', 'Hobbies', 'Região', 'Ritmo'];
  const total = STEPS.length;

  const toggle = <T extends string>(list: T[], set: (v: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  /** Subtemas apenas dos temas escolhidos — evita uma lista gigante. */
  const availableSubtopics = useMemo(
    () => interests.flatMap((slug) => (getTopic(slug)?.subtopics ?? []).map((s) => ({ topic: slug, name: s }))),
    [interests],
  );

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
        setCity(nearest.name);
        setDetectMsg(`Detectamos que você está perto de ${nearest.name}.`);
        setDetecting(false);
      },
      () => {
        setDetectMsg('Não conseguimos acessar sua localização. Selecione a cidade manualmente.');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const finish = async () => {
    setSaving(true);
    complete({ interests, subtopics, musicGenres, filmGenres, bookGenres, hobbies, city, radiusKm, frequency });
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, subtopics, musicGenres, filmGenres, bookGenres, hobbies, city, radiusKm, frequency }),
      });
    } catch {
      /* segue com o armazenamento local */
    }
    router.push('/interesses');
  };

  const canAdvance = step === 0 ? interests.length > 0 : true;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progresso */}
      <div className="mb-3 flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
        ))}
      </div>
      <p className="mb-6 text-center text-xs text-zinc-500">
        Passo {step + 1} de {total} · {STEPS[step]}
      </p>

      <div className="card-soft p-6 md:p-8">
        {/* 1 — Temas */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">Quais assuntos combinam com você?</h2>
              <p className="mt-1 text-sm text-zinc-400">Escolha quantos quiser — isso define o que aparece primeiro.</p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {TOPICS.map((t) => {
                const active = interests.includes(t.slug);
                return (
                  <button
                    key={t.slug}
                    onClick={() => toggle(interests, setInterests, t.slug)}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                      active ? `${t.accent.border} ${t.accent.bg}` : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.accent.bg} ${t.accent.text}`}>
                      <Icon name={t.icon} size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-zinc-50">{t.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-400">{t.tagline}</span>
                    </span>
                    <span className={active ? t.accent.text : 'text-zinc-700'}>
                      <Icon name={active ? 'check' : 'plus'} size={16} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2 — Subtemas */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">Dentro desses temas, o que mais interessa?</h2>
              <p className="mt-1 text-sm text-zinc-400">Opcional, mas deixa a indicação bem mais certeira.</p>
            </div>
            {availableSubtopics.length === 0 ? (
              <p className="text-sm text-zinc-400">Volte e escolha ao menos um tema.</p>
            ) : (
              <div className="space-y-4">
                {interests.map((slug) => {
                  const t = getTopic(slug);
                  if (!t) return null;
                  return (
                    <div key={slug}>
                      <p className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${t.accent.text}`}>
                        <Icon name={t.icon} size={14} /> {t.label}
                      </p>
                      <Chips
                        options={t.subtopics.map((s) => ({ id: s, label: s, query: s }))}
                        selected={subtopics}
                        onToggle={(id) => toggle(subtopics, setSubtopics, id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3 — Música */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">Que música você ouve?</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Usamos isso para montar sua trilha no Spotify e sugerir shows.
              </p>
            </div>
            <Chips options={MUSIC_GENRES} selected={musicGenres} onToggle={(id) => toggle(musicGenres, setMusicGenres, id)} />
          </div>
        )}

        {/* 4 — Cinema */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">Cinema e séries: o que você curte?</h2>
              <p className="mt-1 text-sm text-zinc-400">Indicações de filmes, mostras e sessões seguem esses gêneros.</p>
            </div>
            <Chips options={FILM_GENRES} selected={filmGenres} onToggle={(id) => toggle(filmGenres, setFilmGenres, id)} />
          </div>
        )}

        {/* 5 — Livros */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">O que você gosta de ler?</h2>
              <p className="mt-1 text-sm text-zinc-400">Serve para indicar livros, clubes de leitura e feiras.</p>
            </div>
            <Chips options={BOOK_GENRES} selected={bookGenres} onToggle={(id) => toggle(bookGenres, setBookGenres, id)} />
          </div>
        )}

        {/* 6 — Hobbies */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">O que você gosta de fazer?</h2>
              <p className="mt-1 text-sm text-zinc-400">Seus hobbies ajudam a sugerir oficinas e encontros.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {HOBBIES.map((h) => {
                const active = hobbies.includes(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggle(hobbies, setHobbies, h.id)}
                    className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-xs font-medium transition ${
                      active
                        ? 'border-emerald-600 bg-emerald-950/50 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <Icon name={h.icon} size={17} className="shrink-0" /> {h.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 7 — Região */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">Onde você está?</h2>
              <p className="mt-1 text-sm text-zinc-400">Serve para ordenar os eventos por proximidade.</p>
            </div>
            <button
              onClick={detectCity}
              disabled={detecting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-400 transition hover:bg-emerald-950/70 disabled:opacity-60"
            >
              <Icon name="mapPin" size={16} /> {detecting ? 'Detectando…' : 'Detectar minha cidade'}
            </button>
            {detectMsg && <p className="text-xs text-zinc-400">{detectMsg}</p>}
            <div>
              <label className="mb-2 block text-xs text-zinc-400">Ou selecione</label>
              <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                {CITIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setCity(c.name)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      city === c.name
                        ? 'border-emerald-600 bg-emerald-950/40 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs text-zinc-400">Raio para eventos: {radiusKm} km</label>
              <div className="flex flex-wrap gap-2">
                {RADII.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadiusKm(r)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      radiusKm === r
                        ? 'bg-emerald-500 font-semibold text-zinc-950'
                        : 'border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8 — Ritmo + resumo */}
        {step === 7 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">Com que frequência quer receber?</h2>
              <p className="mt-1 text-sm text-zinc-400">Ajusta o ritmo da newsletter e das indicações.</p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    frequency === f.value ? 'border-emerald-600 bg-emerald-950/40' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <span className="block text-sm font-semibold text-zinc-50">{f.label}</span>
                  <span className="mt-1 block text-xs text-zinc-400">{f.hint}</span>
                </button>
              ))}
            </div>

            <dl className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs">
              {[
                ['Temas', interests.map((s) => getTopic(s)?.label).join(', ')],
                ['Subtemas', subtopics.join(', ')],
                ['Música', musicGenres.map((g) => MUSIC_GENRES.find((x) => x.id === g)?.label).join(', ')],
                ['Cinema', filmGenres.map((g) => FILM_GENRES.find((x) => x.id === g)?.label).join(', ')],
                ['Livros', bookGenres.map((g) => BOOK_GENRES.find((x) => x.id === g)?.label).join(', ')],
                ['Hobbies', hobbies.map((h) => HOBBIES.find((x) => x.id === h)?.label).join(', ')],
                ['Região', city ? `${city} · ${radiusKm} km` : 'não definida'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-zinc-500">{k}</dt>
                  <dd className="text-right text-zinc-200">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Navegação */}
        <div className="mt-7 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-sm text-zinc-400 transition hover:text-zinc-100 disabled:opacity-0"
          >
            ← Voltar
          </button>
          {step < total - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar <Icon name="arrowRight" size={15} />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Concluir'} <Icon name="check" size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
