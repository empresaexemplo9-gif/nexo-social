/** @type {import('tailwindcss').Config} */
// Paleta derivada da logo: monograma teal sobre quase-preto.
// Sobrescrevemos as escalas base para reaproveitar as classes já usadas
// (zinc = neutros quentes e macios; emerald = teal da marca).
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
        // Neutros: carvão levemente quente — acolhedor sem virar marrom.
        zinc: {
          50: '#faf8f6',
          100: '#f0ece8',
          200: '#ded7d1',
          300: '#c3b9b1',
          400: '#9e938b',
          500: '#7c716a',
          600: '#5f5651',
          700: '#463f3b',
          800: '#2f2a27',
          900: '#1c1a18',
          950: '#121110',
        },
        // Marca — teal do monograma da logo.
        emerald: {
          50: '#e9faf8',
          100: '#c8f2ef',
          200: '#94e5e0',
          300: '#5bd2cd',
          400: '#2bb8b2',
          500: '#159c99',
          600: '#0f7f7d',
          700: '#0d6664',
          800: '#0c5150',
          900: '#0b4241',
          950: '#052624',
        },
        // Acento quente (argila suave) — só para toques de calor.
        clay: {
          50: '#fdf4f0',
          100: '#fae3d9',
          200: '#f3c4b1',
          300: '#e9a184',
          400: '#e2825f',
          500: '#d16843',
          600: '#b45333',
          700: '#91422a',
          800: '#6f3524',
          900: '#552a1e',
          950: '#2e140d',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // Sombras suaves = sensação de aconchego (nada de contorno duro).
        soft: '0 2px 8px -2px rgba(0,0,0,0.4), 0 12px 32px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(43,184,178,0.16), 0 10px 40px -14px rgba(21,156,153,0.45)',
        warm: '0 18px 50px -22px rgba(226,130,95,0.35)',
      },
    },
  },
  plugins: [],
};
