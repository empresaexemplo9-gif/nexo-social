import 'server-only';
import { createAnonServerClient } from './supabase-server';
import {
  CONTENTS,
  EVENTS,
  contentsByTopic,
  eventsByTopic,
  getContent,
  getEvent,
  type CategorySlug,
  type ContentItem,
  type EventItem,
} from './data';

// Curadoria "Bom Dia" (formato consumido pela UI).
export interface BomDiaData {
  soundtrackTitle: string;
  soundtrackArtist: string;
  recipeTitle: string;
  recipeDescription: string;
  quickTip: string;
}

export const BOM_DIA_FALLBACK: BomDiaData = {
  soundtrackTitle: 'Lofi Vibes & Ambient Focus',
  soundtrackArtist: 'Curadoria Agendrap',
  recipeTitle: 'Toast de Abacate com Ovos Pochê',
  recipeDescription:
    'Pão de fermentação natural, abacate amassado com azeite extra virgem, pimenta preta e ovos pochê (10 min).',
  quickTip: 'Dedique os primeiros 20 minutos do dia sem telas: leia, hidrate-se ou caminhe.',
};

function formatDate(iso?: string | null): string {
  if (!iso) return 'Recente';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Recente';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapContent(row: any): ContentItem {
  return {
    id: row.id,
    topic: row.category as CategorySlug,
    subtopic: row.subtopic ?? '',
    title: row.title,
    snippet: row.snippet ?? '',
    body: row.body ?? row.snippet ?? '',
    readTime: row.read_time ?? '5 min',
    date: formatDate(row.created_at),
    imageUrl: row.image_url,
  };
}

function mapEvent(row: any): EventItem {
  return {
    id: row.id,
    topic: row.category as CategorySlug,
    title: row.title,
    date: row.event_date,
    city: row.city ?? '',
    venue: row.location,
    coords: { lat: Number(row.lat) || 0, lng: Number(row.lng) || 0 },
    imageUrl: row.image_url,
    description: row.description,
    price: row.price ?? 'Gratuito',
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Conteúdos
// ---------------------------------------------------------------------------
export async function fetchContents(topic?: CategorySlug): Promise<ContentItem[]> {
  const sb = createAnonServerClient();
  const fallback = topic ? contentsByTopic(topic) : CONTENTS;
  if (!sb) return fallback;

  let query = sb.from('contents').select('*').order('created_at', { ascending: false });
  if (topic) query = query.eq('category', topic);

  const { data, error } = await query;
  if (error || !data || data.length === 0) return fallback;
  return data.map(mapContent);
}

export async function fetchContentById(id: string): Promise<ContentItem | null> {
  const sb = createAnonServerClient();
  if (!sb) return getContent(id) ?? null;
  const { data, error } = await sb.from('contents').select('*').eq('id', id).maybeSingle();
  if (error || !data) return getContent(id) ?? null;
  return mapContent(data);
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
export async function fetchEvents(topic?: CategorySlug): Promise<EventItem[]> {
  const sb = createAnonServerClient();
  const fallback = topic ? eventsByTopic(topic) : EVENTS;
  if (!sb) return fallback;

  let query = sb.from('events').select('*').order('created_at', { ascending: false });
  if (topic) query = query.eq('category', topic);

  const { data, error } = await query;
  if (error || !data || data.length === 0) return fallback;
  return data.map(mapEvent);
}

export async function fetchEventById(id: string): Promise<EventItem | null> {
  const sb = createAnonServerClient();
  if (!sb) return getEvent(id) ?? null;
  const { data, error } = await sb.from('events').select('*').eq('id', id).maybeSingle();
  if (error || !data) return getEvent(id) ?? null;
  return mapEvent(data);
}

// ---------------------------------------------------------------------------
// Bom Dia
// ---------------------------------------------------------------------------
export async function fetchBomDia(): Promise<BomDiaData> {
  const sb = createAnonServerClient();
  if (!sb) return BOM_DIA_FALLBACK;
  const { data, error } = await sb
    .from('bom_dia')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return BOM_DIA_FALLBACK;
  return {
    soundtrackTitle: data.soundtrack_title,
    soundtrackArtist: data.soundtrack_artist,
    recipeTitle: data.recipe_title,
    recipeDescription: data.recipe_description,
    quickTip: data.quick_tip,
  };
}
