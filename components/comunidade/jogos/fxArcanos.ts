// Efeitos visuais do tabuleiro do Arcanos: um motor de partículas em canvas.
// Cada elemento tem a sua matéria (brasas, gotas, rochas, rajadas, estrelas,
// fumaça) e cada tipo de efeito (dano, cura, escudo…) tem a sua coreografia.

import { ELEMENTOS, type Elemento } from '@/lib/jogos/arcanos/cartas';

export interface Ponto {
  x: number;
  y: number;
}

type Forma = 'brilho' | 'faisca' | 'rocha' | 'gota' | 'estrela' | 'fumaca' | 'anel' | 'cruz' | 'folha' | 'chama' | 'chevron' | 'cupula' | 'runa' | 'coluna' | 'pena';

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  arrasto: number;
  vida: number;
  max: number;
  tam: number;
  tam1: number;
  rot: number;
  vr: number;
  cor: string;
  forma: Forma;
  soma: boolean;
  alfa: number;
  orb?: { cx: number; cy: number; rx: number; ry: number; w: number; a: number };
  atraso?: number;
}

interface Projetil {
  el: Elemento;
  de: Ponto;
  para: Ponto;
  t0: number;
  dur: number;
  arco: number;
  aoChegar: () => void;
  giro: number;
}

const PALETAS: Record<Elemento, string[]> = {
  fogo: ['#fff2b0', '#ffc25c', '#ff7a2e', '#e2491f'],
  agua: ['#ffffff', '#9be9ff', '#38c8ff', '#1f86d6'],
  terra: ['#e8d9a8', '#c9a867', '#8a6a3b', '#b8d65f'],
  ar: ['#ffffff', '#e8fff6', '#9dffe0', '#4fd1b0'],
  luz: ['#ffffff', '#fff6c9', '#ffe27a', '#f5c542'],
  escuridao: ['#e6d4ff', '#a855f7', '#7c3aed', '#3b1a6e'],
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];

export class MotorDeEfeitos {
  private ctx: CanvasRenderingContext2D;
  private parts: Particula[] = [];
  private projeteis: Projetil[] = [];
  private raf = 0;
  private emQuadro = false;
  private ultimo = 0;
  private w = 0;
  private h = 0;
  private sprites = new Map<string, HTMLCanvasElement>();
  private vivo = true;

  constructor(private canvas: HTMLCanvasElement) {
    const c = canvas.getContext('2d');
    if (!c) throw new Error('canvas indisponível');
    this.ctx = c;
  }

  redimensionar(w: number, h: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  parar() {
    this.vivo = false;
    cancelAnimationFrame(this.raf);
  }

  /** Limpa tudo (usado ao pular as animações). */
  limpar() {
    this.parts = [];
    this.projeteis.forEach((p) => p.aoChegar());
    this.projeteis = [];
  }

  private acordar() {
    if (this.raf || this.emQuadro || !this.vivo) return;
    this.ultimo = performance.now();
    this.raf = requestAnimationFrame(this.quadro);
  }

  private glow(cor: string): HTMLCanvasElement {
    let s = this.sprites.get(cor);
    if (!s) {
      s = document.createElement('canvas');
      s.width = s.height = 64;
      const g = s.getContext('2d')!;
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, cor);
      gr.addColorStop(0.2, cor + 'cc');
      gr.addColorStop(0.5, cor + '55');
      gr.addColorStop(0.8, cor + '14');
      gr.addColorStop(1, cor + '00');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      this.sprites.set(cor, s);
    }
    return s;
  }

  // ---- emissão ---------------------------------------------------------------

  private p(base: Partial<Particula> & { x: number; y: number; cor: string; forma: Forma }): Particula {
    const v: Particula = {
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      arrasto: 0,
      vida: 0,
      max: 700,
      tam: 6,
      tam1: 0,
      rot: 0,
      vr: 0,
      soma: true,
      alfa: 1,
      ...base,
    };
    this.parts.push(v);
    this.acordar();
    return v;
  }

