import React from 'react';

export default function Navbar() {
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
