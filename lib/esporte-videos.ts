import 'server-only';

// Vídeos do esporte que funcionam sem chave do YouTube: quem está transmitindo
// agora entre os canais oficiais gratuitos da modalidade, e os melhores
// momentos mais recentes publicados por eles.

import { broadcastersOf } from './sports-media';
import type { SportId } from './sports';
import { aoVivoDoCanal, canalPorHandle, videosDoCanal } from './youtube-aberto';

export interface TransmissaoAoVivo {
  id: string;
  titulo: string;
  canal: string;
  handle: string;
}

export interface Destaque {
  id: string;
  titulo: string;
  canal: string;
  publicado: string | null;
  capa: string;
}

/** Título de melhores momentos, gols, resumo… em português, inglês e espanhol. */
const DESTAQUE =
  /(melhores momentos|highlights?|resumo|resumen|gols|golaço|goals?|golazo|lances|jogadas|pontos|best (plays|points|moments|goals)|top \d+|extended|recap|race|corrida)/i;

export async function videosDoEsporte(sport: SportId): Promise<{ aoVivo: TransmissaoAoVivo[]; destaques: Destaque[] }> {
  const canais = broadcastersOf(sport)
    .filter((b) => b.youtube)
    .slice(0, 10);

  const [aoVivo, porCanal] = await Promise.all([
    Promise.all(
      canais.map(async (b) => {
        const v = await aoVivoDoCanal(b.youtube!);
        return v ? { id: v.id, titulo: v.titulo, canal: b.label, handle: b.youtube! } : null;
      }),
    ),
    Promise.all(
      canais.map(async (b) => {
        const id = await canalPorHandle(b.youtube!);
        if (!id) return { destaques: [] as Destaque[], outros: [] as Destaque[] };
        const videos = await videosDoCanal(id, 'longos', 1800);
        const comoDestaque = (v: (typeof videos)[number]): Destaque => ({
          id: v.id,
          titulo: v.titulo,
          canal: v.canal || b.label,
          publicado: v.publicado,
          capa: v.capa,
        });
        return {
          destaques: videos.filter((v) => DESTAQUE.test(v.titulo)).slice(0, 6).map(comoDestaque),
          outros: videos.filter((v) => !DESTAQUE.test(v.titulo)).slice(0, 2).map(comoDestaque),
        };
      }),
    ),
  ]);

  const recentes = (a: Destaque, b: Destaque) => (b.publicado ?? '').localeCompare(a.publicado ?? '');
  let destaques = porCanal.flatMap((c) => c.destaques).sort(recentes);
  // Poucos com cara de melhores momentos: completa com os vídeos recentes dos
  // mesmos canais oficiais.
  if (destaques.length < 6) destaques = [...destaques, ...porCanal.flatMap((c) => c.outros).sort(recentes)];

  return {
    aoVivo: aoVivo.filter((v): v is TransmissaoAoVivo => Boolean(v)),
    destaques: destaques.slice(0, 16),
  };
}