  private radial(el: Elemento, pos: Ponto, n: number, vel: [number, number], o: { formas?: Forma[]; max?: [number, number]; tam?: [number, number]; ay?: number; arrasto?: number } = {}) {
    const pal = PALETAS[el];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rnd(vel[0], vel[1]);
      const forma = pick(o.formas ?? this.formasDe(el));
      this.p({
        x: pos.x + Math.cos(a) * 4,
        y: pos.y + Math.sin(a) * 4,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v * 0.8,
        ay: o.ay ?? (el === 'fogo' ? -60 : el === 'agua' || el === 'terra' ? 520 : 40),
        arrasto: o.arrasto ?? 1.6,
        max: rnd(...(o.max ?? [450, 900])),
        tam: rnd(...(o.tam ?? [3, 9])),
        tam1: forma === 'fumaca' ? rnd(14, 30) : 0,
        rot: Math.random() * 6.28,
        vr: rnd(-8, 8),
        cor: pick(pal),
        forma,
        soma: forma !== 'fumaca' && forma !== 'rocha',
      });
    }
  }

  private formasDe(el: Elemento): Forma[] {
    switch (el) {
      case 'fogo':
        return ['brilho', 'brilho', 'chama', 'faisca'];
      case 'agua':
        return ['gota', 'gota', 'brilho', 'faisca'];
      case 'terra':
        return ['rocha', 'rocha', 'fumaca', 'brilho'];
      case 'ar':
        return ['faisca', 'faisca', 'folha', 'brilho'];
      case 'luz':
        return ['estrela', 'estrela', 'brilho', 'faisca'];
      case 'escuridao':
        return ['fumaca', 'brilho', 'faisca', 'fumaca'];
    }
  }

  private anel(pos: Ponto, el: Elemento, tam: number, max = 520, cor?: string, atraso = 0) {
    this.p({ x: pos.x, y: pos.y, cor: cor ?? PALETAS[el][1], forma: 'anel', tam: 4, tam1: tam, max, atraso });
  }

  // ---- projéteis ------------------------------------------------------------

  projetil(el: Elemento, de: Ponto, para: Ponto, ms: number, aoChegar: () => void) {
    const dist = Math.hypot(para.x - de.x, para.y - de.y);
    this.projeteis.push({ el, de, para, t0: performance.now(), dur: ms, arco: Math.min(90, dist * 0.22) * (Math.random() > 0.5 ? 1 : -1), aoChegar, giro: 0 });
    this.acordar();
  }

  /** O carregamento: partículas do elemento convergem para quem lança. */
  carregar(el: Elemento, pos: Ponto, forca = 1) {
    const pal = PALETAS[el];
    for (let i = 0; i < 22 * forca; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = rnd(60, 110);
      this.p({
        x: pos.x + Math.cos(a) * d,
        y: pos.y + Math.sin(a) * d * 0.7,
        vx: -Math.cos(a) * d * 2.2,
        vy: -Math.sin(a) * d * 1.5,
        max: rnd(320, 520),
        tam: rnd(2, 6),
        cor: pick(pal),
        forma: el === 'luz' ? 'estrela' : el === 'escuridao' ? 'fumaca' : 'brilho',
        soma: el !== 'escuridao',
        tam1: el === 'escuridao' ? 16 : 0,
        alfa: 0.9,
      });
    }
    this.p({ x: pos.x, y: pos.y, cor: pal[2], forma: 'brilho', tam: 70 * forca, tam1: 6, max: 420, alfa: 0.7 });
  }

  // ---- impactos -------------------------------------------------------------

  impacto(tipo: string, el: Elemento, pos: Ponto, forca = 1) {
    const pal = PALETAS[el];
    const f = Math.max(0.6, Math.min(2.2, forca));
    switch (tipo) {
      case 'dano': {
        this.p({ x: pos.x, y: pos.y, cor: pal[1], forma: 'brilho', tam: 20, tam1: 120 * f, max: 320, alfa: 0.9 });
        this.p({ x: pos.x, y: pos.y, cor: '#ffffff', forma: 'brilho', tam: 10, tam1: 66 * f, max: 200, alfa: 0.95 });
        this.anel(pos, el, 100 * f, 520);
        this.anel(pos, el, 60 * f, 360, '#ffffff', 40);
        this.radial(el, pos, Math.round(40 * f), [150, 520 * f]);
        if (el === 'terra' || el === 'escuridao' || el === 'fogo') this.radial(el, pos, 6, [30, 120], { formas: ['fumaca'], max: [600, 1100], arrasto: 2.2 });
        if (el === 'ar') for (let i = 0; i < 8; i++) this.p({ x: pos.x, y: pos.y, vx: rnd(-1, 1) * 400, vy: rnd(-1, 1) * 300, cor: '#ffffff', forma: 'faisca', max: 260, tam: rnd(8, 18), arrasto: 2 });
        break;
      }
      case 'cura': {
        const cores = ['#ffffff', '#c7ffd8', '#4ade80', pal[1]];
        this.anel(pos, el, 90, 700, '#7dffa8');
        this.p({ x: pos.x, y: pos.y, cor: '#7dffa8', forma: 'brilho', tam: 30, tam1: 120, max: 600, alfa: 0.55 });
        for (let i = 0; i < 20 * f; i++) {
          this.p({
            x: pos.x + rnd(-34, 34),
            y: pos.y + rnd(-6, 26),
            vx: rnd(-14, 14),
            vy: rnd(-70, -160),
            arrasto: 0.4,
            max: rnd(700, 1200),
            tam: rnd(4, 9),
            cor: pick(cores),
            forma: Math.random() > 0.5 ? 'cruz' : 'estrela',
            rot: Math.random() * 0.4,
            atraso: rnd(0, 250),
          });
        }
        break;
      }
      case 'regenerar': {
        for (let i = 0; i < 16; i++) this.p({ x: pos.x + rnd(-30, 30), y: pos.y + rnd(0, 24), vx: rnd(-20, 20), vy: rnd(-50, -110), max: rnd(800, 1300), tam: rnd(5, 9), cor: pick(['#4ade80', '#bbf7d0', '#86efac', pal[1]]), forma: 'folha', vr: rnd(-4, 4), arrasto: 0.3, atraso: rnd(0, 300) });
        this.anel(pos, el, 70, 700, '#4ade80');
        break;
      }
      case 'escudo': {
        this.p({ x: pos.x, y: pos.y + 6, cor: pal[1], forma: 'cupula', tam: 20, tam1: 82 * Math.min(1.3, f), max: 900, alfa: 0.9 });
        this.anel(pos, el, 90, 600, '#ffffff');
        this.anel(pos, el, 120, 800, pal[1], 120);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.p({ x: pos.x + Math.cos(a) * 70, y: pos.y + Math.sin(a) * 50, vx: Math.cos(a) * 20, vy: Math.sin(a) * 14 - 14, max: rnd(500, 900), tam: rnd(3, 6), cor: pick(pal), forma: 'estrela', atraso: rnd(0, 250) });
        }
        break;
      }
      case 'amplificar': {
        for (let i = 0; i < 12; i++) this.p({ x: pos.x + rnd(-28, 28), y: pos.y + rnd(0, 34), vx: 0, vy: rnd(-90, -170), max: rnd(700, 1100), tam: rnd(7, 12), cor: pick([pal[1], '#ffd166', '#ffffff']), forma: 'chevron', arrasto: 0.2, atraso: i * 55 });
        this.anel(pos, el, 80, 700, '#ffd166');
        this.p({ x: pos.x, y: pos.y, cor: '#ffd166', forma: 'brilho', tam: 30, tam1: 110, max: 700, alfa: 0.5 });
        break;
      }
      case 'dot': {
        for (let i = 0; i < 14; i++) this.p({ x: pos.x + rnd(-24, 24), y: pos.y + rnd(-34, -8), vy: rnd(40, 120), ay: 280, max: rnd(600, 1000), tam: rnd(3, 7), cor: pick(pal), forma: el === 'fogo' ? 'chama' : 'gota', atraso: rnd(0, 350) });
        this.p({ x: pos.x, y: pos.y, cor: pal[2], forma: 'brilho', tam: 20, tam1: 90, max: 600, alfa: 0.55 });
        break;
      }
      case 'silenciar': {
        this.p({ x: pos.x, y: pos.y, cor: pal[1], forma: 'runa', tam: 60, tam1: 60, max: 1100, alfa: 1, rot: 0, vr: 2.2 });
        this.anel(pos, el, 90, 600, pal[1]);
        break;
      }
      case 'atordoar': {
        for (let i = 0; i < 5; i++) this.p({ x: pos.x, y: pos.y, cor: pick(['#fff6a8', '#ffffff', pal[1]]), forma: 'estrela', tam: 7, max: 1300, orb: { cx: pos.x, cy: pos.y - 36, rx: 34, ry: 11, w: 5.2, a: (i / 5) * 6.28 }, arrasto: 0 });
        this.anel(pos, el, 70, 500, '#fff6a8');
        break;
      }
      case 'enfraquecer': {
        for (let i = 0; i < 12; i++) this.p({ x: pos.x + rnd(-26, 26), y: pos.y + rnd(-30, 0), vy: rnd(30, 90), max: rnd(700, 1100), tam: rnd(6, 10), cor: pick(['#a78bfa', '#ddd6fe', pal[2]]), forma: 'chevron', rot: Math.PI, atraso: i * 50 });
        this.p({ x: pos.x, y: pos.y, cor: '#a78bfa', forma: 'brilho', tam: 20, tam1: 90, max: 600, alfa: 0.5 });
        break;
      }
      case 'esquiva-usada':
      case 'esquiva': {
        for (let i = 0; i < 10; i++) this.p({ x: pos.x - rnd(10, 40), y: pos.y + rnd(-28, 28), vx: rnd(380, 640), max: 420, tam: rnd(14, 30), cor: pick(pal), forma: 'faisca', arrasto: 1.2 });
        this.p({ x: pos.x, y: pos.y, cor: pal[1], forma: 'brilho', tam: 20, tam1: 90, max: 420, alfa: 0.55 });
        break;
      }
      case 'purificar': {
        this.anel(pos, el, 120, 700, '#ffffff');
        this.anel(pos, el, 80, 500, pal[1], 80);
        this.radial(el, pos, 22, [60, 200], { formas: ['estrela'], max: [500, 900], arrasto: 1.2, ay: 0 });
        this.p({ x: pos.x, y: pos.y, cor: '#ffffff', forma: 'brilho', tam: 20, tam1: 130, max: 500, alfa: 0.8 });
        break;
      }
      case 'dissipar': {
        this.radial(el, pos, 20, [120, 340], { formas: ['rocha'], max: [500, 900], tam: [3, 6], ay: 300 });
        this.anel(pos, el, 100, 500, '#ffffff');
        break;
      }
      case 'ressuscitar': {
        this.p({ x: pos.x, y: pos.y, cor: pal[1], forma: 'coluna', tam: 56, tam1: 220, max: 1100, alfa: 0.85 });
        this.anel(pos, el, 100, 800, '#ffffff');
        for (let i = 0; i < 16; i++) this.p({ x: pos.x + rnd(-30, 30), y: pos.y + rnd(0, 30), vy: rnd(-90, -220), vx: rnd(-18, 18), max: rnd(800, 1400), tam: rnd(4, 9), cor: pick(pal), forma: Math.random() > 0.5 ? 'pena' : 'estrela', vr: rnd(-3, 3), arrasto: 0.3, atraso: rnd(0, 350) });
        break;
      }
      case 'invocar': {
        this.p({ x: pos.x, y: pos.y, cor: pal[2], forma: 'brilho', tam: 20, tam1: 160, max: 700, alfa: 0.8 });
        this.anel(pos, el, 120, 700, pal[1]);
        this.anel(pos, el, 80, 600, '#ffffff', 100);
        this.radial(el, { x: pos.x, y: pos.y + 20 }, 24, [30, 140], { max: [500, 1000], ay: -120 });
        break;
      }
      case 'morte': {
        this.radial(el, pos, 14, [60, 240], { formas: ['fumaca'], max: [700, 1300], arrasto: 2.4, tam: [6, 12] });
        this.radial(el, pos, 16, [100, 340], { formas: ['rocha', 'brilho'], max: [500, 900], ay: 420 });
        this.anel(pos, el, 80, 500, pal[3]);
        break;
      }
      case 'comprar':
      case 'mana': {
        for (let i = 0; i < 12; i++) this.p({ x: pos.x + rnd(-40, 40), y: pos.y + rnd(-10, 40), vy: rnd(-40, -110), max: rnd(600, 1000), tam: rnd(3, 7), cor: pick(pal), forma: 'estrela', atraso: rnd(0, 250) });
        this.anel(pos, el, 70, 600, pal[1]);
        break;
      }
      case 'drenarMana': {
        this.radial(el, pos, 16, [40, 160], { formas: ['fumaca', 'brilho'], max: [600, 1100], ay: -40 });
        this.anel(pos, el, 90, 600, pal[1]);
        break;
      }
      case 'turno': {
        this.p({ x: pos.x, y: pos.y, cor: pal[1], forma: 'brilho', tam: 20, tam1: 140, max: 700, alfa: 0.6 });
        break;
      }
      case 'vitoria': {
        for (let i = 0; i < 60; i++) this.p({ x: pos.x + rnd(-120, 120), y: pos.y + 40, vx: rnd(-90, 90), vy: rnd(-420, -150), ay: 360, max: rnd(1200, 2200), tam: rnd(3, 8), cor: pick([...pal, '#ffffff', '#ffd166']), forma: Math.random() > 0.4 ? 'estrela' : 'brilho', atraso: rnd(0, 700) });
        break;
      }
    }
  }

  // ---- laço -----------------------------------------------------------------

  private quadro = (agora: number) => {
    this.raf = 0;
    if (!this.vivo) return;
    this.emQuadro = true;
    const dt = Math.min(48, agora - this.ultimo);
    this.ultimo = agora;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // projéteis
    for (let i = this.projeteis.length - 1; i >= 0; i--) {
      const pr = this.projeteis[i];
      const t = Math.min(1, (agora - pr.t0) / pr.dur);
      const e = t * t * (3 - 2 * t) * 0.35 + t * 0.65;
      const mx = (pr.de.x + pr.para.x) / 2;
      const my = (pr.de.y + pr.para.y) / 2;
      const nx = -(pr.para.y - pr.de.y);
      const ny = pr.para.x - pr.de.x;
      const nl = Math.hypot(nx, ny) || 1;
      const cx = mx + (nx / nl) * pr.arco;
      const cy = my + (ny / nl) * pr.arco;
      const u = 1 - e;
      const x = u * u * pr.de.x + 2 * u * e * cx + e * e * pr.para.x;
      const y = u * u * pr.de.y + 2 * u * e * cy + e * e * pr.para.y;
      this.desenharProjetil(pr, x, y, dt);
      if (t >= 1) {
        this.projeteis.splice(i, 1);
        pr.aoChegar();
      }
    }

    // partículas
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (p.atraso && p.atraso > 0) {
        p.atraso -= dt;
        continue;
      }
      p.vida += dt;
      if (p.vida >= p.max) {
        this.parts.splice(i, 1);
        continue;
      }
      const k = dt / 1000;
      if (p.orb) {
        p.orb.a += p.orb.w * k;
        p.x = p.orb.cx + Math.cos(p.orb.a) * p.orb.rx;
        p.y = p.orb.cy + Math.sin(p.orb.a) * p.orb.ry;
      } else {
        p.vx += p.ax * k;
        p.vy += p.ay * k;
        const d = Math.max(0, 1 - p.arrasto * k);
        p.vx *= d;
        p.vy *= d;
        p.x += p.vx * k;
        p.y += p.vy * k;
      }
      p.rot += p.vr * k;
      this.desenhar(p);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    this.emQuadro = false;
    if (this.parts.length || this.projeteis.length) this.raf = requestAnimationFrame(this.quadro);
  };

  private desenharProjetil(pr: Projetil, x: number, y: number, dt: number) {
    const ctx = this.ctx;
    const pal = PALETAS[pr.el];
    pr.giro += dt * 0.012;
    ctx.globalCompositeOperation = 'lighter';
    // rastro
    const n = Math.max(1, Math.round(dt / 8));
    for (let i = 0; i < n; i++) {
      const forma: Forma = pr.el === 'fogo' ? 'chama' : pr.el === 'agua' ? 'gota' : pr.el === 'terra' ? 'fumaca' : pr.el === 'ar' ? 'faisca' : pr.el === 'luz' ? 'estrela' : 'fumaca';
      this.p({
        x: x + rnd(-5, 5),
        y: y + rnd(-5, 5),
        vx: rnd(-40, 40),
        vy: rnd(-40, 40) + (pr.el === 'fogo' ? -30 : 0),
        max: rnd(260, 520),
        tam: rnd(4, 11),
        tam1: forma === 'fumaca' ? rnd(14, 26) : 0,
        cor: pick(pal),
        forma,
        soma: pr.el !== 'terra' && pr.el !== 'escuridao',
        arrasto: 2,
        alfa: 0.8,
        rot: Math.random() * 6,
        vr: rnd(-6, 6),
      });
    }
    const g = (cor: string, r: number, a = 1) => {
      ctx.globalAlpha = a;
      ctx.drawImage(this.glow(cor), x - r, y - r, r * 2, r * 2);
    };
    g(pal[2], 46, 0.75);
    g(pal[1], 30, 0.95);
    switch (pr.el) {
      case 'fogo':
        g('#fff2b0', 16);
        g('#ffffff', 8);
        break;
      case 'agua':
        g('#ffffff', 11);
        break;
      case 'terra':
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        this.rocha(x, y, 13, pr.giro, '#8a6a3b', '#dcc58f');
        break;
      case 'ar':
        g('#ffffff', 13);
        break;
      case 'luz':
        ctx.globalAlpha = 1;
        this.estrela(x, y, 26, pr.giro * 0.4, '#ffffff');
        g('#ffffff', 12);
        break;
      case 'escuridao':
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#05010c';
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, 6.3);
        ctx.fill();
        ctx.strokeStyle = '#d6b8ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }
    ctx.globalAlpha = 1;
  }

  private rocha(x: number, y: number, r: number, rot: number, cor: string, luz: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rr = r * (0.75 + ((i * 37) % 10) / 22);
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.fill();
    ctx.strokeStyle = luz;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  private estrela(x: number, y: number, r: number, rot: number, cor: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.2, -r * 0.2);
    ctx.lineTo(r, 0);
    ctx.lineTo(r * 0.2, r * 0.2);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.2, r * 0.2);
    ctx.lineTo(-r, 0);
    ctx.lineTo(-r * 0.2, -r * 0.2);
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.fill();
    ctx.restore();
  }

  private desenhar(p: Particula) {
    const ctx = this.ctx;
    const t = p.vida / p.max;
    const tam = p.tam + (p.tam1 ? (p.tam1 - p.tam) * Math.min(1, t * 1.15) : 0);
    const fade = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
    const alfa = Math.max(0, Math.min(1, fade)) * p.alfa;
    if (alfa <= 0.003) return;
    ctx.globalCompositeOperation = p.soma ? 'lighter' : 'source-over';
    ctx.globalAlpha = alfa;
    switch (p.forma) {
      case 'brilho':
        ctx.drawImage(this.glow(p.cor), p.x - tam, p.y - tam, tam * 2, tam * 2);
        break;
      case 'fumaca': {
        const s = this.glow(p.cor === '#a855f7' || p.cor === '#e6d4ff' ? '#6d28d9' : p.cor);
        ctx.globalAlpha = alfa * 0.55;
        ctx.drawImage(s, p.x - tam, p.y - tam, tam * 2, tam * 2);
        break;
      }
      case 'faisca': {
        const m = Math.hypot(p.vx, p.vy) || 1;
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = Math.max(1, tam * 0.16);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - (p.vx / m) * tam, p.y - (p.vy / m) * tam);
        ctx.stroke();
        break;
      }
      case 'rocha':
        this.rocha(p.x, p.y, tam * 0.7, p.rot, p.cor, '#ffffff55');
        break;
      case 'gota': {
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - tam * 1.3);
        ctx.quadraticCurveTo(p.x + tam, p.y + tam * 0.2, p.x, p.y + tam * 0.9);
        ctx.quadraticCurveTo(p.x - tam, p.y + tam * 0.2, p.x, p.y - tam * 1.3);
        ctx.fill();
        break;
      }
      case 'estrela':
        this.estrela(p.x, p.y, tam, p.rot, p.cor);
        break;
      case 'cruz': {
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = Math.max(2, tam * 0.45);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - tam, p.y);
        ctx.lineTo(p.x + tam, p.y);
        ctx.moveTo(p.x, p.y - tam);
        ctx.lineTo(p.x, p.y + tam);
        ctx.stroke();
        break;
      }
      case 'folha': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.ellipse(0, 0, tam, tam * 0.45, 0, 0, 6.3);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'pena': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.ellipse(0, 0, tam * 1.6, tam * 0.5, 0, 0, 6.3);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'chama': {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, tam * 1.6);
        g.addColorStop(0, p.cor);
        g.addColorStop(1, p.cor + '00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - tam * 0.4, tam * 0.8, tam * 1.5, 0, 0, 6.3);
        ctx.fill();
        break;
      }
      case 'chevron': {
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = Math.max(2, tam * 0.4);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(-tam, tam * 0.5);
        ctx.lineTo(0, -tam * 0.5);
        ctx.lineTo(tam, tam * 0.5);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'anel': {
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = Math.max(1, 6 * (1 - t));
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, tam, tam * 0.62, 0, 0, 6.3);
        ctx.stroke();
        break;
      }
      case 'cupula': {
        const rx = tam * 1.05;
        const ry = tam * 1.0;
        const g = ctx.createRadialGradient(p.x, p.y - ry * 0.2, tam * 0.15, p.x, p.y, Math.max(rx, ry));
        g.addColorStop(0, p.cor + '00');
        g.addColorStop(0.7, p.cor + '44');
        g.addColorStop(0.94, p.cor + 'bb');
        g.addColorStop(1, '#ffffffee');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx, ry, 0, Math.PI, 0);
        ctx.ellipse(p.x, p.y, rx, ry * 0.32, 0, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx, ry, 0, Math.PI * 1.06, Math.PI * 1.94);
        ctx.stroke();
        ctx.globalAlpha = alfa * 0.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rx, ry * 0.32, 0, 0, Math.PI);
        ctx.stroke();
        break;
      }
      case 'runa': {
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = 3;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, 0.7);
        ctx.beginPath();
        ctx.arc(0, 0, tam, 0, 6.3);
        ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = p.rot + (i / 12) * 6.283;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * tam * 0.82, Math.sin(a) * tam * 0.82);
          ctx.lineTo(Math.cos(a) * tam * 1.12, Math.sin(a) * tam * 1.12);
          ctx.stroke();
        }
        ctx.restore();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(p.x - tam * 0.7, p.y + tam * 0.5);
        ctx.lineTo(p.x + tam * 0.7, p.y - tam * 0.5);
        ctx.stroke();
        break;
      }
      case 'coluna': {
        for (let k = 0; k < 4; k++) {
          const w = tam * (1 - k * 0.24);
          const g = ctx.createLinearGradient(0, p.y - tam * 3.2, 0, p.y + 30);
          g.addColorStop(0, p.cor + '00');
          g.addColorStop(0.55, p.cor + '88');
          g.addColorStop(1, '#ffffffdd');
          ctx.globalAlpha = alfa * (0.28 + k * 0.2);
          ctx.fillStyle = g;
          ctx.fillRect(p.x - w / 2, p.y - tam * 3.2, w, tam * 3.2 + 30);
        }
        break;
      }
    }
  }
}

export const corDoElemento = (el: Elemento) => ELEMENTOS[el].brilho;
