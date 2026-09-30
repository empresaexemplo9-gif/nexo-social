import React from 'react';
import { themeCopy, type FontKey, type Ornamento, type Theme } from './invite-themes';

// Desenho do convite (1200 × 630) para o next/og. Tudo aqui precisa caber no
// subconjunto de CSS do Satori: flexbox, gradientes, sombras de texto e SVG
// inline. As imagens chegam prontas como data URI.

export const CARD_W = 1200;
export const CARD_H = 630;

export type CardInput = {
  theme: Theme;
  sticker: { src: string; w: number; h: number };
  textura?: string;
  extras: Partial<Record<'pincel' | 'rabisco' | 'painel', string>>;
  serial: number;
  variant: number;
  total: number;
};

type S = Record<string, any>;
// Fontes sem o sinal de ordinal (º): nelas o número usa #.
const NO_ORDINAL = new Set<FontKey>(['bangers', 'press-start', 'silkscreen', 'silkscreen-bold', 'vt323']);
const pad = (n: number, d = 4) => String(n).padStart(d, '0');

// Largura média de um caractere em relação ao corpo da fonte, para ajustar o
// título sem estourar a coluna.
const WIDTH: Partial<Record<FontKey, number>> = {
  anton: 0.44, 'archivo-condensed': 0.42, bangers: 0.46, 'press-start': 1.0, silkscreen: 0.78, 'silkscreen-bold': 0.82,
  vt323: 0.5, yellowtail: 0.46, 'permanent-marker': 0.62, 'dm-serif': 0.52, 'dm-serif-italic': 0.5, 'special-elite': 0.6,
  'rubik-wet-paint': 0.62, 'dela-gothic': 0.86, 'bungee-shade': 0.84, 'archivo-black': 0.64, archivo: 0.6,
};

function fitTitle(lines: string[], font: FontKey, size: number, lineH: number, width: number, maxH: number) {
  const k = WIDTH[font] ?? 0.6;
  for (let s = size; s > 30; s -= 2) {
    let rows = 0;
    for (const line of lines) {
      // Quebra por palavra: conta quantas linhas cada trecho ocupa.
      let row = 0; rows += 1;
      for (const word of line.split(' ')) {
        const w = (word.length + 1) * k * s;
        if (row + w > width && row > 0) { rows += 1; row = w; } else row += w;
        if (w > width) return Math.max(30, Math.floor(width / ((word.length + 0.5) * k)));
      }
    }
    if (rows * s * lineH <= maxH) return s;
  }
  return 30;
}

// Números pseudoaleatórios estáveis por convite (mesmo número, mesmo desenho).
function rand(seed: number) {
  let x = seed * 2654435761 >>> 0;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return (x % 100000) / 100000; };
}

