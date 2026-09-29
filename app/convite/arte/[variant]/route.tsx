import React from 'react';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { STICKERS } from '@/lib/invite-art';

export const runtime = 'nodejs';

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function mix(hex: string, target: string, amount: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const t = Math.max(0, Math.min(1, amount));
  return {
    r: Math.round(a.r * (1 - t) + b.r * t),
    g: Math.round(a.g * (1 - t) + b.g * t),
    b: Math.round(a.b * (1 - t) + b.b * t),
  };
}

function rgb(c: { r: number; g: number; b: number }) {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

function rgba(c: { r: number; g: number; b: number }, alpha: number) {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

export async function GET(_request: Request, { params }: { params: { variant: string } }) {
  if (!/^(0|[1-9][0-9]{0,2})$/.test(params.variant) || Number(params.variant) >= STICKERS.length) {
    return new Response('Not found', { status: 404 });
  }

  const sticker = STICKERS[Number(params.variant)];

  let bytes: Buffer;
  let mime = 'image/png';
  if (sticker.sheet === 4) {
    const base = path.join(process.cwd(), 'public', 'invite-art');
    const [p0, p1, p2, p2tail, p3, p4, p5, p6, p7] = await Promise.all([
      readFile(path.join(base, 'sheet-4.part0'), 'utf8'),
      readFile(path.join(base, 'sheet-4.part1'), 'utf8'),
      readFile(path.join(base, 'sheet-4.part2'), 'utf8'),
      readFile(path.join(base, 'sheet-4.part2tail'), 'utf8'),
      readFile(path.join(base, 'sheet-4.part3'), 'utf8'),
      readFile(path.join(base, 'sheet-4.part4'), 'utf8'),
      readFile(path.join(base, 'sheet-4.part5'), 'utf8'),
      readFile(path.join(base, 'sheet-4.part6'), 'utf8'),
      readFile(path.join(base, 'sheet-4.part7'), 'utf8'),
    ]);
    const encoded =
      p0.trim().slice(0, 12000) +
      p1.trim().slice(0, 12000) +
      p2.trim().slice(0, 9833) +
      p2tail.trim().slice(0, 2167) +
      p3.trim().slice(0, 12000) +
      p4.trim().slice(0, 12000) +
      p5.trim().slice(0, 12000) +
      p6.trim().slice(0, 12000) +
      p7.trim().slice(0, 4532);
    bytes = Buffer.from(encoded, 'base64');
    mime = 'image/jpeg';
  } else {
    bytes = await readFile(path.join(process.cwd(), 'public', 'invite-art', `sheet-${sticker.sheet}.png`));
  }

  const accent = hexToRgb(sticker.color);
  const bgA = mix(sticker.color, '#111318', 0.34);
  const bgB = mix(sticker.color, '#050607', 0.58);
  const bgC = mix(sticker.color, '#000000', 0.72);
  const cardA = mix(sticker.color, '#ffffff', 0.83);
  const cardB = mix(sticker.color, '#ffffff', 0.62);
  const ink = mix(sticker.color, '#090a0d', 0.76);
  const maxScale = sticker.sheet === 4 ? 2.2 : 3.1;
  const scale = Math.min(maxScale, 250 / sticker.w, 178 / sticker.h);

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        color: '#fffaf2',
        background: `linear-gradient(135deg, ${rgb(bgA)} 0%, ${rgb(bgB)} 58%, ${rgb(bgC)} 100%)`,
      }}
    >
      <div style={{ display: 'flex', position: 'absolute', inset: 0, background: `radial-gradient(circle at 18% 18%, ${rgba(accent, .42)} 0%, rgba(255,255,255,0) 38%), radial-gradient(circle at 82% 28%, ${rgba(accent, .30)} 0%, rgba(255,255,255,0) 35%)` }} />
      <div style={{ display: 'flex', position: 'absolute', left: -100, bottom: -210, width: 650, height: 650, borderRadius: 999, background: rgba(accent, .22) }} />
      <div style={{ display: 'flex', position: 'absolute', right: -120, top: -130, width: 560, height: 560, borderRadius: 999, background: rgba(accent, .30) }} />

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 750, padding: '50px 54px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 999, background: rgb(cardA) }} />
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 5 }}>NEXO.SOCIAL / CONVITE</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', color: rgb(cardA), fontSize: 19, letterSpacing: 4, marginBottom: 20 }}>ACESSO AO ECOSSISTEMA</div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, lineHeight: 1.02, maxWidth: 650 }}>Seu jeito único tem lugar aqui.</div>
          <div style={{ display: 'flex', fontSize: 25, lineHeight: 1.3, marginTop: 22, maxWidth: 590, color: 'rgba(255,250,242,.90)' }}>
            Um convite reservado para uma personalidade única e especial.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 16, letterSpacing: 3, color: 'rgba(255,250,242,.74)' }}>
          PESSOAS · CULTURA · DESCOBERTAS · CONEXÕES
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          position: 'absolute',
          right: 52,
          top: 55,
          width: 350,
          height: 520,
          borderRadius: 34,
          padding: 23,
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: `linear-gradient(180deg, ${rgb(cardA)} 0%, ${rgb(cardB)} 100%)`,
          border: `1px solid ${rgba(accent, .36)}`,
          boxShadow: `0 26px 65px rgba(0,0,0,.30), 0 0 90px ${rgba(accent, .25)}`,
          zIndex: 3,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: rgba(ink, .78) }}>
          <div style={{ display: 'flex', fontSize: 12, letterSpacing: 3 }}>SINAL DE PERTENCIMENTO</div>
          <div style={{ display: 'flex', width: 9, height: 9, borderRadius: 999, background: rgb(accent) }} />
        </div>

        <div style={{ display: 'flex', width: '100%', height: 286, alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: 26, background: `radial-gradient(circle, ${rgba(accent, .18)} 0%, rgba(255,255,255,.18) 64%, rgba(255,255,255,0) 100%)` }}>
          <div style={{ display: 'flex', padding: 13, borderRadius: 22, background: 'rgba(255,255,255,.66)', boxShadow: '0 12px 28px rgba(0,0,0,.12)', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', position: 'relative', width: sticker.w * scale, height: sticker.h * scale, overflow: 'hidden', flexShrink: 0 }}>
              <img
                alt="Adesivo original do Nexo Social"
                src={`data:${mime};base64,${bytes.toString('base64')}`}
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: rgb(ink) }}>
          <div style={{ display: 'flex', fontSize: 17, letterSpacing: 3 }}>{sticker.label}</div>
          <div style={{ display: 'flex', marginTop: 8, fontSize: 12, letterSpacing: 2, color: rgba(ink, .64) }}>
            UM ENTRE {STICKERS.length} SINAIS ORIGINAIS
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', position: 'absolute', right: 90, bottom: 26, zIndex: 4, color: rgb(cardA), fontSize: 18, letterSpacing: 3 }}>
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
