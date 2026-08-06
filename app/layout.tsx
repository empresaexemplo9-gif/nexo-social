import React from 'react';
import './globals.css';
import { Fraunces, Space_Grotesk } from 'next/font/google';
import { PreferencesProvider } from '@/lib/preferences';
import { AgendaProvider } from '@/lib/agenda';

// Fraunces: serif "old style" com calor vintage — usada nos títulos.
const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

// Space Grotesk: sans geométrica com ar futurista — corpo e interface.
const sans = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  title: 'nexo.social — sua agenda pessoal',
  description: 'Sua agenda pessoal de eventos e conteúdos, perto de você.',
  icons: { icon: '/logo.svg', apple: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
        <PreferencesProvider>
          <AgendaProvider>{children}</AgendaProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
