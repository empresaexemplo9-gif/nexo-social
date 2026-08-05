/** @type {import('tailwindcss').Config} */
// Paleta "vintage-futurista" acolhedora do nexo-social.
// Sobrescrevemos as escalas base do Tailwind para reaproveitar as classes já
// usadas no app (zinc = neutros quentes de areia/café; emerald = teal retrô da
// marca). Os acentos por tema (fuchsia/rose/amber/sky) permanecem como pops
// vibrantes sobre o fundo quente.
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
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        // Neutros quentes (areia → café torrado)
        zinc: {
          50: '#faf7f2',
          100: '#f3ece0',
          200: '#e5d8c4',
          300: '#d1bda0',
          400: '#b39b7b',
          500: '#94795b',
          600: '#755e45',
          700: '#574636',
          800: '#3a2f24',
          900: '#241d15',
          950: '#17120c',
        },
        // Marca — teal-menta retrô (futurista, legível sobre o fundo quente)
        emerald: {
          50: '#eafaf5',
          100: '#cdf3e7',
          200: '#9fe8d4',
          300: '#66d7bd',
          400: '#34c3a4',
          500: '#14a88a',
          600: '#0b8a72',
          700: '#0b6d5b',
          800: '#0d564a',
          900: '#0e463d',
          950: '#042b25',
        },
        // Acento quente extra (terracota/argila) para brilhos e detalhes
        clay: {
          50: '#fdf3ee',
          100: '#fadfd2',
          200: '#f4bda5',
          300: '#ee9a78',
          400: '#e8845a',
          500: '#db6a3f',
          600: '#c1542c',
          700: '#a04324',
          800: '#7d3520',
          900: '#5f2a1b',
          950: '#33140c',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(52,195,164,0.15), 0 8px 40px -12px rgba(52,195,164,0.35)',
        warm: '0 20px 60px -20px rgba(219,106,63,0.35)',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
