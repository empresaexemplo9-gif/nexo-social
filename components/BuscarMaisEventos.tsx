'use client';

import React from 'react';
import Icon from './icons';
import { usePreferences } from '@/lib/preferences';

const q = (s: string) => encodeURIComponent(s.trim());

/**
 * Mais eventos do tema fora da agenda: a busca pronta nas bilheterias e no
 * buscador de eventos do Google, já com a cidade do perfil.
 */
export default function BuscarMaisEventos({ tema }: { tema: string }) {
  const { prefs } = usePreferences();
  const cidade = prefs.city?.trim() || '';
  const termo = `${tema}${cidade ? ` ${cidade}` : ''}`;
  const links = [
    { rotulo: 'Google Eventos', url: `https://www.google.com/search?q=${q(`eventos de ${tema}${cidade ? ` em ${cidade}` : ''}`)}&ibp=htl;events` },
    { rotulo: 'Sympla', url: `https://www.sympla.com.br/eventos?s=${q(termo)}` },
    { rotulo: 'Eventim', url: `https://www.eventim.com.br/search/?affiliate=BR1&searchterm=${q(tema)}` },
    { rotulo: 'Ticketmaster', url: `https://www.ticketmaster.com.br/search?q=${q(tema)}` },
    { rotulo: 'Eventbrite', url: `https://www.eventbrite.com.br/d/brazil${cidade ? `--${q(cidade.toLowerCase().replace(/\s+/g, '-'))}` : ''}/${q(tema.toLowerCase())}/` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 p-4">
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
        <Icon name="search" size={14} /> Procurar mais eventos de {tema}
        {cidade ? ` em ${cidade}` : ''}:
      </span>
      {links.map((l) => (
        <a
          key={l.rotulo}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-clay-500 hover:text-clay-400"
        >
          {l.rotulo} <Icon name="external" size={11} />
        </a>
      ))}
    </div>
  );
}
