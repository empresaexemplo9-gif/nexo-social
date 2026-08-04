import React from 'react';

export default function BomDiaModule() {
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
