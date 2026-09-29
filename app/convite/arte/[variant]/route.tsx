import React from 'react';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { STICKERS } from '@/lib/invite-art';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { variant: string } }) {
  if (!/^(0|[1-9][0-9]{0,2})$/.test(params.variant) || Number(params.variant) >= STICKERS.length) {
    return new Response('Not found', { status: 404 });
  }

  const sticker = STICKERS[Number(params.variant)];
  const bytes = await readFile(path.join(process.cwd(), 'public', 'invite-art', `sheet-${sticker.sheet}.png`));

  // As pranchas originais são pequenas. O limite de escala evita a ampliação
  // agressiva que deixava os adesivos borrados nas miniaturas compartilhadas.
  const scale = Math.min(4.2, 310 / sticker.w, 220 / sticker.h);
  const accent = sticker.color;
  const accentSoft = `${accent}24`;
  const accentGlow = `${accent}44`;
  const accentBorder = `${accent}70`;

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#0b0c0b',
        color: '#f7f3e8',
        padding: 52,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', position: 'absolute', inset: 0, background: `linear-gradient(125deg, ${accentSoft} 0%, #0b0c0b 42%, #090a09 100%)` }} />
      <div style={{ display: 'flex', position: 'absolute', width: 520, height: 520, borderRadius: 999, right: -70, top: -105, background: accentGlow, opacity: .42 }} />
      <div style={{ display: 'flex', position: 'absolute', width: 410, height: 410, borderRadius: 999, right: 22, top: 82, border: `1px solid ${accentBorder}`, opacity: .7 }} />
      <div style={{ display: 'flex', position: 'absolute', width: 310, height: 310, borderRadius: 999, right: 72, top: 132, border: `1px solid ${accentBorder}`, opacity: .45 }} />

      <div style={{ display: 'flex', flexDirection: 'column', width: 700, justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', width: 9, height: 9, borderRadius: 999, background: accent }} />
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 5 }}>NEXO.SOCIAL / CONVITE</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', color: accent, fontSize: 18, letterSpacing: 4, marginBottom: 22 }}>ACESSO AO ECOSSISTEMA</div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, lineHeight: 1.02, maxWidth: 680 }}>Seu jeito único tem lugar aqui.</div>
          <div style={{ display: 'flex', fontSize: 25, color: '#d7d3c8', marginTop: 22, maxWidth: 610, lineHeight: 1.28 }}>
            Um convite reservado para uma personalidade única e especial.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 16, letterSpacing: 3, color: '#aaa99f' }}>PESSOAS · CULTURA · DESCOBERTAS · CONEXÕES</div>
      </div>

      <div
        style={{
          display: 'flex',
          position: 'absolute',
          right: 48,
          top: 86,
          width: 372,
          height: 438,
          border: `1px solid ${accentBorder}`,
          borderRadius: 28,
          background: '#101210e8',
          color: '#f7f3e8',
          padding: 24,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: `0 24px 70px #000b, 0 0 70px ${accentSoft}`,
        }}
      >
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 12, letterSpacing: 3, color: '#bcb9ad' }}>SINAL DE PERTENCIMENTO</div>
          <div style={{ display: 'flex', width: 8, height: 8, borderRadius: 999, background: accent }} />
        </div>

        <div style={{ display: 'flex', width: 318, height: 260, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', position: 'absolute', width: 246, height: 246, borderRadius: 999, background: accentGlow, opacity: .32 }} />
          <div style={{ display: 'flex', position: 'relative', width: sticker.w * scale, height: sticker.h * scale, overflow: 'hidden', flexShrink: 0 }}>
            <img
              alt="Adesivo original do Nexo Social"
              src={`data:image/png;base64,${bytes.toString('base64')}`}
              width={sticker.sw * scale}
              height={sticker.sh * scale}
              style={{
                position: 'absolute',
                maxWidth: sticker.sw * scale,
                left: -sticker.x * scale,
                top: -sticker.y * scale,
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', color: accent, fontSize: 16, letterSpacing: 3 }}>{sticker.label}</div>
          <div style={{ display: 'flex', marginTop: 8, fontSize: 12, letterSpacing: 2, color: '#929188' }}>UM ENTRE 151 SINAIS ORIGINAIS</div>
        </div>
      </div>

      <div style={{ display: 'flex', position: 'absolute', right: 83, bottom: 48, color: accent, fontSize: 18, letterSpacing: 3 }}>
        RESERVADO A VOCÊ
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=31536000' },
    },
  );
}
