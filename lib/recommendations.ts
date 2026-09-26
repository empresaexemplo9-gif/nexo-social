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
import { rotateWithinTiers } from './rotation';

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
  exemplo: 60, // exemplo da casa (não é evento real)
  // Largura da faixa girada a cada dia. Menor que qualquer critério de
  // relevância (tema, proximidade, urgência), então a rotação só reordena
  // itens que já eram equivalentes entre si.
  rotationTier: 12,
};

/** Teto de itens do mesmo tema e da mesma cidade num bloco de sugestões. */
const MAX_PER_TOPIC = 2;
const MAX_PER_CITY = 3;

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

  const ranked = events
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

      // 5) Exemplo da casa fica atrás dos eventos reais parecidos.
      if (event.exemplo) {
        score -= W.exemplo;
        reasons.push('Exemplo — ainda sem evento real deste tema');
      }

      return { event, score, distanceKm, reasons: reasons.slice(0, 3) };
    })
    .filter((r) => r.score > -100)
    .sort((a, b) => b.score - a.score);

  // Rotação diária — gira a ordem entre itens de relevância parecida, para o
  // feed trazer indicações novas todo dia sem perder a pertinência.
  return rotateWithinTiers(ranked, (r) => r.score, W.rotationTier);
}

/** Pontua conteúdos editoriais pelos interesses do usuário. */
export function scoreContents(input: RecommendationInput): ScoredContent[] {
  const { interests, contents } = input;
  const ranked = contents
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
      return { content, score, reasons: reasons.slice(0, 2) };
    })
    .sort((a, b) => b.score - a.score);
  return rotateWithinTiers(ranked, (r) => r.score, W.rotationTier);
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

/**
 * Escolhe `n` sugestões variadas.
 *
 * Cortar direto o topo do ranking devolvia blocos monótonos — o mesmo tema na
 * mesma cidade repetido, porque tema e proximidade dominam a pontuação. Aqui o
 * teto por tema e por cidade vale ANTES do corte: quem excede vira reserva e só
 * entra se faltar item para completar o bloco.
 */
export function pickSuggestions(scored: ScoredEvent[], n: number): ScoredEvent[] {
  const porTema = new Map<string, number>();
  const porCidade = new Map<string, number>();
  const escolhidos: ScoredEvent[] = [];
  const reservas: ScoredEvent[] = [];

  for (const r of scored) {
    if (escolhidos.length >= n) break;
    const tema = porTema.get(r.event.topic) ?? 0;
    const cidade = porCidade.get(r.event.city) ?? 0;
    if (tema >= MAX_PER_TOPIC || cidade >= MAX_PER_CITY) {
      reservas.push(r);
      continue;
    }
    escolhidos.push(r);
    porTema.set(r.event.topic, tema + 1);
    porCidade.set(r.event.city, cidade + 1);
  }

  // Catálogo pequeno: completa com as reservas em vez de devolver menos.
  return [...escolhidos, ...reservas].slice(0, n);
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

  // Cada evento entra em UMA seção só. Antes os filtros eram independentes, e
  // um show hoje, perto e nesta semana aparecia três vezes na mesma resposta —
  // a maior fonte de "as indicações estão repetitivas". A ordem abaixo é a da
  // seção mais específica para a mais genérica.
  const usados = new Set<string>();
  const claim = (candidatos: ScoredEvent[]) => {
    const meus = candidatos.filter((s) => !usados.has(s.event.id));
    for (const s of meus) usados.add(s.event.id);
    return meus;
  };

  const agora = claim(
    scored.filter(
      (s) => s.event.startsAt && (isHappeningNow(s.event.startsAt, s.event.endsAt, now) || daysUntil(s.event.startsAt, now) <= 1),
    ),
  );
  const semana = claim(
    scored.filter((s) => {
      if (!s.event.startsAt) return false;
      const d = daysUntil(s.event.startsAt, now);
      return d > 1 && d <= 7;
    }),
  );
  const perto = origin ? claim(scored.filter((s) => s.distanceKm != null && s.distanceKm <= radiusKm)) : [];
  const vizinhas = origin
    ? claim(scored.filter((s) => s.distanceKm != null && s.distanceKm > radiusKm && s.distanceKm <= radiusKm * 4))
    : [];

  const sections: FeedSection[] = [
    { id: 'agora', title: 'Acontecendo agora e hoje', subtitle: 'O que dá para fazer sem sair do lugar', events: diversify(agora, (s) => s.event.topic) },
    { id: 'semana', title: 'Esta semana', subtitle: 'Programe-se com antecedência', events: diversify(semana, (s) => s.event.topic) },
    { id: 'perto', title: 'Perto de você', subtitle: `Dentro do seu raio de ${radiusKm} km`, events: diversify(perto, (s) => s.event.topic) },
    { id: 'vizinhas', title: 'Nas cidades próximas', subtitle: 'Vale a viagem curta', events: diversify(vizinhas, (s) => s.event.city, 2) },
  ].filter((s) => s.events.length > 0);

  return {
    destaques: pickSuggestions(scored, 6),
    sections,
    contents: diversify(scoreContents(input), (s) => s.content.topic).slice(0, 8),
  };
}

/** Temas ordenados por afinidade — usado para sugerir novos assuntos. */
export function suggestedTopics(interests: CategorySlug[]) {
  return TOPICS.filter((t) => !interests.includes(t.slug));
}
