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
        zinc: {
          50: '#16181d',
          100: '#23262d',
          200: '#343842',
          300: '#4a4f5b',
          400: '#5d6270',
          500: '#646976',
          600: '#a39e95',
          700: '#d4ccbf',
          800: '#e9e3d7',
          900: '#fffdf8',
          950: '#f6f2ea',
        },
        // Marca — azul-marinho. 400 é o botão/link; os mais baixos, mais escuros.
        emerald: {
          50: '#0f213d',
          100: '#16294a',
          200: '#1c3a63',
          300: '#234676',
          400: '#2b5288',
          500: '#3d67a3',
          600: '#6a8cc0',
          700: '#9fb6d9',
          800: '#c9d7ec',
          900: '#e3ebf6',
          950: '#f0f4fa',
        },
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
