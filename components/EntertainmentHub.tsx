import React from 'react';

export default function EntertainmentHub() {
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
