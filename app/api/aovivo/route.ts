import { NextResponse } from 'next/server';
import { channelsForProfile, MAX_CANAIS, type LiveChannel } from '@/lib/live';
import { explicarErroYoutube, isYoutubeConfigured, liveNow, resolveChannelId } from '@/lib/youtube';
import { buildSportsBoard } from '@/lib/sports';
import type { CategorySlug } from '@/lib/data';

export const revalidate = 900;

interface AoVivo {
  id: string;
  tema: CategorySlug;
  titulo: string;
  canal: string;
  thumb: string | null;
  embedUrl: string;
  url: string;
  /** 'agora' = transmitindo; 'agendado' = com hora marcada. */
  estado: 'agora' | 'agendado';
  comecaEm?: string;
}

/**
 * GET /api/aovivo?temas=musica,cinema
 *
 * O que está no ar agora e o que já tem hora marcada, nos temas que a pessoa
 * segue. Duas fontes com custos bem diferentes:
 *
 *  - agenda esportiva: gratuita, sem cota, com hora exata — é ela que permite
 *    avisar ANTES de começar;
 *  - canais do YouTube: 100 unidades por canal consultado, então no máximo
 *    MAX_CANAIS por requisição, com cache de 15 min compartilhado.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const temas = (params.get('temas') || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean) as CategorySlug[];

  const itens: AoVivo[] = [];
  const avisos: string[] = [];

  // --- 1) Agenda esportiva: hora exata, custo zero -------------------------
  if (!temas.length || temas.includes('esporte')) {
    try {
      const board = await buildSportsBoard('futebol');
      for (const m of board.aoVivo.slice(0, 4)) {
        itens.push({
          id: m.id,
          tema: 'esporte',
          titulo: `${m.home} x ${m.away}`,
          canal: m.competition,
          thumb: m.thumb,
          embedUrl: '',
          url: '/esporte',
          estado: 'agora',
        });
      }
      for (const m of [...board.hoje].slice(0, 4)) {
        itens.push({
          id: m.id,
          tema: 'esporte',
          titulo: `${m.home} x ${m.away}`,
          canal: m.competition,
          thumb: m.thumb,
          embedUrl: '',
          url: '/esporte',
          estado: 'agendado',
          comecaEm: m.startsAt,
        });
      }
    } catch {
      /* a agenda esportiva já degrada sozinha; não derruba o resto */
    }
  }

  // --- 2) Canais do YouTube: caro, então limitado --------------------------
  const canais: LiveChannel[] = channelsForProfile(temas).slice(0, MAX_CANAIS);

  if (!isYoutubeConfigured()) {
    if (canais.length) {
      avisos.push(
        'Sem YOUTUBE_API_KEY não dá para saber quais canais estão no ar agora — só os jogos, que têm hora marcada. Os canais abaixo continuam abrindo normalmente.',
      );
    }
  } else if (canais.length) {
    const consultas = await Promise.allSettled(
      canais.map(async (c) => {
        const channelId = await resolveChannelId(c.youtube);
        if (!channelId) return null;
        const live = await liveNow(channelId);
        return live ? { canal: c, live } : null;
      }),
    );

    let falhou = '';
    for (const r of consultas) {
      if (r.status === 'rejected') {
        falhou = falhou || explicarErroYoutube(String(r.reason?.reason || ''), String(r.reason?.detalhe || r.reason?.message || ''));
        continue;
      }
      if (!r.value) continue;
      const { canal, live } = r.value;
      itens.push({
        id: `yt-${live.videoId}`,
        tema: canal.topic,
        titulo: live.titulo,
        canal: canal.nome,
        thumb: live.thumb,
        embedUrl: live.embedUrl,
        url: canal.url,
        estado: 'agora',
      });
    }
    if (falhou) avisos.push(falhou);
  }

  const agora = itens.filter((i) => i.estado === 'agora');
  const emBreve = itens
    .filter((i) => i.estado === 'agendado')
    .sort((a, b) => new Date(a.comecaEm!).getTime() - new Date(b.comecaEm!).getTime());

  return NextResponse.json({
    agora,
    emBreve,
    canaisConsultados: canais.length,
    // Transparência de custo: cada canal consultado gasta 100 das 10.000
    // unidades diárias da cota gratuita do YouTube.
    custoUnidades: isYoutubeConfigured() ? canais.length * 100 : 0,
    avisos,
    atualizadoEm: new Date().toISOString(),
  });
}
