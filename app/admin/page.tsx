'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'content' | 'event' | 'bom-dia'>('content');
  const [message, setMessage] = useState<string>('');

  // Estados dos Formulários
  const [content, setContent] = useState({ title: '', category: 'Tecnologia', snippet: '', readTime: '5 min', imageUrl: '' });
  const [event, setEvent] = useState({ title: '', category: 'Tecnologia', date: '', location: '', imageUrl: '', description: '' });
  const [bomDia, setBomDia] = useState({ soundtrackTitle: '', soundtrackArtist: '', recipeTitle: '', recipeDescription: '', quickTip: '' });

  const handleSaveContent = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('✓ Conteúdo salvo com sucesso no Hub!');
    setContent({ title: '', category: 'Tecnologia', snippet: '', readTime: '5 min', imageUrl: '' });
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('✓ Evento salvo com sucesso na Agenda!');
    setEvent({ title: '', category: 'Tecnologia', date: '', location: '', imageUrl: '', description: '' });
  };

  const handleSaveBomDia = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('✓ Curadoria "Bom Dia" atualizada com sucesso!');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Painel do Administrador</h1>
            <p className="text-zinc-400 text-sm">Gestão e publicação de conteúdos do nexo-social</p>
          </div>
          <Link href="/" className="text-xs text-emerald-400 hover:underline">
            ← Voltar para a Home
          </Link>
        </div>

        {message && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 p-4 rounded-xl text-sm font-medium">
            {message}
          </div>
        )}

        {/* Abas */}
        <div className="flex space-x-2 border-b border-zinc-800 pb-4">
          <button
            onClick={() => { setActiveTab('content'); setMessage(''); }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'content' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            + Novo Conteúdo (Hub)
          </button>
          <button
            onClick={() => { setActiveTab('event'); setMessage(''); }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'event' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            + Novo Evento (Agenda)
          </button>
          <button
            onClick={() => { setActiveTab('bom-dia'); setMessage(''); }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'bom-dia' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:text-white'
            }`}
          >
            ☀️ Editar "Bom Dia"
          </button>
        </div>

        {/* Form: Novo Conteúdo */}
        {activeTab === 'content' && (
          <form onSubmit={handleSaveContent} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Cadastrar Conteúdo no Hub</h2>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Título do Artigo</label>
              <input
                type="text" required value={content.title} onChange={e => setContent({ ...content, title: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Categoria</label>
                <select
                  value={content.category} onChange={e => setContent({ ...content, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option>Tecnologia</option><option>Música</option><option>Moda</option><option>Cultura</option><option>Esporte</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Tempo de Leitura</label>
                <input
                  type="text" value={content.readTime} onChange={e => setContent({ ...content, readTime: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">URL da Imagem</label>
              <input
                type="url" required value={content.imageUrl} onChange={e => setContent({ ...content, imageUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Resumo/Trecho</label>
              <textarea
                rows={3} required value={content.snippet} onChange={e => setContent({ ...content, snippet: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button type="submit" className="bg-emerald-500 text-zinc-950 font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-emerald-400 transition">
              Publicar no Hub
            </button>
          </form>
        )}

        {/* Form: Novo Evento */}
        {activeTab === 'event' && (
          <form onSubmit={handleSaveEvent} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Cadastrar Evento na Agenda</h2>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Nome do Evento</label>
              <input
                type="text" required value={event.title} onChange={e => setEvent({ ...event, title: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Data & Horário</label>
                <input
                  type="text" required placeholder="15 de Agosto • 19:00" value={event.date} onChange={e => setEvent({ ...event, date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Local</label>
                <input
                  type="text" required placeholder="Hub de Inovação Local" value={event.location} onChange={e => setEvent({ ...event, location: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">URL da Imagem</label>
              <input
                type="url" required value={event.imageUrl} onChange={e => setEvent({ ...event, imageUrl: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Descrição do Evento</label>
              <textarea
                rows={3} required value={event.description} onChange={e => setEvent({ ...event, description: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button type="submit" className="bg-emerald-500 text-zinc-950 font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-emerald-400 transition">
              Salvar Evento
            </button>
          </form>
        )}

        {/* Form: Editar Bom Dia */}
        {activeTab === 'bom-dia' && (
          <form onSubmit={handleSaveBomDia} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Editar Curadoria do Módulo "Bom Dia"</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Título da Trilha Sonora</label>
                <input
                  type="text" required value={bomDia.soundtrackTitle} onChange={e => setBomDia({ ...bomDia, soundtrackTitle: e.target.value })}
                  placeholder="Lofi Vibes & Ambient Focus"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Artista/Curador</label>
                <input
                  type="text" required value={bomDia.soundtrackArtist} onChange={e => setBomDia({ ...bomDia, soundtrackArtist: e.target.value })}
                  placeholder="Curadoria Agendrap"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Título da Receita Rápida</label>
              <input
                type="text" required value={bomDia.recipeTitle} onChange={e => setBomDia({ ...bomDia, recipeTitle: e.target.value })}
                placeholder="Toast de Abacate com Ovos Pochê"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Descrição da Receita</label>
              <textarea
                rows={2} required value={bomDia.recipeDescription} onChange={e => setBomDia({ ...bomDia, recipeDescription: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Dica/Hábito Matinal</label>
              <input
                type="text" required value={bomDia.quickTip} onChange={e => setBomDia({ ...bomDia, quickTip: e.target.value })}
                placeholder="Dedique os primeiros 20 minutos do dia sem notificações."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button type="submit" className="bg-emerald-500 text-zinc-950 font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-emerald-400 transition">
              Atualizar Curadoria Matinal
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
