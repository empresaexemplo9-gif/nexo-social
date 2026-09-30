/** @type {import('tailwindcss').Config} */
// Estética "papel e tinta": fundo creme claro, azul-marinho, laranja e preto,
// com um pouco do painel tecnológico de antes (grade, circuitos, rótulos mono)
// em traço fino.
//
// As escalas base continuam sobrescritas para reaproveitar as classes já usadas
// em todo o app. O tema era escuro e virou claro, então as escalas estão
// INVERTIDAS (950 é o mais claro, 50 o mais escuro): `bg-zinc-950` segue sendo
// "o fundo", `text-zinc-100` segue sendo "o texto", `text-red-200` segue sendo
// "o texto de erro" — só que agora legíveis no claro.
//   zinc    = papel e tinta (neutros quentes)
//   emerald = azul-marinho da marca
//   clay    = laranja de destaque
const cores = require('tailwindcss/colors');

/** Inverte uma escala do Tailwind: 50↔950, 100↔900, … (500 fica). */
function invertida(escala) {
  const passos = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  return Object.fromEntries(passos.map((p, i) => [p, escala[passos[passos.length - 1 - i]]]));
}

/** Escala cujas cores vêm de variáveis "r g b" (aceita /opacidade). */
function escalaDeVariavel(nome) {
  const passos = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  return Object.fromEntries(passos.map((p) => [p, `rgb(var(--${nome}-${p}) / <alpha-value>)`]));
}

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        mao: ['var(--font-mao)', 'cursive'],
      },
      colors: {
        // Papel e tinta: 950 é o papel da página, 900 o cartão (mais claro que
        // o papel), 800/700 os fios, 500–50 a tinta, do texto apagado ao preto.
        // As duas escalas vêm de variáveis CSS (app/globals.css), com os mesmos
        // valores de antes: é o que deixa cada pessoa trocar a cor dos botões e
        // destaques (emerald) e a home clarear a tinta sobre um fundo escuro.
        zinc: escalaDeVariavel('tinta'),
        // Marca — azul-marinho. 400 é o botão/link; os mais baixos, mais escuros.
        emerald: escalaDeVariavel('acento'),
        // Acento — laranja. 500 é o preenchimento; 300 o texto sobre o papel.
        clay: {
          50: '#4a1a05',
          100: '#6b2608',
          200: '#8f330b',
          300: '#b8480f',
          400: '#c9511a',
          500: '#ec6a2c',
          600: '#f28d5c',
          700: '#f7b08c',
          800: '#fbd2bc',
          900: '#fde6d9',
          950: '#fff3ec',
        },
        red: invertida(cores.red),
        amber: invertida(cores.amber),
        sky: invertida(cores.sky),
        lime: invertida(cores.lime),
        fuchsia: invertida(cores.fuchsia),
        violet: invertida(cores.violet),
        orange: invertida(cores.orange),
        teal: invertida(cores.teal),
        rose: invertida(cores.rose),
        pink: invertida(cores.pink),
        cyan: invertida(cores.cyan),
      },
      // Cantos macios, mas não de almofada.
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.375rem',
        '4xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(22,24,29,0.05), 0 12px 32px -14px rgba(22,24,29,0.22)',
        glow: '0 0 0 1px rgba(43,82,136,0.16), 0 10px 22px -10px rgba(43,82,136,0.6)',
        warm: '0 0 0 1px rgba(236,106,44,0.22), 0 10px 22px -10px rgba(236,106,44,0.6)',
        neon: '0 0 0 1px rgba(43,82,136,0.08), 0 26px 60px -30px rgba(43,82,136,0.45)',
      },
      backgroundImage: {
        hexagonos: "url('/bg/hexagonos.svg')",
        circuito: "url('/bg/circuito.svg')",
        hud: "url('/bg/hud.svg')",
        chip: "url('/bg/chip.svg')",
        'linhas-luz': "url('/bg/linhas-luz.svg')",
        grade: "url('/bg/grade.svg')",
        rede: "url('/bg/rede.svg')",
      },
      keyframes: {
        'girar-lento': { to: { transform: 'rotate(360deg)' } },
        varredura: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        pulsar: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
        flutuar: { '0%,100%': { transform: 'translateY(0) rotate(var(--giro, 0deg))' }, '50%': { transform: 'translateY(-6px) rotate(var(--giro, 0deg))' } },
        deriva: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(4%,3%,0) scale(1.06)' },
          '66%': { transform: 'translate3d(-3%,5%,0) scale(0.97)' },
        },
      },
      animation: {
        'girar-lento': 'girar-lento 90s linear infinite',
        varredura: 'varredura 7s linear infinite',
        pulsar: 'pulsar 3.2s ease-in-out infinite',
        flutuar: 'flutuar 6s ease-in-out infinite',
        deriva: 'deriva 28s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
