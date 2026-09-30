import React from 'react';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { STICKERS } from '@/lib/invite-art';
import { FONT_FILES, TEX_FILES, THEMES, themeFonts, type TexKey } from '@/lib/invite-themes';
import { InviteCard, CARD_W, CARD_H } from '@/lib/invite-card';

export const runtime = 'nodejs';

const ASSETS = path.join(process.cwd(), 'public', 'convite-assets');
const cache = new Map<string, Promise<Buffer>>();
const load = (file: string) => {
  if (!cache.has(file)) cache.set(file, readFile(path.join(ASSETS, file)));
  return cache.get(file)!;
};
const dataUri = async (file: string) => {
  const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${(await load(file)).toString('base64')}`;
};

export async function GET(request: Request, { params }: { params: { variant: string } }) {
  if (!/^(0|[1-9][0-9]{0,2})$/.test(params.variant) || Number(params.variant) >= STICKERS.length) {
    return new Response('Not found', { status: 404 });
  }
  const variant = Number(params.variant);
  const n = new URL(request.url).searchParams.get('n') ?? '';
  // Sem número válido, a arte ainda sai (links antigos), com o nº 0001.
  const serial = /^[1-9][0-9]{0,3}$/.test(n) ? Number(n) : 1;

  const sticker = STICKERS[variant];
  const theme = THEMES[sticker.theme];
  const tex = (k?: TexKey) => (k ? dataUri(`texturas/${TEX_FILES[k]}`) : Promise.resolve(undefined));
  const painel = theme.ornamentos?.find((o) => o.t === 'painel') as { textura: TexKey } | undefined;

  const [stickerSrc, textura, pincel, rabisco, painelSrc, fonts] = await Promise.all([
    dataUri(`adesivos/${String(variant).padStart(3, '0')}.png`),
    tex(theme.textura),
    theme.ornamentos?.some((o) => o.t === 'pincelada') ? tex('pincel') : undefined,
    theme.ornamentos?.some((o) => o.t === 'rabisco') ? tex('rabisco') : undefined,
    tex(painel?.textura),
    Promise.all(themeFonts(theme).map(async (key) => ({ name: key, data: await load(`fonts/${FONT_FILES[key]}`), weight: 400 as const, style: 'normal' as const }))),
  ]);

  return new ImageResponse(
    <InviteCard
      theme={theme}
      sticker={{ src: stickerSrc, w: sticker.w, h: sticker.h }}
      textura={textura}
      extras={{ pincel, rabisco, painel: painelSrc }}
      serial={serial}
      variant={variant}
      total={STICKERS.length}
    />,
    {
      width: CARD_W,
      height: CARD_H,
      fonts,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=31536000' },
    },
  );
}
