import { NextResponse } from 'next/server';
import { fetchEvents } from '@/lib/repo';
import { eventosReaisPerto } from '@/lib/eventos-reais';
import { haversineKm } from '@/lib/geo';
import { getTopic, type CategorySlug } from '@/lib/data';

// Lista pública de eventos, com ordenação por proximidade opcional (?lat=&lng=).
// Com `perto=1` e um tema, devolve só os eventos reais num raio de 200 km.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topicParam = searchParams.get('topic');
  const topic = topicParam && getTopic(topicParam) ? (topicParam as CategorySlug) : null;
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const temPonto = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  if (searchParams.get('perto') === '1') {
    if (!topic || !temPonto) return NextResponse.json({ error: 'Informe topic, lat e lng.' }, { status: 400 });
    const events = await eventosReaisPerto(topic, { lat, lng });
    return NextResponse.json(
      { events: events.map((e) => ({ ...e, distanceKm: haversineKm({ lat, lng }, e.coords) })).sort((a, b) => a.distanceKm - b.distanceKm) },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=10800' } },
    );
  }

  const events = await fetchEvents(topic ?? undefined);

  if (temPonto) {
    const origin = { lat, lng };
    const withDistance = events
      .map((e) => ({ ...e, distanceKm: haversineKm(origin, e.coords) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return NextResponse.json({ events: withDistance });
  }

  return NextResponse.json({ events });
}
