import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase-server';
import { CONTENTS, EVENTS } from '@/lib/data';
import { BOM_DIA_FALLBACK } from '@/lib/repo';

export const dynamic = 'force-dynamic';

// Popula o banco com o dataset semente (idempotente: só insere em tabelas vazias).
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // Prefere o service role (ignora RLS); cai para o cliente do admin logado.
  const sb = createAdminClient() ?? auth.sb;
  const result: Record<string, number | string> = {};

  // Conteúdos
  const { count: contentCount } = await sb.from('contents').select('*', { count: 'exact', head: true });
  if (!contentCount) {
    const rows = CONTENTS.map((c) => ({
      title: c.title, category: c.topic, subtopic: c.subtopic, snippet: c.snippet,
      body: c.body, read_time: c.readTime, image_url: c.imageUrl,
    }));
    const { error } = await sb.from('contents').insert(rows);
    result.contents = error ? `erro: ${error.message}` : rows.length;
  } else {
    result.contents = `já existiam (${contentCount})`;
  }

  // Eventos
  const { count: eventCount } = await sb.from('events').select('*', { count: 'exact', head: true });
  if (!eventCount) {
    const rows = EVENTS.map((e) => ({
      title: e.title, category: e.topic, event_date: e.date, city: e.city, location: e.venue,
      lat: e.coords.lat, lng: e.coords.lng, image_url: e.imageUrl, description: e.description, price: e.price,
    }));
    const { error } = await sb.from('events').insert(rows);
    result.events = error ? `erro: ${error.message}` : rows.length;
  } else {
    result.events = `já existiam (${eventCount})`;
  }

  // Bom Dia
  const { count: bomDiaCount } = await sb.from('bom_dia').select('*', { count: 'exact', head: true });
  if (!bomDiaCount) {
    const { error } = await sb.from('bom_dia').insert({
      soundtrack_title: BOM_DIA_FALLBACK.soundtrackTitle,
      soundtrack_artist: BOM_DIA_FALLBACK.soundtrackArtist,
      recipe_title: BOM_DIA_FALLBACK.recipeTitle,
      recipe_description: BOM_DIA_FALLBACK.recipeDescription,
      quick_tip: BOM_DIA_FALLBACK.quickTip,
    });
    result.bom_dia = error ? `erro: ${error.message}` : 1;
  } else {
    result.bom_dia = `já existia (${bomDiaCount})`;
  }

  return NextResponse.json({ ok: true, seeded: result });
}
