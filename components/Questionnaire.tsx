'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePreferences, type Frequency } from '@/lib/preferences';
import { CITIES, TOPICS, type CategorySlug } from '@/lib/data';
import { haversineKm } from '@/lib/geo';
import Icon from './icons';

const FREQUENCIES: { value: Frequency; label: string; hint: string }[] = [
  { value: 'diaria', label: 'Diária', hint: 'Curadoria fresca todo dia' },
  { value: 'semanal', label: 'Semanal', hint: 'Um resumo por semana' },
  { value: 'mensal', label: 'Mensal', hint: 'O essencial do mês' },
];

const RADII = [10, 25, 50, 100, 250];

export default function Questionnaire() {
  const router = useRouter();
  const { prefs, complete } = usePreferences();

  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<CategorySlug[]>(prefs.interests);
  const [city, setCity] = useState<string | null>(prefs.city);
  const [radiusKm, setRadiusKm] = useState<number>(prefs.radiusKm);
  const [frequency, setFrequency] = useState<Frequency>(prefs.frequency);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState('');

  const totalSteps = 4;

  const toggleInterest = (slug: CategorySlug) => {
    setInterests((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
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
        const nearest = [...CITIES].sort(
          (a, b) => haversineKm(me, a.coords) - haversineKm(me, b.coords),
        )[0];
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
    complete({ interests, city, radiusKm, frequency });
    // Persiste no backend quando o usuário está autenticado (best-effort:
    // um 401 em modo anônimo é esperado e ignorado — o localStorage garante
    // a personalização local).
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, city, radiusKm, frequency }),
      });
    } catch {
      /* segue apenas com localStorage */
    }
    router.push('/');
  };

  const canAdvance = step === 0 ? interests.length > 0 : true;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progresso */}
      <div className="mb-8 flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${i <= step ? 'bg-emerald-500' : 'bg-zinc-800'}`}
          />
        ))}
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 md:p-8">
        {/* Passo 1 — Interesses */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Sobre quais assuntos você quer saber mais?</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Selecione os temas que mais combinam com você. Isso define o que aparece primeiro na sua home.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TOPICS.map((t) => {
                const active = interests.includes(t.slug);
                return (
                  <button
                    key={t.slug}
                    onClick={() => toggleInterest(t.slug)}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      active ? `${t.accent.border} ${t.accent.bg}` : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    }`}
                  >
                    <span className={`mt-0.5 ${t.accent.text}`}><Icon name={t.icon} size={22} /></span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{t.label}</span>
                      <span className="mt-0.5 block text-xs text-zinc-400">{t.tagline}</span>
                    </span>
                    <span className={`ml-auto text-lg ${active ? t.accent.text : 'text-zinc-700'}`}>
                      {active ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Passo 2 — Localização */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Onde você está?</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Usamos sua localização para mostrar eventos por proximidade. Você pode detectar automaticamente ou escolher a cidade.
              </p>
            </div>
            <button
              onClick={detectCity}
              disabled={detecting}
              className="w-full rounded-2xl border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-400 transition hover:bg-emerald-950/70 disabled:opacity-60"
            >
              {detecting ? 'Detectando…' : 'Detectar minha cidade automaticamente'}
            </button>
            {detectMsg && <p className="text-xs text-zinc-400">{detectMsg}</p>}
            <div>
              <label className="mb-2 block text-xs text-zinc-400">Ou selecione sua cidade</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CITIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setCity(c.name)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      city === c.name ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs text-zinc-400">Raio de interesse para eventos: {radiusKm} km</label>
              <div className="flex flex-wrap gap-2">
                {RADII.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadiusKm(r)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      radiusKm === r ? 'bg-emerald-500 font-semibold text-zinc-950' : 'border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Passo 3 — Frequência */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Com que frequência quer receber a curadoria?</h2>
              <p className="mt-1 text-sm text-zinc-400">Isso ajusta o ritmo da sua newsletter e das recomendações.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    frequency === f.value ? 'border-emerald-600 bg-emerald-950/40' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <span className="block text-sm font-semibold text-white">{f.label}</span>
                  <span className="mt-1 block text-xs text-zinc-400">{f.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Passo 4 — Resumo */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Tudo pronto! 🎉</h2>
              <p className="mt-1 text-sm text-zinc-400">Confira suas escolhas. Você pode refazer o questionário quando quiser.</p>
            </div>
            <dl className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Interesses</dt>
                <dd className="text-right font-medium text-white">
                  {interests.length ? interests.map((s) => TOPICS.find((t) => t.slug === s)?.label).join(', ') : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Cidade</dt>
                <dd className="font-medium text-white">{city ?? 'Não definida'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Raio de eventos</dt>
                <dd className="font-medium text-white">{radiusKm} km</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-400">Frequência</dt>
                <dd className="font-medium text-white">{FREQUENCIES.find((f) => f.value === frequency)?.label}</dd>
              </div>
            </dl>
          </div>
        )}

        {/* Navegação */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-sm text-zinc-400 transition hover:text-white disabled:opacity-0"
          >
            ← Voltar
          </button>
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continuar →
            </button>
          ) : (
            <button
              onClick={finish}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              Concluir e personalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
