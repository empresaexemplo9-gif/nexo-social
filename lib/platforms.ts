// Links profundos para plataformas externas de música, vídeo e ingressos.
//
// Não usamos APIs com chave: montamos URLs de BUSCA das próprias plataformas a
// partir do contexto (título, artista, cidade, tema). Isso funciona sem
// credenciais, sem custo e sem depender de aprovação de parceria — e leva o
// usuário direto para o resultado relevante.

import type { EventItem, Topic, CategorySlug } from './data';
import type { IconName } from '@/components/icons';

export type PlatformKind = 'musica' | 'video' | 'ingresso';

export interface PlatformLink {
  label: string;
  url: string;
  kind: PlatformKind;
  /** Chave do ícone SVG — sem emoji. */
  icon: IconName;
}

const q = (s: string) => encodeURIComponent(s.trim());

/** Consulta de música/vídeo para um evento (usa o artista quando existir). */
function mediaQuery(event: EventItem): string {
  return event.artist && !/vários|residentes/i.test(event.artist)
    ? event.artist
    : [event.title, event.tags?.[0]].filter(Boolean).join(' ');
}

/** Plataformas de ingresso/divulgação — busca pelo evento na cidade. */
export function ticketLinks(event: EventItem): PlatformLink[] {
  const term = `${event.title} ${event.city}`;
  return [
    { kind: 'ingresso', icon: 'ticket', label: 'Sympla', url: `https://www.sympla.com.br/eventos?s=${q(term)}` },
    { kind: 'ingresso', icon: 'ticket', label: 'Eventbrite', url: `https://www.eventbrite.com.br/d/brazil/${q(event.city)}/?q=${q(event.title)}` },
    { kind: 'ingresso', icon: 'ticket', label: 'Ticketmaster', url: `https://www.ticketmaster.com.br/search?q=${q(term)}` },
    { kind: 'ingresso', icon: 'mapPin', label: 'Bandsintown', url: `https://www.bandsintown.com/search?query=${q(event.artist || event.city)}` },
  ];
}

/** Música e vídeo relacionados ao evento. */
export function mediaLinks(event: EventItem): PlatformLink[] {
  const term = mediaQuery(event);
  return [
    { kind: 'musica', icon: 'headphones', label: 'Spotify', url: `https://open.spotify.com/search/${q(term)}` },
    { kind: 'musica', icon: 'music', label: 'YouTube Music', url: `https://music.youtube.com/search?q=${q(term)}` },
    { kind: 'musica', icon: 'music', label: 'Deezer', url: `https://www.deezer.com/search/${q(term)}` },
    { kind: 'video', icon: 'video', label: 'YouTube', url: `https://www.youtube.com/results?search_query=${q(term)}` },
  ];
}

/** Todos os links de um evento, na ordem mais útil. */
export function eventPlatformLinks(event: EventItem): PlatformLink[] {
  const links = [...ticketLinks(event)];
  // Música e vídeo fazem mais sentido para shows/festivais e cultura.
  if (event.topic === 'musica' || event.topic === 'cultura') links.push(...mediaLinks(event));
  else links.push(mediaLinks(event)[3]); // ao menos o vídeo
  return links;
}

/** Descoberta por tema — usada nas páginas de assunto. */
export function topicPlatformLinks(topic: Topic, city?: string | null): PlatformLink[] {
  const base = topic.label;
  const withCity = city ? `${base} ${city}` : base;
  const links: PlatformLink[] = [
    { kind: 'ingresso', icon: 'ticket', label: `Eventos de ${base} no Sympla`, url: `https://www.sympla.com.br/eventos?s=${q(withCity)}` },
    { kind: 'video', icon: 'video', label: `${base} no YouTube`, url: `https://www.youtube.com/results?search_query=${q(base)}` },
  ];
  if (topic.slug === 'musica') {
    links.push({ kind: 'musica', icon: 'headphones', label: 'Playlists no Spotify', url: `https://open.spotify.com/search/${q(base)}` });
  }
  return links;
}

/** Rótulo humano para o tipo de plataforma. */
export const KIND_LABEL: Record<PlatformKind, string> = {
  musica: 'Ouvir',
  video: 'Assistir',
  ingresso: 'Ingressos',
};

/** Busca de ingressos por cidade (quando não há evento específico). */
export function cityTicketSearch(city: string, topic?: CategorySlug): string {
  const term = topic ? `${topic} ${city}` : city;
  return `https://www.sympla.com.br/eventos?s=${q(term)}`;
}
