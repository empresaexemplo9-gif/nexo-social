import React from 'react';

export default function TechAgenda() {
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
