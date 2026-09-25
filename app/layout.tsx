import React from 'react';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Chakra_Petch, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { PreferencesProvider } from '@/lib/preferences';
import { AgendaProvider } from '@/lib/agenda';
import { ReadingProvider } from '@/lib/reading';
import MobileTabBar from '@/components/MobileTabBar';
import PWARegister from '@/components/PWARegister';
import TechBackdrop from '@/components/TechBackdrop';

// Chakra Petch: cortes retos e angulares, cara de painel — usada nos títulos.
const display = Chakra_Petch({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Space Grotesk: sans geométrica, legível em texto corrido — corpo e interface.
const sans = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

// JetBrains Mono: rótulos de HUD, contadores e códigos.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'nexo.social — sua agenda pessoal',
  description: 'Sua agenda pessoal de eventos e conteúdos, perto de você.',
  applicationName: 'nexo.social',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    // Faz o iOS abrir em tela cheia, sem a barra do Safari, quando adicionado
    // à Tela de Início.
    capable: true,
    title: 'nexo.social',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#060a16',
  width: 'device-width',
  initialScale: 1,
  // Necessário para o conteúdo alcançar as bordas em aparelhos com entalhe;
  // o respiro volta pelas env(safe-area-inset-*) no CSS.
  viewportFit: 'cover',
  // Sem maximumScale/userScalable: bloquear zoom quebra a acessibilidade.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
        <TechBackdrop />
        <PreferencesProvider>
          <AgendaProvider>
            <ReadingProvider>
              {children}
              <MobileTabBar />
            </ReadingProvider>
          </AgendaProvider>
        </PreferencesProvider>
        <PWARegister />
      </body>
    </html>
  );
}
