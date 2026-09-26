import type { MetadataRoute } from 'next';

/**
 * Manifesto do app instalável.
 *
 * É o que permite instalar a nexo.social no Android, no Windows, no macOS e no
 * Linux direto do navegador — sem loja de aplicativos. No iOS o Safari não usa
 * `display`/`shortcuts`, mas respeita nome e ícone via as meta tags apple-* do
 * layout, e a instalação sai por "Adicionar à Tela de Início".
 */
/** Versão do ícone — mude ao trocar os arquivos de ícone. */
const ICONE = 'selo-2';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'nexo.social — interesses e hobbies',
    short_name: 'nexo.social',
    description:
      'Sua agenda pessoal, seus nichos, trilha do Spotify, biblioteca e esporte ao vivo — tudo em um lugar.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f6f2ea',
    theme_color: '#f6f2ea',
    lang: 'pt-BR',
    dir: 'ltr',
    categories: ['lifestyle', 'entertainment', 'social'],
    // Ícone do app instalado: o selo (public/icon-*.png, gerados da arte
    // original). O `?v=` muda a URL a cada troca de ícone — é assim que o
    // Android e o desktop percebem que o ícone mudou e atualizam o instalado.
    icons: [
      { src: `/icon-192.png?v=${ICONE}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/icon-512.png?v=${ICONE}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Maskable com folga: o Android recorta em círculo/squircle conforme o
      // aparelho, e sem margem o texto do selo seria cortado.
      { src: `/icon-maskable-192.png?v=${ICONE}`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: `/icon-maskable-512.png?v=${ICONE}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Atalhos de toque longo no ícone (Android e desktop).
    shortcuts: [
      { name: 'Compromissos', short_name: 'Agenda', url: '/agenda' },
      { name: 'Esporte ao vivo', short_name: 'Esporte', url: '/esporte' },
      { name: 'Livros que li esse ano', short_name: 'Livros', url: '/livros' },
    ],
  };
}
