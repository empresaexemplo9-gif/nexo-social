'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CITIES } from '@/lib/data';

interface Provider {
  id: string;
  label: string;
  kind: 'local' | 'eventos' | 'musica' | 'video';
  purpose: string;
  docsUrl: string;
  caveat?: string;
  canImport: boolean;
  envVars: string[];
  missingEnv: string[];
  ready: boolean;
}

interface TestResult {
  ok: boolean;
  status?: number;
  message: string;
  hint?: string;
  sample?: string;
  durationMs: number;
}

interface ImportResult {
  ok: boolean;
  fetched: number;
  inserted: number;
  skipped: number;
  message: string;
  hint?: string;
  errors: string[];
}

const KIND_BADGE: Record<Provider['kind'], { label: string; className: string }> = {
  local: { label: 'Localização', className: 'text-sky-400 border-sky-800/50 bg-sky-950/30' },
  eventos: { label: 'Eventos', className: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30' },
  musica: { label: 'Música', className: 'text-fuchsia-400 border-fuchsia-800/50 bg-fuchsia-950/30' },
  video: { label: 'Vídeo', className: 'text-clay-300 border-clay-800/50 bg-clay-950/30' },
};

export default function AdminIntegrations({ demo }: { demo: boolean }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tests, setTests] = useState<Record<string, TestResult>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importCity, setImportCity] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/integrations');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setProviders(json.providers || []);
    } catch (e: any) {
      setLoadError(e?.message || 'Falha ao carregar as integrações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runTest = async (id: string) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id, action: 'test' }),
      });
      const json = await res.json().catch(() => ({}));
      setTests((t) => ({
        ...t,
        [id]: json.result ?? { ok: false, message: json.error || `HTTP ${res.status}`, durationMs: 0 },
      }));
    } catch (e: any) {
      setTests((t) => ({ ...t, [id]: { ok: false, message: e?.message || 'Erro de rede', durationMs: 0 } }));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const runImport = async (id: string) => {
    setBusy((b) => ({ ...b, [`${id}:import`]: true }));
    setImportResult(null);
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id, action: 'import', city: importCity || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      setImportResult(
        json.result ?? { ok: false, fetched: 0, inserted: 0, skipped: 0, message: json.error || `HTTP ${res.status}`, errors: [] },
      );
    } catch (e: any) {
      setImportResult({ ok: false, fetched: 0, inserted: 0, skipped: 0, message: e?.message || 'Erro de rede', errors: [] });
    } finally {
      setBusy((b) => ({ ...b, [`${id}:import`]: false }));
    }
  };

  const testAll = async () => {
    for (const p of providers) await runTest(p.id);
  };

  if (demo) {
    return (
      <div className="rounded-2xl border border-clay-800/50 bg-clay-950/20 p-6 text-sm text-clay-200">
        As integrações exigem o Supabase configurado (autenticação de administrador). Configure as credenciais e faça login para
        gerenciar as APIs externas.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-zinc-50">Integrações de APIs</h2>
          <p className="text-sm text-zinc-400">
            Status, teste de conexão e importação. As chaves ficam apenas no servidor — nunca aparecem aqui.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500"
          >
            ↻ Atualizar
          </button>
          <button
            onClick={testAll}
            disabled={loading || providers.length === 0}
            className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            Testar todas
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
          <strong>Não foi possível carregar:</strong> {loadError}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Carregando integrações…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {providers.map((p) => {
            const t = tests[p.id];
            const badge = KIND_BADGE[p.kind];
            return (
              <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-50">{p.label}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badge.className}`}>{badge.label}</span>
                      {p.envVars.length === 0 && (
                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">sem chave</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{p.purpose}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      p.ready ? 'bg-emerald-950/60 text-emerald-400' : 'bg-clay-950/60 text-clay-300'
                    }`}
                  >
                    {p.ready ? 'configurada' : 'pendente'}
                  </span>
                </div>

                {/* Credenciais faltando — apontamento do erro de configuração */}
                {p.missingEnv.length > 0 && (
                  <div className="rounded-xl border border-clay-800/50 bg-clay-950/25 p-3 text-xs text-clay-200">
                    <p className="font-semibold">Falta configurar:</p>
                    <ul className="mt-1 list-inside list-disc font-mono text-[11px]">
                      {p.missingEnv.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                    <p className="mt-2">
                      Adicione em <span className="font-medium">Vercel → Settings → Environment Variables</span> e faça{' '}
                      <span className="font-medium">Redeploy</span>.
                    </p>
                  </div>
                )}

                {p.caveat && <p className="text-[11px] text-zinc-500">⚠️ {p.caveat}</p>}

                {/* Resultado do teste */}
                {t && (
                  <div
                    className={`rounded-xl border p-3 text-xs ${
                      t.ok ? 'border-emerald-900/60 bg-emerald-950/25 text-emerald-200' : 'border-red-900/60 bg-red-950/25 text-red-200'
                    }`}
                  >
                    <p className="font-semibold">
                      {t.ok ? '✓ ' : '✕ '}
                      {t.message}
                      {t.status ? <span className="ml-1 font-mono opacity-70">[{t.status}]</span> : null}
                      <span className="ml-2 font-normal opacity-60">{t.durationMs} ms</span>
                    </p>
                    {t.sample && <p className="mt-1 opacity-80">{t.sample}</p>}
                    {t.hint && <p className="mt-2 border-t border-white/10 pt-2 opacity-90">💡 {t.hint}</p>}
                  </div>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => runTest(p.id)}
                    disabled={busy[p.id]}
                    className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald-600 hover:text-emerald-400 disabled:opacity-50"
                  >
                    {busy[p.id] ? 'Testando…' : 'Testar conexão'}
                  </button>
                  {p.canImport && (
                    <button
                      onClick={() => runImport(p.id)}
                      disabled={busy[`${p.id}:import`] || !p.ready}
                      className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-40"
                      title={p.ready ? 'Importar eventos para a agenda' : 'Configure a chave primeiro'}
                    >
                      {busy[`${p.id}:import`] ? 'Importando…' : '⬇ Importar eventos'}
                    </button>
                  )}
                  <a
                    href={p.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 underline transition hover:text-zinc-200"
                  >
                    obter chave
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Importação */}
      <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-zinc-50">Importação de eventos</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-400">Filtrar por cidade (opcional)</label>
          <select
            value={importCity}
            onChange={(e) => setImportCity(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Brasil inteiro</option>
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-zinc-500">
          A importação é idempotente: reimportar não duplica (usa origem + id externo).
        </p>

        {importResult && (
          <div
            className={`rounded-xl border p-3 text-xs ${
              importResult.ok ? 'border-emerald-900/60 bg-emerald-950/25 text-emerald-200' : 'border-red-900/60 bg-red-950/25 text-red-200'
            }`}
          >
            <p className="font-semibold">
              {importResult.ok ? '✓ ' : '✕ '}
              {importResult.message}
            </p>
            <p className="mt-1 opacity-80">
              recebidos: {importResult.fetched} • gravados: {importResult.inserted} • ignorados: {importResult.skipped}
            </p>
            {importResult.hint && <p className="mt-2 border-t border-white/10 pt-2 opacity-90">💡 {importResult.hint}</p>}
            {importResult.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc font-mono text-[11px] opacity-80">
                {importResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
