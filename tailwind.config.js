/** @type {import('tailwindcss').Config} */
// Estética tecnológica: preto-azulado, ciano neon e acentos magenta/violeta,
// como painéis de HUD e placas de circuito.
// As escalas base continuam sobrescritas para reaproveitar as classes já usadas
// em todo o app (zinc = neutros azulados; emerald = ciano da marca;
// clay = magenta neon para os toques de destaque).
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
      },
      colors: {
        // Neutros: azul-marinho frio, do painel quase preto ao texto gelo.
        zinc: {
          50: '#f4f8ff',
          100: '#e3ecfa',
          200: '#c5d3ea',
          300: '#9fb1cf',
          400: '#7a8dae',
          500: '#5f7295',
          600: '#3f4f70',
          700: '#29374f',
          800: '#18223a',
          900: '#0d1426',
          950: '#060a16',
        },
        // Marca — ciano neon.
        emerald: {
          50: '#e5fcff',
          100: '#bff6ff',
          200: '#88eeff',
          300: '#4de3fb',
          400: '#1fd0f2',
          500: '#00b4dd',
          600: '#008fb5',
          700: '#006f8e',
          800: '#065a74',
          900: '#0a4a60',
          950: '#022e3e',
        },
        // Acento — magenta neon (os brilhos rosa das referências).
        clay: {
          50: '#fff0fa',
          100: '#ffd6f1',
          200: '#ffade4',
          300: '#ff7ad2',
          400: '#ff4dbf',
          500: '#ee22a6',
          600: '#c71289',
          700: '#9a0f6b',
          800: '#6f0e4f',
          900: '#4a0b36',
          950: '#29031d',
        },
      },
      // Cantos mais retos: painel de equipamento, não almofada.
      borderRadius: {
        xl: '0.625rem',
        '2xl': '0.875rem',
        '3xl': '1.125rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(0,0,0,0.5), 0 12px 32px -12px rgba(0,0,0,0.7)',
        glow: '0 0 0 1px rgba(31,208,242,0.35), 0 0 22px -2px rgba(31,208,242,0.55)',
        warm: '0 0 0 1px rgba(255,77,191,0.3), 0 0 26px -4px rgba(255,77,191,0.5)',
        neon: '0 0 0 1px rgba(31,208,242,0.18), 0 18px 60px -20px rgba(31,208,242,0.35)',
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
      },
      animation: {
        'girar-lento': 'girar-lento 90s linear infinite',
        varredura: 'varredura 7s linear infinite',
        pulsar: 'pulsar 3.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
