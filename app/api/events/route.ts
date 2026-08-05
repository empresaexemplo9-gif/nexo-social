import { NextResponse } from 'next/server';
import { fetchEvents } from '@/lib/repo';
import { haversineKm } from '@/lib/geo';
import type { CategorySlug } from '@/lib/data';

// Lista pública de eventos, com ordenação por proximidade opcional (?lat=&lng=).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic') as CategorySlug | null;
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  const events = await fetchEvents(topic ?? undefined);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const origin = { lat, lng };
    const withDistance = events
      .map((e) => ({ ...e, distanceKm: haversineKm(origin, e.coords) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return NextResponse.json({ events: withDistance });
  }

  return NextResponse.json({ events });
}
