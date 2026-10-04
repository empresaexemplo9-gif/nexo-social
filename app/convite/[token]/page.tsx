import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { INVITE_SITE, STICKERS, inviteEdition, inviteImage, inviteMeta } from '@/lib/invite-art';
import { FONT_FILES, TEX_FILES, themeCopy, themeFonts } from '@/lib/invite-themes';

type Props = { params: { token: string } };

export function generateMetadata({ params }: Props): Metadata {
  params = { token: params.token.toLowerCase() };
  if (!/^[a-f0-9]{64}$/.test(params.token)) return { title: 'Convite — Nexo Social' };
  const { title, description } = inviteMeta(params.token);
  const images = [{ url: `${INVITE_SITE}${inviteImage(params.token)}`, width: 1200, height: 630, alt: title }];
  return {
    title, description,
    robots: { index: false, follow: false }, referrer: 'no-referrer',
    openGraph: { type: 'website', title, description, url: `${INVITE_SITE}/convite/${params.token}`, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}

// A página do convite veste a estética do adesivo sorteado: mesmas cores,
// fontes, textura e texto do cartão.
export default function Invitation({ params }: Props) {
  params = { token: params.token.toLowerCase() };
  if (!/^[a-f0-9]{64}$/.test(params.token)) notFound();
  const e = inviteEdition(params.token);
  const t = e.theme;
  const copy = themeCopy(t, e.variant);
  const fonts = themeFonts(t);
  const fontCss = fonts.map((k) => `@font-face{font-family:'nx-${k}';src:url('/convite-assets/fonts/${FONT_FILES[k]}') format('truetype');font-display:swap}`).join('');
  const titulo = (t.titulo.caixaAlta ? copy.titulo.toUpperCase() : copy.titulo).replace(/\n/g, ' ');
  const botaoFundo = t.destaque === t.fundo ? t.tinta : t.destaque;
  const botaoTexto = t.destaque === t.fundo ? t.fundo : t.sobreDestaque;
  const textura = t.textura ? `url('/convite-assets/texturas/${TEX_FILES[t.textura]}')` : undefined;

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: t.fundo,
        backgroundImage: [textura, t.gradiente].filter(Boolean).join(', ') || undefined,
        backgroundSize: 'cover', backgroundPosition: 'center', color: t.tinta, fontFamily: `'nx-${t.corpo}', system-ui, sans-serif`,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: fontCss }} />
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-5 py-10 sm:px-8">
        <p className="text-xs uppercase tracking-[.3em]" style={{ color: t.suave, fontFamily: `'nx-${t.rotulo}'` }}>
          Nexo Social · convite {e.serialLabel} · {t.nome}
        </p>

        <div className="grid items-center gap-8 md:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-5">
            <h1
              className="break-words"
              style={{
                fontFamily: `'nx-${t.titulo.fonte}'`, color: t.titulo.cor ?? t.tinta,
                fontSize: 'clamp(2.4rem, 7vw, 4.6rem)', lineHeight: Math.max(t.titulo.altura ?? 1, 1.02),
                letterSpacing: t.titulo.espacamento ? `${t.titulo.espacamento / 16}rem` : undefined,
                transform: t.titulo.inclinado ? 'skewX(-8deg)' : undefined,
              }}
            >
              {titulo}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed" style={{ color: t.suave, whiteSpace: 'pre-line' }}>{copy.linha}</p>
            <p className="max-w-xl text-base leading-relaxed" style={{ color: t.suave }}>
              Este convite chegou até você porque alguém do Nexo Social pensou em você. Ele é pessoal, de uso único, e leva um adesivo que só existe nele.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={`/login?cadastro=1&convite=${encodeURIComponent(params.token)}`}
                className="inline-flex rounded-2xl px-7 py-4 text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: botaoFundo, color: botaoTexto, fontFamily: `'nx-${t.rotulo}'`, letterSpacing: '.04em' }}
              >
                Abrir meu convite ↗
              </Link>
              <span className="text-xs" style={{ color: t.suave }}>A disponibilidade é confirmada ao abrir.</span>
            </div>
          </div>

          <figure className="flex flex-col items-center gap-3">
            {/* O adesivo no tamanho do arquivo original, sem ampliar. */}
            <img
              src={e.sticker.file}
              width={e.sticker.w}
              height={e.sticker.h}
              alt={`Adesivo da ${t.nome}`}
              className="h-auto max-w-full drop-shadow-2xl"
              style={{ transform: `rotate(${(e.serial % 9) - 4}deg)` }}
            />
            <figcaption className="text-[11px] uppercase tracking-[.3em]" style={{ color: t.suave, fontFamily: `'nx-${t.rotulo}'` }}>
              Adesivo {String(e.variant + 1).padStart(3, '0')} de {STICKERS.length}
            </figcaption>
          </figure>
        </div>

        <img
          src={inviteImage(params.token)}
          width={1200}
          height={630}
          alt={`${titulo} — convite ${e.serialLabel} do Nexo Social`}
          className="w-full rounded-3xl shadow-2xl"
          style={{ outline: `1px solid ${t.suave}33` }}
        />
      </div>
    </main>
  );
}
