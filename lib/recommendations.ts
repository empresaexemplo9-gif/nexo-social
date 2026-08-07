// Motor de indicações automáticas do nexo-social.
//
// Não depende de curadoria manual: dado o perfil do usuário (temas que ele
// curte), a posição do aparelho e o catálogo disponível, o algoritmo pontua
// cada item e monta o feed. Funções puras — rodam no servidor (API) e no
// cliente (home) com o mesmo resultado.
//
// Pontuação de um evento = afinidade de tema + proximidade + urgência temporal
// + bônus de contexto (gratuito, tags que casam com subtemas seguidos).
// Ao final aplicamos diversificação para o feed não virar um tema só.

import {
  CITIES,
  TOPICS,
  getTopic,
  type CategorySlug,
  type ContentItem,
  type EventItem,
} from './data';
import { haversineKm, type LatLng } from './geo';
import { daysUntil, isHappeningNow, isUpcoming } from './datetime';
import { dailyJitter } from './rotation';

export interface ScoredEvent {
  event: EventItem;
  score: number;
  distanceKm: number | null;
  reasons: string[];
}

export interface ScoredContent {
  content: ContentItem;
  score: number;
  reasons: string[];
}

export interface RecommendationInput {
  interests: CategorySlug[];
  origin: LatLng | null;
  radiusKm: number;
  events: EventItem[];
  contents: ContentItem[];
  now?: Date;
}

// --- pesos do algoritmo (ajustáveis em um só lugar) ------------------------
const W = {
  interest: 55, // tema está entre os interesses do usuário
  interestNeutral: 12, // usuário ainda não escolheu interesses
  proximityMax: 40, // quanto vale estar colado no usuário
  timeNow: 35, // acontecendo agora
  timeToday: 30,
  timeSoon: 22, // até 3 dias
  timeWeek: 16, // até 7 dias
  timeMonth: 8, // até 30 dias
  free: 6,
  tagMatch: 8, // tag casa com subtema do tema seguido
  sameCity: 10,
  farPenalty: 45, // penaliza o que está fora do alcance real do usuário
  // Amplitude da rotação diária. Menor que qualquer critério de relevância
  // (tema, proximidade, urgência), então só desempata itens parecidos.
  dailyRotation: 7,
};

/**
 * Proximidade: bônus alto dentro do raio, decaimento nas cidades vizinhas e
 * PENALIDADE para o que está muito longe.
 *
 * A penalidade é essencial: sem ela, um evento do tema favorito do usuário a
 * 2.000 km ultrapassava um evento local — o oposto da proposta da plataforma.
 * Quem tem localização conhecida vê primeiro o que dá para frequentar.
 */
function proximityScore(distanceKm: number | null, radiusKm: number): number {
  if (distanceKm == null) return 0;
  const r = Math.max(radiusKm, 1);
  if (distanceKm <= r) return W.proximityMax * (1 - distanceKm / (r * 1.6));

  // Cidades vizinhas (até 4x o raio): ainda pontuam, decaindo rápido.
  const over = distanceKm - r;
  if (distanceKm <= r * 4) return Math.max(0, W.proximityMax * 0.35 * Math.exp(-over / (r * 1.5)));

  // Muito longe: penaliza para não competir com o que é local.
  const farRatio = Math.min(distanceKm / (r * 4), 6); // satura para não explodir
  return -W.farPenalty * (0.6 + 0.4 * Math.min(farRatio / 3, 1));
}

function timeScore(event: EventItem, now: Date): { score: number; reason?: string } {
  if (!event.startsAt) return { score: W.timeMonth / 2 };
  if (isHappeningNow(event.startsAt, event.endsAt, now)) {
    return { score: W.timeNow, reason: 'Acontecendo agora' };
  }
  const d = daysUntil(event.startsAt, now);
  if (d < 0) return { score: -1000 }; // já passou → fora do feed
  if (d === 0) return { score: W.timeToday, reason: 'É hoje' };
  if (d === 1) return { score: W.timeSoon, reason: 'É amanhã' };
  if (d <= 3) return { score: W.timeSoon, reason: `Em ${d} dias` };
  if (d <= 7) return { score: W.timeWeek, reason: 'Esta semana' };
  if (d <= 30) return { score: W.timeMonth, reason: 'Este mês' };
  return { score: 2 };
}

function tagAffinity(event: EventItem, interests: CategorySlug[]): number {
  if (!event.tags?.length) return 0;
  const subs = interests
    .map((slug) => getTopic(slug)?.subtopics ?? [])
    .flat()
    .map((s) => s.toLowerCase());
  if (!subs.length) return 0;
  const hit = event.tags.some((t) =>
    subs.some((s) => s.includes(t.toLowerCase()) || t.toLowerCase().includes(s)),
  );
  return hit ? W.tagMatch : 0;
}

