import React from 'react';

function Navbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold tracking-tight text-white">
            nexo<span className="text-emerald-400">.social</span>
          </span>
          <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
            Agendrap
          </span>
        </div>
        <nav className="flex space-x-6 text-sm text-zinc-400">
          <a href="#bom-dia" className="hover:text-white transition">Bom Dia</a>
          <a href="#entretenimento" className="hover:text-white transition">Entretenimento</a>
          <a href="#agenda" className="hover:text-white transition">Agenda</a>
        </nav>
      </div>
    </header>
  );
}

function BomDiaModule() {
  return (
    <section id="bom-dia" className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-white">☀️ Módulo "Bom Dia"</h2>
        <span className="text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-3 py-1 rounded-full">
          Curadoria Matinal
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-xl">
          <div className="text-xs font-semibold text-emerald-400 uppercase mb-2">🎵 Trilha Matinal</div>
          <h3 className="text-lg font-medium text-white">Lofi Vibes & Ambient Focus</h3>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-xl">
          <div className="text-xs font-semibold text-amber-400 uppercase mb-2">🥑 Sugestão de Receita</div>
          <h3 className="text-lg font-medium text-white">Toast de Abacate com Ovos Pochê</h3>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-xl">
          <div className="text-xs font-semibold text-indigo-400 uppercase mb-2">💡 Foco & Hábito</div>
          <p className="text-sm text-zinc-300">Dedique os primeiros 20 minutos do dia sem notificações.</p>
        </div>
      </div>
    </section>
  );
}

function EntertainmentHub() {
  return (
    <section id="entretenimento">
      <h2 className="text-2xl font-semibold text-white mb-6">Hub de Entretenimento</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <article className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-emerald-400">Tecnologia</span>
          <h3 className="text-lg font-medium text-white mt-2">A nova onda dos frameworks leves no ecossistema Web</h3>
        </article>
        <article className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-emerald-400">Moda</span>
          <h3 className="text-lg font-medium text-white mt-2">Minimalismo e utilitarismo na moda urbana</h3>
        </article>
        <article className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs font-semibold text-emerald-400">Música</span>
          <h3 className="text-lg font-medium text-white mt-2">Evolução dos sintetizadores analógicos</h3>
        </article>
      </div>
    </section>
  );
}

function TechAgenda() {
  return (
    <section id="agenda">
      <h2 className="text-2xl font-semibold text-white mb-6">Agenda Tecnológica & Cultural</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs text-emerald-400 font-mono">15 de Agosto • 19:00</span>
          <h3 className="text-lg font-medium text-white mt-1">Encontro de Desenvolvimento Web & IA</h3>
          <p className="text-xs text-zinc-500 mt-1">📍 Hub de Inovação Local</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <span className="text-xs text-emerald-400 font-mono">22 de Agosto • 16:00</span>
          <h3 className="text-lg font-medium text-white mt-1">Exposição Arte, Som & Design Digital</h3>
          <p className="text-xs text-zinc-500 mt-1">📍 Galeria Cultural do Centro</p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <BomDiaModule />
        <EntertainmentHub />
        <TechAgenda />
      </main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-600">
        nexo-social / Agendrap — Curadoria de Entretenimento Premium
      </footer>
    </div>
  );
}
