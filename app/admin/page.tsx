'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ADMIN_EMAIL, isPlatformAdmin } from '@/lib/auth';
import { CITIES, TOPICS, cityCoords } from '@/lib/data';
import AdminIntegrations from '@/components/AdminIntegrations';

type Tab = 'content' | 'event' | 'bom-dia' | 'integrations';

export default function AdminPage() {
  const [authState, setAuthState] = useState<'loading' | 'allowed' | 'denied' | 'demo'>('loading');
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [message, setMessage] = useState('');

  const [content, setContent] = useState({ title: '', topic: 'tecnologia', subtopic: '', snippet: '', body: '', readTime: '5 min', imageUrl: '' });
  const [event, setEvent] = useState({
    title: '', topic: 'tecnologia', date: '', city: 'São Paulo', venue: '',
    lat: CITIES[0].coords.lat, lng: CITIES[0].coords.lng, imageUrl: '', description: '', price: 'Gratuito',
  });
  const [bomDia, setBomDia] = useState({ soundtrackTitle: '', soundtrackArtist: '', recipeTitle: '', recipeDescription: '', quickTip: '' });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthState('demo');
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      const mail = data.user?.email ?? null;
      setCurrentEmail(mail);
      setAuthState(isPlatformAdmin(mail) ? 'allowed' : 'denied');
    });
  }, []);

  const onCityChange = (city: string) => {
    const coords = cityCoords(city);
    setEvent((prev) => ({ ...prev, city, lat: coords?.lat ?? prev.lat, lng: coords?.lng ?? prev.lng }));
  };

  const [busy, setBusy] = useState(false);

  // Envia para a API protegida (autorização de admin validada no servidor).
  const submit = async (endpoint: string, payload: Record<string, unknown>, successMsg: string) => {
    if (authState === 'demo') {
      setMessage(`${successMsg} (modo demonstração — configure o Supabase para persistir)`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      setMessage(res.ok ? successMsg : `❌ ${json.error || 'Falha ao salvar'}`);
    } catch {
      setMessage('❌ Erro de rede ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit('/api/admin/contents', content, '✓ Conteúdo publicado no Hub!');
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit('/api/admin/events', event, '✓ Evento cadastrado na Agenda!');
  };

  const handleSaveBomDia = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit('/api/admin/bom-dia', bomDia, '✓ Curadoria "Bom Dia" publicada!');
  };

  const handleSeed = async () => {
    if (authState === 'demo') {
      setMessage('Seed indisponível em modo demonstração — configure o Supabase.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      setMessage(res.ok ? `✓ Banco populado: ${JSON.stringify(json.seeded)}` : `❌ ${json.error || 'Falha no seed'}`);
    } catch {
      setMessage('❌ Erro de rede no seed.');
    } finally {
      setBusy(false);
    }
  };

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Verificando permissões…
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-100">
        <div className="max-w-md space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-bold text-white">Acesso restrito</h1>
          <p className="text-sm text-zinc-400">
            {currentEmail
              ? `A conta ${currentEmail} não tem permissão para o painel administrativo global.`
              : 'Você precisa entrar como administrador da plataforma.'}
          </p>
          <p className="text-xs text-zinc-500">Painel exclusivo de <span className="font-mono">{ADMIN_EMAIL}</span>.</p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href="/login" className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950">Entrar</Link>
            <Link href="/" className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-white">Voltar</Link>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none';

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-sans text-zinc-100 md:p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Painel do Administrador</h1>
            <p className="text-sm text-zinc-400">
              {authState === 'demo'
                ? 'Modo demonstração — em produção, exclusivo do administrador da plataforma'
                : `Conectado como ${currentEmail}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeed}
              disabled={busy}
              className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50"
              title="Popular o banco com o dataset inicial"
            >
              🌱 Popular banco
            </button>
            <Link href="/" className="text-xs text-emerald-400 hover:underline">← Voltar para a Home</Link>
          </div>
        </div>

        {authState === 'demo' && (
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4 text-xs text-amber-300">
            Supabase não configurado. Os formulários funcionam em modo demonstração; configure as credenciais para persistir os dados e
            restringir o acesso a <span className="font-mono">{ADMIN_EMAIL}</span>.
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/80 p-4 text-sm font-medium text-emerald-400">{message}</div>
        )}

        <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4">
          {([['content', '+ Novo Conteúdo'], ['event', '+ Novo Evento'], ['bom-dia', '☀️ Editar Bom Dia'], ['integrations', '🔌 Integrações']] as [Tab, string][]).map(
            ([tab, label]) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setMessage(''); }}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {/* Conteúdo */}
        {activeTab === 'content' && (
          <form onSubmit={handleSaveContent} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-bold text-white">Cadastrar Conteúdo no Hub</h2>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Título</label>
              <input type="text" required value={content.title} onChange={(e) => setContent({ ...content, title: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Tema</label>
                <select value={content.topic} onChange={(e) => setContent({ ...content, topic: e.target.value })} className={inputClass}>
                  {TOPICS.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Subtópico</label>
                <input type="text" value={content.subtopic} onChange={(e) => setContent({ ...content, subtopic: e.target.value })} placeholder="Ex: Inteligência Artificial" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Tempo de leitura</label>
                <input type="text" value={content.readTime} onChange={(e) => setContent({ ...content, readTime: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">URL da imagem</label>
                <input type="url" required value={content.imageUrl} onChange={(e) => setContent({ ...content, imageUrl: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Resumo</label>
              <textarea rows={2} required value={content.snippet} onChange={(e) => setContent({ ...content, snippet: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Texto completo</label>
              <textarea rows={4} value={content.body} onChange={(e) => setContent({ ...content, body: e.target.value })} className={inputClass} />
            </div>
            <button type="submit" className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400">Publicar no Hub</button>
          </form>
        )}

        {/* Evento */}
        {activeTab === 'event' && (
          <form onSubmit={handleSaveEvent} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-bold text-white">Cadastrar Evento na Agenda</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Nome do evento</label>
                <input type="text" required value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Tema</label>
                <select value={event.topic} onChange={(e) => setEvent({ ...event, topic: e.target.value })} className={inputClass}>
                  {TOPICS.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Data &amp; horário</label>
                <input type="text" required placeholder="15 de Agosto • 19:00" value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Preço</label>
                <input type="text" value={event.price} onChange={(e) => setEvent({ ...event, price: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Cidade</label>
                <select value={event.city} onChange={(e) => onCityChange(e.target.value)} className={inputClass}>
                  {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Local / venue</label>
                <input type="text" required placeholder="Hub de Inovação" value={event.venue} onChange={(e) => setEvent({ ...event, venue: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Latitude</label>
                <input type="number" step="any" value={event.lat} onChange={(e) => setEvent({ ...event, lat: parseFloat(e.target.value) })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Longitude</label>
                <input type="number" step="any" value={event.lng} onChange={(e) => setEvent({ ...event, lng: parseFloat(e.target.value) })} className={inputClass} />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">As coordenadas alimentam a ordenação por proximidade na home e nas páginas de tema.</p>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">URL da imagem</label>
              <input type="url" required value={event.imageUrl} onChange={(e) => setEvent({ ...event, imageUrl: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Descrição</label>
              <textarea rows={3} required value={event.description} onChange={(e) => setEvent({ ...event, description: e.target.value })} className={inputClass} />
            </div>
            <button type="submit" className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400">Salvar Evento</button>
          </form>
        )}

        {/* Integrações de APIs */}
        {activeTab === 'integrations' && <AdminIntegrations demo={authState === 'demo'} />}

        {/* Bom Dia */}
        {activeTab === 'bom-dia' && (
          <form onSubmit={handleSaveBomDia} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-bold text-white">Editar Curadoria do Módulo &quot;Bom Dia&quot;</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Título da trilha</label>
                <input type="text" required value={bomDia.soundtrackTitle} onChange={(e) => setBomDia({ ...bomDia, soundtrackTitle: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Artista / curador</label>
                <input type="text" required value={bomDia.soundtrackArtist} onChange={(e) => setBomDia({ ...bomDia, soundtrackArtist: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Título da receita</label>
              <input type="text" required value={bomDia.recipeTitle} onChange={(e) => setBomDia({ ...bomDia, recipeTitle: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Descrição da receita</label>
              <textarea rows={2} required value={bomDia.recipeDescription} onChange={(e) => setBomDia({ ...bomDia, recipeDescription: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Dica / hábito matinal</label>
              <input type="text" required value={bomDia.quickTip} onChange={(e) => setBomDia({ ...bomDia, quickTip: e.target.value })} className={inputClass} />
            </div>
            <button type="submit" className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400">Atualizar Curadoria</button>
          </form>
        )}
      </div>
    </div>
  );
}