/** Pontua e ordena eventos futuros (ou em andamento). */
export function scoreEvents(input: RecommendationInput): ScoredEvent[] {
  const { interests, origin, radiusKm, events } = input;
  const now = input.now ?? new Date();
  const userCity = origin ? nearestCityName(origin) : null;

  return events
    .filter((e) => !e.startsAt || isUpcoming(e.startsAt, e.endsAt, now))
    .map((event) => {
      const reasons: string[] = [];
      let score = 0;

      // 1) Afinidade de tema
      if (interests.length === 0) {
        score += W.interestNeutral;
      } else if (interests.includes(event.topic)) {
        score += W.interest;
        reasons.push(`Você curte ${getTopic(event.topic)?.label}`);
      }

      // 2) Proximidade
      const distanceKm = origin ? haversineKm(origin, event.coords) : null;
      if (distanceKm != null) {
        score += proximityScore(distanceKm, radiusKm);
        if (distanceKm <= radiusKm) {
          reasons.push(`A ${distanceKm < 1 ? 'menos de 1' : Math.round(distanceKm)} km de você`);
        } else if (distanceKm <= radiusKm * 4) {
          reasons.push(`Em ${event.city} — ${Math.round(distanceKm)} km`);
        } else {
          reasons.push(`Em ${event.city} (viagem)`);
        }
      }
      if (userCity && userCity === event.city) {
        score += W.sameCity;
      }

      // 3) Urgência temporal
      const t = timeScore(event, now);
      score += t.score;
      if (t.reason) reasons.unshift(t.reason);

      // 4) Contexto
      if (/gratuito|grátis|free/i.test(event.price)) {
        score += W.free;
        reasons.push('Entrada gratuita');
      }
      score += tagAffinity(event, interests);

      // 5) Rotação diária — gira a ordem entre itens de relevância parecida,
      // para o feed trazer indicações novas todo dia sem perder a pertinência.
      score += dailyJitter(event.id, W.dailyRotation);

      return { event, score, distanceKm, reasons: reasons.slice(0, 3) };
    })
    .filter((r) => r.score > -100)
    .sort((a, b) => b.score - a.score);
}

/** Pontua conteúdos editoriais pelos interesses do usuário. */
export function scoreContents(input: RecommendationInput): ScoredContent[] {
  const { interests, contents } = input;
  return contents
    .map((content) => {
      const reasons: string[] = [];
      let score = interests.length === 0 ? W.interestNeutral : 0;
      if (interests.includes(content.topic)) {
        score += W.interest;
        reasons.push(`Sobre ${getTopic(content.topic)?.label}`);
      }
      const subs = interests.map((s) => getTopic(s)?.subtopics ?? []).flat();
      if (content.subtopic && subs.includes(content.subtopic)) {
        score += W.tagMatch;
        reasons.push(content.subtopic);
      }
      if (/hoje/i.test(content.date)) {
        score += 6;
        reasons.push('Publicado hoje');
      }
      score += dailyJitter(content.id, W.dailyRotation);
      return { content, score, reasons: reasons.slice(0, 2) };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Diversifica: no máximo `maxPerTopic` itens seguidos do mesmo tema, para o
 * feed não ficar monotemático mesmo quando um tema domina a pontuação.
 */
export function diversify<T>(items: T[], topicOf: (item: T) => string, maxPerTopic = 2): T[] {
  const counts = new Map<string, number>();
  const primary: T[] = [];
  const overflow: T[] = [];
  for (const item of items) {
    const k = topicOf(item);
    const n = counts.get(k) ?? 0;
    if (n < maxPerTopic) {
      primary.push(item);
      counts.set(k, n + 1);
    } else {
      overflow.push(item);
    }
  }
  return [...primary, ...overflow];
}

export function nearestCityName(origin: LatLng): string {
  return [...CITIES].sort((a, b) => haversineKm(origin, a.coords) - haversineKm(origin, b.coords))[0].name;
}

export interface FeedSection {
  id: string;
  title: string;
  subtitle: string;
  events: ScoredEvent[];
}

/** Monta as seções do feed automático de eventos. */
export function buildFeed(input: RecommendationInput): {
  destaques: ScoredEvent[];
  sections: FeedSection[];
  contents: ScoredContent[];
} {
  const now = input.now ?? new Date();
  const scored = scoreEvents({ ...input, now });
  const { origin, radiusKm } = input;

  const agora = scored.filter(
    (s) => s.event.startsAt && (isHappeningNow(s.event.startsAt, s.event.endsAt, now) || daysUntil(s.event.startsAt, now) <= 1),
  );
  const semana = scored.filter((s) => {
    if (!s.event.startsAt) return false;
    const d = daysUntil(s.event.startsAt, now);
    return d > 1 && d <= 7;
  });
  const perto = origin ? scored.filter((s) => s.distanceKm != null && s.distanceKm <= radiusKm) : [];
  const vizinhas = origin
    ? scored.filter((s) => s.distanceKm != null && s.distanceKm > radiusKm && s.distanceKm <= radiusKm * 4)
    : [];

  const sections: FeedSection[] = [
    { id: 'agora', title: 'Acontecendo agora e hoje', subtitle: 'O que dá para fazer sem sair do lugar', events: agora },
    { id: 'perto', title: 'Perto de você', subtitle: `Dentro do seu raio de ${radiusKm} km`, events: diversify(perto, (s) => s.event.topic) },
    { id: 'semana', title: 'Esta semana', subtitle: 'Programe-se com antecedência', events: diversify(semana, (s) => s.event.topic) },
    { id: 'vizinhas', title: 'Nas cidades próximas', subtitle: 'Vale a viagem curta', events: diversify(vizinhas, (s) => s.event.city, 2) },
  ].filter((s) => s.events.length > 0);

  return {
    destaques: diversify(scored, (s) => s.event.topic).slice(0, 6),
    sections,
    contents: diversify(scoreContents(input), (s) => s.content.topic).slice(0, 8),
  };
}

/** Temas ordenados por afinidade — usado para sugerir novos assuntos. */
export function suggestedTopics(interests: CategorySlug[]) {
  return TOPICS.filter((t) => !interests.includes(t.slug));
}
