import { NextResponse } from 'next/server';
import { fetchContents, fetchEvents } from '@/lib/repo';
import { buildFeed } from '@/lib/recommendations';
import { eventPlatformLinks } from '@/lib/platforms';
import { citiesWithin, type CategorySlug } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Indicações automáticas — sem intervenção do administrador.
 *
 * GET /api/recommendations?lat=&lng=&interests=musica,esporte&radius=50
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radiusKm = Number(searchParams.get('radius')) || 50;
  const interests = (searchParams.get('interests') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as CategorySlug[];

  const origin = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  const [events, contents] = await Promise.all([fetchEvents(), fetchContents()]);

  const feed = buildFeed({ interests, origin, radiusKm, events, contents });

  const shape = (r: (typeof feed.destaques)[number]) => ({
    id: r.event.id,
    title: r.event.title,
    topic: r.event.topic,
    city: r.event.city,
    venue: r.event.venue,
    startsAt: r.event.startsAt,
    price: r.event.price,
    score: Math.round(r.score),
    distanceKm: r.distanceKm != null ? Number(r.distanceKm.toFixed(1)) : null,
    reasons: r.reasons,
    url: `/evento/${r.event.id}`,
    platforms: eventPlatformLinks(r.event),
  });

  return NextResponse.json({
    origin,
    radiusKm,
    interests,
    destaques: feed.destaques.map(shape),
    sections: feed.sections.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      events: s.events.slice(0, 8).map(shape),
    })),
    cidadesProximas: citiesWithin(origin, radiusKm * 4)
      .slice(0, 10)
      .map((c) => ({ name: c.name, distanceKm: Number(c.distanceKm.toFixed(1)) })),
    conteudos: feed.contents.slice(0, 8).map((r) => ({
      id: r.content.id,
      title: r.content.title,
      topic: r.content.topic,
      url: `/tema/${r.content.topic}#${r.content.id}`,
      reasons: r.reasons,
    })),
  });
}
