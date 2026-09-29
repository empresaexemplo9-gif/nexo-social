import React from 'react';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { STICKERS } from '@/lib/invite-art';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { variant: string } }) {
  if (!/^(0|[1-9][0-9]{0,2})$/.test(params.variant) || Number(params.variant) >= STICKERS.length) return new Response('Not found', { status: 404 });
  const sticker = STICKERS[Number(params.variant)];
  const bytes = await readFile(path.join(process.cwd(), 'public', 'invite-art', `sheet-${sticker.sheet}.png`));
  const scale = Math.min(300 / sticker.w, 195 / sticker.h);
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#10110f', color: '#f4efdf', padding: 52, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', position: 'absolute', width: 570, height: 570, border: `1px solid ${sticker.color}`, borderRadius: 999, right: -70, top: 25, opacity: .35 }} />
      <div style={{ display: 'flex', position: 'absolute', width: 420, height: 420, border: `1px solid ${sticker.color}`, borderRadius: 999, right: 5, top: 100, opacity: .3 }} />
      <div style={{ display: 'flex', flexDirection: 'column', width: 710, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', fontSize: 23, letterSpacing: 5 }}>NEXO.SOCIAL / CONVITE</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', color: sticker.color, fontSize: 19, letterSpacing: 4, marginBottom: 24 }}>HÁ ALGO DO OUTRO LADO.</div>
          <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1.04, maxWidth: 690 }}>Seu jeito único tem lugar aqui.</div>
          <div style={{ display: 'flex', fontSize: 26, color: '#c5c3b8', marginTop: 24, maxWidth: 620 }}>Um convite para o ecossistema Nexo Social.</div>
        </div>
        <div style={{ display: 'flex', fontSize: 17, letterSpacing: 3, color: '#acae9e' }}>PESSOAS · CULTURA · DESCOBERTAS · CONEXÕES</div>
      </div>
      <div style={{ display: 'flex', position: 'absolute', right: 57, top: 138, width: 326, height: 347, background: '#e9e2d1', color: '#141512', padding: 13, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(7deg)', boxShadow: '0 18px 40px #0008' }}>
        <div style={{ display: 'flex', fontSize: 13, letterSpacing: 3, marginBottom: 28 }}>SINAL DE PERTENCIMENTO</div>
        <div style={{ display: 'flex', position: 'relative', width: sticker.w * scale, height: sticker.h * scale, overflow: 'hidden', flexShrink: 0 }}>
          <img alt="Adesivo DRAP original" src={`data:image/png;base64,${bytes.toString('base64')}`} width={sticker.sw * scale} height={sticker.sh * scale} style={{ position: 'absolute', maxWidth: sticker.sw * scale, left: -sticker.x * scale, top: -sticker.y * scale }} />
        </div>
        <div style={{ display: 'flex', fontSize: 16, letterSpacing: 2, marginTop: 27 }}>{sticker.label}</div>
      </div>
      <div style={{ display: 'flex', position: 'absolute', right: 90, bottom: 63, color: sticker.color, fontSize: 20, letterSpacing: 3 }}>RESERVADO A VOCÊ</div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=31536000' } },
  );
}