function Star({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const p = `${x},${y - r} ${x + r * 0.22},${y - r * 0.22} ${x + r},${y} ${x + r * 0.22},${y + r * 0.22} ${x},${y + r} ${x - r * 0.22},${y + r * 0.22} ${x - r},${y} ${x - r * 0.22},${y - r * 0.22}`;
  return <polygon points={p} fill={color} />;
}

function burst(cx: number, cy: number, r1: number, r2: number, n: number, jitter: () => number) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n;
    const r = i % 2 ? r2 * (0.85 + jitter() * 0.3) : r1 * (0.9 + jitter() * 0.2);
    pts.push(`${(cx + Math.sin(a) * r).toFixed(1)},${(cy - Math.cos(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

export function InviteCard(input: CardInput) {
  const { theme: t, sticker, textura, extras, serial, variant, total } = input;
  const r = rand(serial * 131 + variant);
  const orn = (tipo: Ornamento['t']) => t.ornamentos?.find((o) => o.t === tipo) as any;
  const has = (tipo: Ornamento['t']) => Boolean(orn(tipo));

  const mirror = t.espelhar !== false && serial % 2 === 1 && !t.moldura && !has('raios') && !has('painel') && !has('katakana');
  const angle = Math.round((r() - 0.5) * 10);
  const cx = mirror ? 318 : 882;
  const cy = CARD_H / 2 + 6;
  const textX = mirror ? 610 : 66;
  const textW = 540;
  const vPad = has('xadrez') ? 86 : t.moldura ? 64 : 50;

  // O adesivo é mostrado perto do tamanho do arquivo original: no máximo 1,6×
  // (2× só nos muito pequenos), para não perder nitidez.
  const zone = has('anel') ? 330 : 440;
  const scale = Math.min(zone / sticker.w, (zone - 20) / sticker.h, sticker.w < 200 ? 2 : 1.6);
  const sw = Math.round(sticker.w * scale);
  const sh = Math.round(sticker.h * scale);

  const title = t.titulo;
  const copy = themeCopy(t, variant);
  const raw = title.caixaAlta ? copy.titulo.toUpperCase() : copy.titulo;
  const lines = title.efeito === 'repeticao' ? [raw, raw, raw, raw] : raw.split('\n');
  // Acentos em caixa alta pedem um pouco mais de entrelinha nas grotescas.
  const lineH = Math.max(title.altura ?? 1, title.fonte === 'archivo' || title.fonte === 'archivo-black' ? 1.04 : 0);
  const maxTitleH = title.efeito === 'repeticao' ? 330 : 280;
  const size = title.efeito === 'recorte' ? title.tamanho : fitTitle(lines, title.fonte, title.tamanho, lineH, textW - 10, maxTitleH);

  const titleStyle: S = {
    display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: title.fonte, fontSize: size, lineHeight: lineH,
    letterSpacing: title.espacamento ?? (title.fonte === 'archivo-black' || title.fonte === 'archivo' ? -1.5 : 0),
    color: title.cor ?? t.tinta,
    ...(title.inclinado ? { transform: 'skewX(-8deg)' } : {}),
  };
  if (title.efeito === 'sombra3d') Object.assign(titleStyle, { WebkitTextStroke: '3px #111', textShadow: '5px 5px 0 #111' });
  if (title.efeito === 'contorno') Object.assign(titleStyle, { WebkitTextStroke: '2px #0b0b0b', textShadow: '4px 5px 0 #0b0b0b' });
  if (title.efeito === 'relevo') Object.assign(titleStyle, { textShadow: '0 -1px 0 rgba(0,0,0,.55), 0 2px 1px rgba(255,255,255,.16), 0 4px 6px rgba(0,0,0,.35)' });
  if (title.efeito === 'brilho') Object.assign(titleStyle, { textShadow: `0 0 18px ${t.tinta}, 0 0 4px ${t.tinta}` });
  // Gradiente recortado no texto, aplicado linha a linha.
  const lineFx: S = title.efeito === 'holo'
    ? { backgroundImage: 'linear-gradient(100deg, #ffb6e6 0%, #b2e8ff 28%, #c4b2ff 52%, #fff6ba 74%, #a0ffe4 100%)', backgroundClip: 'text', color: 'transparent' }
    : title.efeito === 'cromo'
      ? { backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #e4e8ef 38%, #6b707b 52%, #f3f5f9 66%, #a7adb8 100%)', backgroundClip: 'text', color: 'transparent' }
      : {};

  const titleBlock = (
    <div style={{ display: 'flex', position: 'relative', flexDirection: 'column', marginTop: 14, marginBottom: 6,
      ...(has('pincelada') && extras.pincel ? { backgroundImage: `url(${extras.pincel})`, backgroundSize: '100% 100%', padding: '44px 40px 48px 30px', marginLeft: -30, marginTop: 10 } : {}) }}>
      {/* O rabisco fica atrás das letras, como no adesivo. */}
      {has('rabisco') && extras.rabisco && (
        <img src={extras.rabisco} width={500} height={220} style={{ position: 'absolute', left: -14, bottom: -70, opacity: 0.9 }} />
      )}
      {title.efeito === 'recorte' ? <Ransom text={raw} size={size} /> : (
        <div style={titleStyle}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', ...lineFx, ...(title.efeito === 'repeticao' ? { color: i === lines.length - 1 ? t.tinta : title.cor } : {}) }}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );

  const kickerBar = orn('tarja');
  const labelFont = t.rotulo;
  const labelScale = labelFont === 'vt323' ? 1.5 : labelFont === 'special-elite' ? 1.1 : 1;

  return (
    <div style={{
      display: 'flex', position: 'relative', width: CARD_W, height: CARD_H, overflow: 'hidden', fontFamily: t.corpo,
      color: t.tinta, backgroundColor: t.fundo, ...(t.gradiente ? { backgroundImage: t.gradiente } : {}),
    }}>
      {textura && <img src={textura} width={CARD_W} height={CARD_H} style={{ position: 'absolute', left: 0, top: 0, opacity: t.texturaOpacidade ?? 1 }} />}

      {/* Ornamentos de fundo */}
      {t.ornamentos?.map((o, i) => <Back key={i} o={o} cx={cx} cy={cy} mirror={mirror} rnd={rand(serial + i * 17)} extras={extras} />)}

      {/* Moldura do patch / etiqueta */}
      {t.moldura === 'etiqueta' && (
        <div style={{ display: 'flex', position: 'absolute', left: 18, top: 18, right: 18, bottom: 18, border: `12px solid ${t.tinta}`, borderRadius: 26 }} />
      )}

      {/* Coluna de texto */}
      <div style={{ display: 'flex', position: 'absolute', left: textX, top: vPad, width: textW, height: CARD_H - vPad * 2, flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: labelFont, fontSize: 17 * labelScale, letterSpacing: 4, color: t.suave }}>
          <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 99, backgroundColor: t.destaque }} />
          <div style={{ display: 'flex' }}>{`NEXO.SOCIAL / CONVITE ${NO_ORDINAL.has(labelFont) ? '#' : 'Nº '}${pad(serial)}`}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {has('arco-iris') && (
            <div style={{ display: 'flex', width: 180, height: 8, marginBottom: 14, backgroundImage: 'linear-gradient(90deg, #ff3b30 0%, #ff9500 25%, #ffd60a 50%, #34c759 75%, #0a84ff 100%)' }} />
          )}
          <div style={{ display: 'flex' }}>
            <div style={{
              display: 'flex', fontFamily: labelFont, fontSize: 16 * labelScale, letterSpacing: 5, textTransform: 'uppercase',
              color: kickerBar ? kickerBar.tinta : t.destaque === t.tinta ? t.suave : t.destaque,
              ...(kickerBar ? { backgroundColor: kickerBar.cor, padding: '6px 12px' } : {}),
            }}>{t.nome}</div>
          </div>
          {titleBlock}
          {has('filete') && <div style={{ display: 'flex', width: 84, height: 8, marginTop: 10, marginBottom: 6, backgroundColor: orn('filete').cor }} />}
          {has('sublinhado') && (
            <svg width="420" height="40" viewBox="0 0 420 40" style={{ marginTop: -4 }}>
              <path d="M6 30 C 90 8, 220 4, 412 14 M40 34 C 150 22, 260 22, 360 26" stroke={orn('sublinhado').cor} strokeWidth="6" fill="none" strokeLinecap="round" />
            </svg>
          )}
          <div style={{ display: 'flex', position: 'relative', flexDirection: 'column', marginTop: 16, fontSize: t.corpo === 'vt323' ? 30 : t.corpo === 'silkscreen' ? 22 : 23, lineHeight: 1.32, color: t.suave, maxWidth: 520 }}>
            {copy.linha.split('\n').map((l, i) => <div key={i} style={{ display: 'flex' }}>{l}</div>)}
          </div>
          {has('carregando') && <Loading o={orn('carregando')} serial={serial} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', fontFamily: labelFont, fontSize: 14 * labelScale, letterSpacing: 3, color: t.suave }}>{t.rodape}</div>
          {has('codigo-barras') && <Barcode serial={serial} color={orn('codigo-barras').cor} />}
        </div>
      </div>

      {/* Ornamentos ao redor do adesivo */}
      {has('explosao') && <Explosion o={orn('explosao')} cx={cx} cy={cy} rnd={rand(serial + 3)} />}
      {has('oval') && <Oval color={orn('oval').cor} cx={cx} cy={cy} />}
      {has('orbitas') && <Orbits color={orn('orbitas').cor} cx={cx} cy={cy} />}
      {has('anel') && <Ring o={orn('anel')} cx={cx} cy={cy} />}

      {/* O adesivo */}
      <div style={{ display: 'flex', position: 'absolute', left: cx - sw / 2, top: cy - sh / 2, width: sw, height: sh, transform: `rotate(${angle}deg)` }}>
        <img src={sticker.src} width={sw} height={sh} />
      </div>

      {/* Ornamentos na frente */}
      {t.ornamentos?.map((o, i) => <Front key={i} o={o} cx={cx} cy={cy} sw={sw} sh={sh} mirror={mirror} rnd={rand(serial + i * 29)} serial={serial} />)}

      {t.moldura === 'costura' && (
        <div style={{ display: 'flex', position: 'absolute', left: 22, top: 22, right: 22, bottom: 22, borderRadius: 30, border: `3px dashed ${orn('costura')?.cor ?? 'rgba(255,255,255,.5)'}` }} />
      )}
      {t.moldura === 'costura' && (
        <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, boxShadow: 'inset 0 0 0 10px rgba(0,0,0,.18), inset 0 0 60px rgba(0,0,0,.35)' }} />
      )}

      <div style={{ display: 'flex', position: 'absolute', ...(mirror ? { left: 30 } : { right: 30 }), bottom: has('xadrez') ? 70 : t.moldura === 'etiqueta' ? 44 : t.moldura ? 36 : 18, padding: '4px 8px', backgroundColor: t.textura ? 'transparent' : t.fundo, fontFamily: labelFont, fontSize: 13 * labelScale, letterSpacing: 3, color: t.suave }}>
        {`ADESIVO ${pad(variant + 1, 3)}/${total}`}
      </div>
    </div>
  );
}

function Back({ o, cx, cy, mirror, rnd, extras }: { o: Ornamento; cx: number; cy: number; mirror: boolean; rnd: () => number; extras: CardInput['extras'] }) {
  const full: S = { display: 'flex', position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H };
  switch (o.t) {
    case 'grade':
      return <div style={{ ...full, backgroundImage: `linear-gradient(180deg, ${o.cor} 1px, transparent 1px), linear-gradient(90deg, ${o.cor} 1px, transparent 1px)`, backgroundSize: `${o.passo ?? 40}px ${o.passo ?? 40}px` }} />;
    case 'pontilhado':
      return <div style={{ ...full, backgroundImage: `radial-gradient(circle, ${o.cor} 2.4px, transparent 3px)`, backgroundSize: '14px 14px' }} />;
    case 'halftone': {
      const dots: React.ReactNode[] = [];
      const ox = mirror ? 0 : 560;
      for (let y = 0; y < 22; y++) for (let x = 0; x < 34; x++) {
        const d = Math.hypot(x - 34, y - 0) / 40;
        const rr = Math.max(0, 7.5 * (1 - d));
        if (rr > 0.6) dots.push(<circle key={`${x}-${y}`} cx={(mirror ? 34 - x : x) * 19 + 8} cy={y * 19 + 8} r={rr} fill={o.cor} />);
      }
      return <svg width="660" height="430" viewBox="0 0 660 430" style={{ position: 'absolute', left: ox, top: 0 }}>{dots}</svg>;
    }
    case 'xadrez': {
      const cells: React.ReactNode[] = [];
      for (let row = 0; row < 2; row++) for (let x = 0; x < 34; x++) if ((x + row) % 2 === 0) {
        cells.push(<rect key={`t${row}-${x}`} x={x * 36} y={row * 30} width={36} height={30} fill={o.cor} />);
        cells.push(<rect key={`b${row}-${x}`} x={x * 36} y={CARD_H - 60 + row * 30} width={36} height={30} fill={o.cor} />);
      }
      return <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>{cells}</svg>;
    }
    case 'globo': {
      const R = 300; const op = o.opacidade ?? 0.2;
      const els: React.ReactNode[] = [<circle key="c" cx={R + 4} cy={R + 4} r={R} stroke={o.cor} strokeWidth={2} fill="none" />];
      for (let k = 1; k < 6; k++) els.push(<ellipse key={`m${k}`} cx={R + 4} cy={R + 4} rx={R * Math.cos((k * Math.PI) / 12)} ry={R} stroke={o.cor} strokeWidth={1.6} fill="none" />);
      for (let k = -4; k <= 4; k++) {
        const y = R + 4 + (k * R) / 5; const half = Math.sqrt(Math.max(0, R * R - ((k * R) / 5) ** 2));
        els.push(<line key={`l${k}`} x1={R + 4 - half} y1={y} x2={R + 4 + half} y2={y} stroke={o.cor} strokeWidth={1.6} />);
      }
      return <svg width={R * 2 + 8} height={R * 2 + 8} viewBox={`0 0 ${R * 2 + 8} ${R * 2 + 8}`} style={{ position: 'absolute', left: cx - R - 4, top: cy - R - 4, opacity: op }}>{els}</svg>;
    }
    case 'raios': {
      const n = 44; const R = 900; const els: React.ReactNode[] = [];
      for (let i = 0; i < n; i += 2) {
        const a1 = (i / n) * Math.PI * 2; const a2 = ((i + 1) / n) * Math.PI * 2;
        els.push(<polygon key={i} points={`${cx},${cy} ${cx + Math.cos(a1) * R},${cy + Math.sin(a1) * R} ${cx + Math.cos(a2) * R},${cy + Math.sin(a2) * R}`} fill={o.cor} />);
      }
      const x0 = mirror ? 0 : 640;
      return (
        <div style={{ display: 'flex', position: 'absolute', left: x0, top: 0, width: 560, height: CARD_H, overflow: 'hidden' }}>
          <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: -x0, top: 0 }}>{els}</svg>
        </div>
      );
    }
    case 'painel':
      return extras.painel ? (
        <div style={{ display: 'flex', position: 'absolute', left: mirror ? 0 : 640, top: 0, width: 560, height: CARD_H, overflow: 'hidden' }}>
          <img src={extras.painel} width={CARD_W} height={CARD_H} style={{ position: 'absolute', left: mirror ? 0 : -640, top: 0 }} />
          <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: 560, height: CARD_H, backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.35))' }} />
        </div>
      ) : null;
    case 'pixels': {
      const els: React.ReactNode[] = [];
      for (let i = 0; i < 70; i++) {
        const s = [8, 12, 16][Math.floor(rnd() * 3)];
        els.push(<rect key={i} x={Math.floor(rnd() * 150) * 8} y={Math.floor(rnd() * 78) * 8} width={s} height={s} fill={o.cor} />);
      }
      return <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>{els}</svg>;
    }
    case 'velocidade': {
      const els: React.ReactNode[] = [];
      for (let i = 0; i < 90; i++) {
        const a = rnd() * Math.PI * 2; const w = 0.004 + rnd() * 0.012; const r0 = 250 + rnd() * 110;
        const R = 1000;
        els.push(<polygon key={i} points={`${cx + Math.cos(a) * r0},${cy + Math.sin(a) * r0} ${cx + Math.cos(a - w) * R},${cy + Math.sin(a - w) * R} ${cx + Math.cos(a + w) * R},${cy + Math.sin(a + w) * R}`} fill={o.cor} />);
      }
      return (
        <div style={{ display: 'flex', position: 'absolute', left: mirror ? 0 : 620, top: 0, width: 580, height: CARD_H, overflow: 'hidden' }}>
          <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: mirror ? 0 : -620, top: 0 }}>{els}</svg>
        </div>
      );
    }
    case 'doodles': {
      const els: React.ReactNode[] = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + rnd() * 0.2; const r0 = 250; const r1 = 285 + rnd() * 25;
        els.push(<line key={`r${i}`} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} stroke={o.cor} strokeWidth={9} strokeLinecap="round" />);
      }
      for (let i = 0; i < 9; i++) {
        const x = (mirror ? 40 : 640) + rnd() * 520; const y = 30 + rnd() * 570;
        if (Math.hypot(x - cx, y - cy) < 300) continue;
        els.push(<path key={`s${i}`} d={`M${x} ${y} q 12 -18 24 0 t 24 0`} stroke={o.cor} strokeWidth={7} fill="none" strokeLinecap="round" />);
      }
      return <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>{els}</svg>;
    }
    case 'sol':
      return (
        <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <circle cx={cx + 40} cy={cy - 40} r={205} fill={o.cor} />
          <polygon points={`${cx - 330},${CARD_H} ${cx - 60},${cy + 120} ${cx - 20},${cy + 140} ${cx + 30},${cy + 100} ${cx + 360},${CARD_H}`} fill={o.tinta} />
          <polygon points={`${cx - 60},${cy + 120} ${cx - 20},${cy + 140} ${cx + 30},${cy + 100} ${cx + 12},${cy + 150} ${cx - 18},${cy + 160} ${cx - 44},${cy + 145}`} fill="#fff" />
        </svg>
      );
    case 'circulos': {
      const [a, b, c] = o.cores;
      return (
        <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <circle cx={cx - 120} cy={cy + 160} r={108} fill={a} />
          <circle cx={cx + 120} cy={cy - 170} r={96} fill={b} />
          <circle cx={cx + 170} cy={cy + 190} r={62} fill={c} />
        </svg>
      );
    }
    case 'lacos':
      return (
        <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <path d={`M${cx - 260} ${cy + 180} C ${cx - 120} ${cy - 120}, ${cx + 40} ${cy + 250}, ${cx + 110} ${cy + 20} S ${cx + 300} ${cy - 250}, ${cx + 150} ${cy - 210} S ${cx - 40} ${cy - 90}, ${cx + 90} ${cy - 40} S ${cx + 290} ${cy + 60}, ${cx + 280} ${cy + 250}`} stroke={o.cor} strokeWidth={2.4} fill="none" opacity={0.75} />
        </svg>
      );
    case 'gotas': {
      const els: React.ReactNode[] = [];
      for (let i = 0; i < 14; i++) {
        const x = (mirror ? 20 : 640) + rnd() * 540; const len = 24 + rnd() * 90; const w = 6 + rnd() * 10;
        els.push(<rect key={i} x={x} y={-10} width={w} height={len} rx={w / 2} fill={o.cor} />);
        els.push(<circle key={`c${i}`} cx={x + w / 2} cy={len - 6} r={w * 0.8} fill={o.cor} />);
      }
      return <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>{els}</svg>;
    }
    case 'scanlines':
      return null;
    default:
      return null;
  }
}

function Front({ o, cx, cy, sw, sh, mirror, rnd, serial }: { o: Ornamento; cx: number; cy: number; sw: number; sh: number; mirror: boolean; rnd: () => number; serial: number }) {
  switch (o.t) {
    case 'barra': {
      const th = o.espessura ?? 4;
      return (
        <svg width="120" height="520" viewBox="0 0 120 520" style={{ position: 'absolute', left: mirror ? 520 : 616, top: 55 }}>
          <line x1="80" y1="10" x2="24" y2="510" stroke={o.cor} strokeWidth={th} strokeLinecap="round" />
        </svg>
      );
    }
    case 'ponto':
      return <div style={{ display: 'flex', position: 'absolute', left: mirror ? 44 : CARD_W - 60, top: 96, width: 16, height: 16, borderRadius: 99, backgroundColor: o.cor, boxShadow: `0 0 16px ${o.cor}` }} />;
    case 'estrelas': {
      const els: React.ReactNode[] = [];
      for (let i = 0; i < 7; i++) {
        const a = rnd() * Math.PI * 2; const d = Math.max(sw, sh) / 2 + 30 + rnd() * 70;
        els.push(<Star key={i} x={cx + Math.cos(a) * d} y={cy + Math.sin(a) * d * 0.8} r={8 + rnd() * 16} color={o.cor} />);
      }
      return <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>{els}</svg>;
    }
    case 'cantos': {
      const x0 = cx - 250; const y0 = cy - 250; const s = 500; const L = 34; const c = o.cor;
      const corner = (x: number, y: number, dx: number, dy: number, k: string) => (
        <g key={k}>
          <path d={`M${x} ${y + dy * L} L${x} ${y} L${x + dx * L} ${y}`} stroke={c} strokeWidth={3} fill="none" />
          <circle cx={x + dx * 14} cy={y + dy * 14} r={6} stroke={c} strokeWidth={2} fill="none" />
        </g>
      );
      return (
        <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          {corner(x0, y0 + 30, 1, 1, 'a')}{corner(x0 + s, y0 + 30, -1, 1, 'b')}{corner(x0, y0 + s - 30, 1, -1, 'c')}{corner(x0 + s, y0 + s - 30, -1, -1, 'd')}
        </svg>
      );
    }
    case 'cotas': {
      const x0 = cx - sw / 2; const x1 = cx + sw / 2; const y = cy + sh / 2 + 34; const xl = cx - sw / 2 - 30; const y0 = cy - sh / 2; const y1 = cy + sh / 2;
      return (
        <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
          <line x1={x0} y1={y} x2={x1} y2={y} stroke={o.cor} strokeWidth={2} />
          <polygon points={`${x0},${y} ${x0 + 12},${y - 6} ${x0 + 12},${y + 6}`} fill={o.cor} />
          <polygon points={`${x1},${y} ${x1 - 12},${y - 6} ${x1 - 12},${y + 6}`} fill={o.cor} />
          <line x1={xl} y1={y0} x2={xl} y2={y1} stroke={o.cor} strokeWidth={2} />
          <polygon points={`${xl},${y0} ${xl - 6},${y0 + 12} ${xl + 6},${y0 + 12}`} fill={o.cor} />
          <polygon points={`${xl},${y1} ${xl - 6},${y1 - 12} ${xl + 6},${y1 - 12}`} fill={o.cor} />
          <line x1={x0} y1={y - 14} x2={x0} y2={y + 14} stroke={o.cor} strokeWidth={2} />
          <line x1={x1} y1={y - 14} x2={x1} y2={y + 14} stroke={o.cor} strokeWidth={2} />
        </svg>
      );
    }
    case 'mira': {
      const x = cx + sw / 2 - 10; const y = cy - sh / 2 - 6;
      return (
        <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: 'absolute', left: x - 30, top: y - 30 }}>
          <circle cx="30" cy="30" r="16" stroke={o.cor} strokeWidth="3" fill="none" />
          <line x1="30" y1="4" x2="30" y2="56" stroke={o.cor} strokeWidth="3" /><line x1="4" y1="30" x2="56" y2="30" stroke={o.cor} strokeWidth="3" />
        </svg>
      );
    }
    case 'tag':
      return (
        <div style={{ display: 'flex', position: 'absolute', left: cx - sw / 2 - 20, top: cy + sh / 2 - 36, padding: '8px 18px', backgroundColor: o.cor, color: o.tinta, fontFamily: 'archivo-black', fontSize: 30, letterSpacing: 1, transform: 'rotate(-4deg)' }}>{o.texto}</div>
      );
    case 'carimbo':
      return (
        <div style={{ display: 'flex', position: 'absolute', left: cx - 120, top: Math.min(cy + sh / 2 - 34, CARD_H - 110), padding: '6px 16px', border: `4px solid ${o.cor}`, boxShadow: `inset 0 0 0 3px transparent, inset 0 0 0 6px ${o.cor}`, color: o.cor, fontFamily: 'archivo-black', fontSize: 34, letterSpacing: 4, transform: 'rotate(-12deg)', opacity: 0.85 }}>{o.texto}</div>
      );
    case 'katakana':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: CARD_W - 76, top: 48, fontFamily: 'dela-gothic', fontSize: 40, lineHeight: 1.08, color: o.cor }}>
          {'ネクソ'.split('').map((ch, i) => <div key={i} style={{ display: 'flex' }}>{ch}</div>)}
        </div>
      );
    case 'scanlines':
      return <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H, backgroundImage: `linear-gradient(180deg, ${o.cor} 50%, transparent 50%)`, backgroundSize: '100% 4px', boxShadow: 'inset 0 0 120px rgba(0,0,0,.75)' }} />;
    case 'campos':
      return (
        <div style={{ display: 'flex', position: 'absolute', left: cx - 200, top: CARD_H - 118, width: 400, height: 62, border: `3px solid ${o.cor}`, borderRadius: 8 }}>
          {['up', 'globe', 'glass'].map((k, i) => (
            <div key={k} style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', ...(i ? { borderLeft: `3px solid ${o.cor}` } : {}) }}>
              <svg width="40" height="40" viewBox="0 0 40 40">
                {k === 'up' && <path d="M12 34 V8 M6 14 L12 6 L18 14 M28 34 V8 M22 14 L28 6 L34 14 M4 36 H36" stroke={o.cor} strokeWidth="3" fill="none" />}
                {k === 'globe' && <g><circle cx="20" cy="20" r="15" stroke={o.cor} strokeWidth="3" fill="none" /><ellipse cx="20" cy="20" rx="7" ry="15" stroke={o.cor} strokeWidth="2.4" fill="none" /><line x1="5" y1="20" x2="35" y2="20" stroke={o.cor} strokeWidth="2.4" /></g>}
                {k === 'glass' && <path d="M11 5 H29 L27 17 Q20 25 13 17 Z M20 22 V34 M13 35 H27" stroke={o.cor} strokeWidth="3" fill="none" />}
              </svg>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

function Explosion({ o, cx, cy, rnd }: { o: { cores: [string, string, string] }; cx: number; cy: number; rnd: () => number }) {
  const [outer, inner, ink] = o.cores;
  return (
    <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <polygon points={burst(cx, cy, 272, 192, 16, rnd)} fill={outer} stroke={ink} strokeWidth={6} strokeLinejoin="round" />
      <polygon points={burst(cx, cy, 228, 162, 14, rnd)} fill={inner} stroke={ink} strokeWidth={5} strokeLinejoin="round" />
    </svg>
  );
}

function Oval({ color, cx, cy }: { color: string; cx: number; cy: number }) {
  return (
    <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <ellipse cx={cx} cy={cy} rx={258} ry={226} stroke={color} strokeWidth={4} fill="none" />
    </svg>
  );
}

function Orbits({ color, cx, cy }: { color: string; cx: number; cy: number }) {
  return (
    <svg width={CARD_W} height={CARD_H} viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <ellipse cx={cx} cy={cy} rx={290} ry={120} stroke={color} strokeWidth={2} fill="none" />
      <ellipse cx={cx} cy={cy} rx={120} ry={270} stroke={color} strokeWidth={2} fill="none" />
      <ellipse cx={cx} cy={cy} rx={250} ry={250} stroke={color} strokeWidth={1.5} fill="none" />
    </svg>
  );
}

function Ring({ o, cx, cy }: { o: { texto: string; cor: string; fundo?: string }; cx: number; cy: number }) {
  const R = 238; const text = o.texto;
  // Espaço de cada letra proporcional à largura dela, para o anel ficar regular.
  const wOf = (c: string) => (c === ' ' ? 0.45 : c === '·' ? 0.55 : 'IÍ1'.includes(c) ? 0.42 : 'MW'.includes(c) ? 1.05 : 0.8);
  const offsets: number[] = []; let totalW = 0;
  for (const c of text) { offsets.push(totalW + wOf(c) / 2); totalW += wOf(c); }
  const fs = Math.min(26, Math.floor((2 * Math.PI * R) / totalW / 0.95));
  return (
    <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H }}>
      <div style={{ display: 'flex', position: 'absolute', left: cx - R - 34, top: cy - R - 34, width: (R + 34) * 2, height: (R + 34) * 2, borderRadius: 999, border: `3px solid ${o.cor}`, opacity: 0.8 }} />
      <div style={{ display: 'flex', position: 'absolute', left: cx - R + 26, top: cy - R + 26, width: (R - 26) * 2, height: (R - 26) * 2, borderRadius: 999, border: `2px solid ${o.cor}`, opacity: 0.6 }} />
      {text.split('').map((ch, i) => {
        const a = (offsets[i] / totalW) * Math.PI * 2;
        return (
          <div key={i} style={{ display: 'flex', position: 'absolute', left: cx + Math.sin(a) * R - 15, top: cy - Math.cos(a) * R - 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', fontFamily: 'archivo', fontSize: fs, color: o.cor, transform: `rotate(${(a * 180) / Math.PI}deg)` }}>{ch}</div>
        );
      })}
    </div>
  );
}

function Loading({ o, serial }: { o: { cor: string; fundo: string }; serial: number }) {
  const pct = 88 + (serial % 12);
  const blocks = Math.round((pct / 100) * 22);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
      <div style={{ display: 'flex', fontFamily: 'silkscreen', fontSize: 20, color: o.cor, marginBottom: 8 }}>{`LOADING... ${pct}%`}</div>
      <div style={{ display: 'flex', width: 440, height: 38, border: `4px solid ${o.cor}`, padding: 4, gap: 4 }}>
        {Array.from({ length: 22 }, (_, i) => <div key={i} style={{ display: 'flex', width: 15, height: 22, backgroundColor: i < blocks ? o.cor : 'transparent' }} />)}
      </div>
    </div>
  );
}

// Código de barras próprio de cada convite, gerado a partir do número.
function Barcode({ serial, color }: { serial: number; color: string }) {
  const r = rand(serial * 7 + 1);
  const bars: React.ReactNode[] = [];
  let x = 0;
  for (let i = 0; i < 46; i++) {
    const w = 1 + Math.floor(r() * 4);
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={w} height={54} fill={color} />);
    x += w + 1;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={x} height="54" viewBox={`0 0 ${x} 54`}>{bars}</svg>
      <div style={{ display: 'flex', fontFamily: 'space-mono', fontSize: 13, letterSpacing: 4, color }}>{`NX${pad(serial)}`}</div>
    </div>
  );
}

// Letras recortadas de revista, cada uma num papel diferente.
function Ransom({ text, size }: { text: string; size: number }) {
  const styles: S[] = [
    { backgroundColor: '#0b0b0b', color: '#fff', fontFamily: 'archivo-black' },
    { backgroundColor: '#ffffff', color: '#0b0b0b', fontFamily: 'dm-serif' },
    { backgroundColor: '#ff3419', color: '#fff', fontFamily: 'anton' },
    { backgroundColor: '#f1e3c4', color: '#0b0b0b', fontFamily: 'special-elite' },
    { backgroundColor: '#0b0b0b', color: '#ffd400', fontFamily: 'bangers' },
    { backgroundColor: '#ffffff', color: '#1f4ff5', fontFamily: 'archivo-black' },
  ];
  const words = text.toUpperCase().split(' ');
  let k = 0;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, maxWidth: 540 }}>
      {words.map((w, wi) => (
        <div key={wi} style={{ display: 'flex', gap: 4 }}>
          {w.split('').map((ch, i) => {
            const st = styles[(k * 7 + wi) % styles.length]; const rot = ((k * 37) % 13) - 6; k++;
            return <div key={i} style={{ display: 'flex', ...st, fontSize: size * (0.86 + ((k * 13) % 5) * 0.06), padding: '2px 8px', lineHeight: 1.05, transform: `rotate(${rot}deg)`, boxShadow: '2px 3px 0 rgba(0,0,0,.25)' }}>{ch}</div>;
          })}
        </div>
      ))}
    </div>
  );
}
