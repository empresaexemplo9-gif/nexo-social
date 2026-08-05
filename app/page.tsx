'use client';

import React, { useState } from 'react';

type Category = 'Todos' | 'Tecnologia' | 'Música' | 'Moda' | 'Cultura' | 'Esporte';

interface ContentItem {
  id: string;
  title: string;
  category: Category;
  snippet: string;
  readTime: string;
  imageUrl: string;
  date: string;
}

interface EventItem {
  id: string;
  title: string;
  category: Category;
  date: string;
  location: string;
  imageUrl: string;
  description: string;
}

const categories: Category[] = ['Todos', 'Tecnologia', 'Música', 'Moda', 'Cultura', 'Esporte'];

const mockContents: ContentItem[] = [
  {
    id: '1',
    title: 'A revolução dos frameworks leves na web moderna',
    category: 'Tecnologia',
    snippet: 'Como novas arquiteturas buscam máxima performance e menor consumo de recursos sem comprometer a experiência.',
    readTime: '4 min',
    date: 'Hoje',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'Minimalismo e utilitarismo na moda urbana',
    category: 'Moda',
    snippet: 'Análise estética dos cortes limpos, tecidos tecnológicos e funcionalidade na cena urbana contemporânea.',
    readTime: '5 min',
    date: 'Ontem',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '3',
    title: 'Sintetizadores analógicos e o resgate da textura sonora',
    category: 'Música',
    snippet: 'O movimento de produtores que preferem a calidez orgânica dos circuitos analógicos no estúdio digital.',
    readTime: '6 min',
    date: '02 Ago',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '4',
    title: 'Arquitetura bioclimática nas grandes metrópoles',
    category: 'Cultura',
    snippet: 'Como o design urbano está se adaptando às mudanças climáticas integrando vegetação nativa aos edifícios.',
    readTime: '5 min',
    date: '01 Ago',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
  },
];

