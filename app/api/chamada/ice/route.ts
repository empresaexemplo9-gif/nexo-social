import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/chamada/ice — servidores ICE das chamadas (WebRTC).
 *
 * STUN só descobre o endereço público de cada aparelho para eles se falarem
 * direto; nenhum áudio ou vídeo passa por ele, e ele não pede conta nem chave.
 * Padrão: STUN públicos. WEBRTC_STUN_URLS troca por outros (ou pelo seu).
 *
 * Em algumas redes (4G com CGNAT, Wi-Fi corporativo) a conexão direta não
 * fecha; aí só um servidor TURN resolve, retransmitindo a mídia (ainda
 * cifrada). Para ter o seu, suba um coturn com `use-auth-secret` e defina
 * TURN_URLS e TURN_SECRET: cada pessoa recebe uma credencial que vence em 12 h
 * (o esquema de REST do coturn), e o segredo nunca sai do servidor.
 */
export async function GET() {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const lista = (v?: string) =>
    (v || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const stun = process.env.WEBRTC_STUN_URLS === undefined ? ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] : lista(process.env.WEBRTC_STUN_URLS);
  const iceServers: RTCIceServer[] = stun.length ? [{ urls: stun }] : [];

  const turn = lista(process.env.TURN_URLS);
  const segredo = (process.env.TURN_SECRET || '').trim();
  if (turn.length && segredo) {
    const username = `${Math.floor(Date.now() / 1000) + 12 * 3600}:${user.id}`;
    const credential = createHmac('sha1', segredo).update(username).digest('base64');
    iceServers.push({ urls: turn, username, credential });
  } else if (turn.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({ urls: turn, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }

  return NextResponse.json({ iceServers, turn: iceServers.some((s) => String(s.urls).includes('turn')) });
}
