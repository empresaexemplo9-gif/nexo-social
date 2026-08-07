// Busca dentro da plataforma.
//
// Varre tudo o que a nexo.social já tem — temas, matérias, eventos, marcos
// históricos, craques, gêneros e hobbies — sem depender de API nenhuma. A busca
// no YouTube é um complemento opcional, feito à parte.
//
// Comparação sem acento e sem caixa: quem digita "musica" precisa achar
// "Música", e quem digita "PELE" precisa achar "Pelé".

import { CONTENTS, EVENTS, TOPICS, getTopic, type CategorySlug, type ContentItem, type EventItem } from './data';
import { HERITAGE } from './heritage';
import { LEGENDS } from './sports-media';
import { BOOK_GENRES, FILM_GENRES, HOBBIES, MUSIC_GENRES } from './taxonomy';

export type ResultKind = 'tema' | 'materia' | 'evento' | 'marco' | 'craque' | 'genero';

export interface SearchResult {
  id: string;
  kind: ResultKind;
  titulo: string;
  descricao: string;
  href: string;
  /** Tema ao qual pertence, para colorir e filtrar. */
  topic?: CategorySlug;
  score: number;
}

/** Remove acentos e caixa — a comparação precisa ser tolerante. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const RÓTULO: Record<ResultKind, string> = {
  tema: 'Tema',
  materia: 'Matéria',
  evento: 'Evento',
  marco: 'Marco histórico',
  craque: 'Craque',
  genero: 'Gênero',
};

export function rotuloDoTipo(k: ResultKind): string {
  return RÓTULO[k];
}

/**
 * Pontua a ocorrência do termo num campo.
 * Título vale mais que descrição; começo da palavra vale mais que meio dela.
 */
function pontuar(campo: string, termos: string[], peso: number): number {
  const alvo = normalizar(campo);
  let total = 0;
  for (const t of termos) {
    if (!alvo.includes(t)) continue;
    total += peso;
    // Começo de palavra: "mac" acha "Macintosh" com prioridade sobre "estômago".
    if (new RegExp(`(^|\\s)${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(alvo)) total += peso * 0.6;
    if (alvo === t) total += peso; // acerto exato
  }
  return total;
}

export function buscar(consulta: string, limite = 30): SearchResult[] {
  const termos = normalizar(consulta).split(/\s+/).filter((t) => t.length >= 2);
  if (!termos.length) return [];

  const out: SearchResult[] = [];

  /**
   * `texto` é tudo o que o item tem de pesquisável. Serve para medir a
   * COBERTURA: numa consulta de várias palavras, quem casa com todas fica à
   * frente de quem casa com uma só. Sem isso, "bossa nova" trazia qualquer
   * coisa que contivesse "nova".
   */
  const add = (r: Omit<SearchResult, 'score'>, score: number, texto: string) => {
    if (score <= 0) return;
    if (termos.length > 1) {
      const alvo = normalizar(texto);
      const casados = termos.filter((t) => alvo.includes(t)).length;
      const cobertura = casados / termos.length;
      score *= 0.35 + 0.65 * cobertura;
    }
    out.push({ ...r, score });
  };

  // Temas — o resultado mais útil quando o termo é largo ("musica").
  for (const t of TOPICS) {
    const s =
      pontuar(t.label, termos, 12) +
      pontuar(t.tagline, termos, 4) +
      pontuar(t.description, termos, 3) +
      pontuar(t.subtopics.join(' '), termos, 5);
    add(
      { id: `tema-${t.slug}`, kind: 'tema', titulo: t.label, descricao: t.tagline, href: `/tema/${t.slug}`, topic: t.slug },
      s,
      `${t.label} ${t.tagline} ${t.description} ${t.subtopics.join(' ')}`,
    );
  }

  // Matérias.
  for (const c of CONTENTS as ContentItem[]) {
    const s = pontuar(c.title, termos, 10) + pontuar(c.snippet, termos, 4) + pontuar(c.subtopic ?? '', termos, 4);
    add(
      {
        id: `materia-${c.id}`,
        kind: 'materia',
        titulo: c.title,
        descricao: c.snippet,
        href: `/tema/${c.topic}#${c.id}`,
        topic: c.topic,
      },
      s,
      `${c.title} ${c.snippet} ${c.subtopic ?? ''}`,
    );
  }

  // Eventos.
  for (const e of EVENTS as EventItem[]) {
    const s =
      pontuar(e.title, termos, 10) +
      pontuar(e.city, termos, 6) +
      pontuar(e.venue ?? '', termos, 4) +
      pontuar((e.tags ?? []).join(' '), termos, 4);
    add(
      {
        id: `evento-${e.id}`,
        kind: 'evento',
        titulo: e.title,
        descricao: `${e.city} · ${e.date}`,
        href: `/evento/${e.id}`,
        topic: e.topic,
      },
      s,
      `${e.title} ${e.city} ${e.venue ?? ''} ${(e.tags ?? []).join(' ')}`,
    );
  }

  // Marcos históricos.
  for (const h of HERITAGE) {
    const s = pontuar(h.nome, termos, 10) + pontuar(h.nota, termos, 4) + pontuar(h.epoca, termos, 3);
    add(
      {
        id: `marco-${h.id}`,
        kind: 'marco',
        titulo: h.nome,
        descricao: `${h.epoca} · ${h.nota}`,
        href: `/tema/${h.topic}`,
        topic: h.topic,
      },
      s,
      `${h.nome} ${h.nota} ${h.epoca}`,
    );
  }

  // Craques.
  for (const l of LEGENDS) {
    const s = pontuar(l.name, termos, 10) + pontuar(l.teams, termos, 5) + pontuar(l.note, termos, 3);
    add(
      { id: `craque-${l.id}`, kind: 'craque', titulo: l.name, descricao: `${l.era} · ${l.teams}`, href: '/esporte', topic: 'esporte' },
      s,
      `${l.name} ${l.teams} ${l.note}`,
    );
  }

  // Gêneros e hobbies — levam ao questionário, onde viram preferência.
  const catalogos: [{ id: string; label: string }[], string][] = [
    [MUSIC_GENRES, 'Música'],
    [FILM_GENRES, 'Cinema'],
    [BOOK_GENRES, 'Livros'],
    [HOBBIES, 'Hobby'],
  ];
  for (const [lista, area] of catalogos) {
    for (const g of lista) {
      add(
        { id: `genero-${area}-${g.id}`, kind: 'genero', titulo: g.label, descricao: area, href: '/questionario' },
        pontuar(g.label, termos, 8),
        `${g.label} ${area}`,
      );
    }
  }

  // Ordena por pontuação e limita, evitando repetir o mesmo título.
  const vistos = new Set<string>();
  return out
    .sort((a, b) => b.score - a.score)
    .filter((r) => {
      const chave = `${r.kind}:${normalizar(r.titulo)}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .slice(0, limite);
}

/** Sugestões quando a busca está vazia — mostra o que dá para procurar. */
export function sugestoes(): string[] {
  return ['Pelé', 'Tropicália', 'MPB', 'Bossa Nova', 'Cinema Novo', 'Apollo 11', 'Machado de Assis', 'vôlei'];
}