const mockEvents: EventItem[] = [
  {
    id: 'e1',
    title: 'Encontro de Desenvolvimento Web & Inteligência Artificial',
    category: 'Tecnologia',
    date: '15 de Agosto • 19:00',
    location: 'Hub de Inovação Local',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    description: 'Painel de discussões com especialistas em engenharia de software, modelos de linguagem e ecossistema web.',
  },
  {
    id: 'e2',
    title: 'Mostra Cultural: Arte, Som & Design Digital',
    category: 'Cultura',
    date: '22 de Agosto • 16:00',
    location: 'Galeria de Arte do Centro',
    imageUrl: 'https://images.unsplash.com/photo-1508997449629-303059a039c0?auto=format&fit=crop&w=800&q=80',
    description: 'Exposição interativa reunindo artistas gerativos, instalações audiovisuais e design de experiência.',
  },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('Todos');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [subscribed, setSubscribed] = useState<boolean>(false);

  const filteredContents = selectedCategory === 'Todos'
    ? mockContents
    : mockContents.filter((item) => item.category === selectedCategory);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500 selection:text-zinc-950">
      {/* Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold tracking-tight text-white">
              nexo<span className="text-emerald-400">.social</span>
            </span>
            <span className="text-xs bg-zinc-800/80 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
              Agendrap
            </span>
          </div>
          <nav className="hidden md:flex space-x-8 text-sm text-zinc-400">
            <a href="#bom-dia" className="hover:text-emerald-400 transition">Bom Dia</a>
            <a href="#entretenimento" className="hover:text-emerald-400 transition">Entretenimento</a>
            <a href="#agenda" className="hover:text-emerald-400 transition">Agenda</a>
            <a href="#newsletter" className="hover:text-emerald-400 transition">Newsletter</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-emerald-950/40 border border-zinc-800 p-8 md:p-12">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs px-3 py-1 rounded-full font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Plataforma de Curadoria Premium
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight">
              Descoberta contínua em Esporte, Cultura, Moda e Tecnologia.
            </h1>
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed">
              Uma experiência sem distrações e ruídos de redes sociais. Conteúdos selecionados e agenda essencial para o seu dia.
            </p>
          </div>
        </section>

        {/* Módulo Bom Dia */}
        <section id="bom-dia" className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-zinc-800 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                ☀️ Módulo "Bom Dia"
              </h2>
              <p className="text-zinc-400 text-sm mt-1">Sua dose matinal de foco, trilhas e nutrição</p>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full w-fit">
              Curadoria de Hoje
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Trilha Matinal com Player */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">🎵 Trilha Matinal</span>
                <h3 className="text-lg font-semibold text-white mt-2">Lofi Vibes & Ambient Focus</h3>
                <p className="text-xs text-zinc-400 mt-1">Curadoria Agendrap • 45 min</p>
              </div>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="mt-6 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm py-2.5 px-4 rounded-xl transition"
              >
                {isPlaying ? '⏸️ Pausar Reprodução' : '▶️ Ouvir Trilha do Dia'}
              </button>
            </div>

            {/* Receita Rápida */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-xl">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">🥑 Nutrição Rápida</span>
              <h3 className="text-lg font-semibold text-white mt-2">Toast de Abacate com Ovos Pochê</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Pão de fermentação natural, abacate amassado com azeite extra virgem, pimenta preta e ovos pochê (10 min).
              </p>
            </div>

            {/* Dica de Foco */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-6 rounded-xl">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">💡 Hábito Matinal</span>
              <h3 className="text-lg font-semibold text-white mt-2">Primeiros 20 Minutos Sem Telas</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Troque a checagem imediata de notificações por leitura, hidratação ou caminhada ao ar livre.
              </p>
            </div>
          </div>
        </section>

        {/* Hub de Entretenimento */}
        <section id="entretenimento" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Hub de Entretenimento</h2>
              <p className="text-zinc-400 text-sm">Editorial independente e recomendações em destaque</p>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-zinc-950 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredContents.map((item) => (
              <article key={item.id} className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition flex flex-col justify-between">
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md text-emerald-400 text-xs px-2.5 py-1 rounded-lg border border-zinc-800 font-medium">
                      {item.category}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                      <span>{item.date}</span>
                      <span>{item.readTime}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white group-hover:text-emerald-400 transition leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                      {item.snippet}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Agenda Tecnológica & Cultural */}
        <section id="agenda" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Agenda Tecnológica & Cultural</h2>
            <p className="text-zinc-400 text-sm">Eventos e encontros selecionados na região</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockEvents.map((evt) => (
              <div key={evt.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col sm:flex-row">
                <img src={evt.imageUrl} alt={evt.title} className="w-full sm:w-48 h-48 object-cover" />
                <div className="p-5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                        {evt.date}
                      </span>
                      <span className="text-xs text-zinc-500">{evt.category}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white leading-snug">{evt.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1">📍 {evt.location}</p>
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{evt.description}</p>
                  </div>
                  <button className="mt-4 text-xs font-medium text-emerald-400 hover:text-emerald-300 self-start transition">
                    Ver Detalhes do Evento →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Captura de Newsletter */}
        <section id="newsletter" className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-emerald-950/30 border border-zinc-800 rounded-3xl p-8 md:p-12 text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-white">Receba a curadoria matinal por e-mail</h2>
          <p className="text-zinc-400 text-sm">
            Toda manhã, os melhores destaques de tecnologia, música, cultura e estilo diretamente na sua caixa de entrada.
          </p>
          {subscribed ? (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-400 p-4 rounded-xl text-sm font-medium">
              ✓ Inscrição realizada com sucesso! Você receberá nossa próxima edição.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 flex-1"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm px-6 py-2.5 rounded-xl transition"
              >
                Inscrever-se
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-600">
        nexo-social / Agendrap — Curadoria de Entretenimento Premium
      </footer>
    </div>
  );
}
