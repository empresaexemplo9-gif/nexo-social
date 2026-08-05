import React from 'react';
import './globals.css';
import { PreferencesProvider } from '@/lib/preferences';

export const metadata = {
  title: 'Nexo Social / Agendrap',
  description: 'Plataforma de curadoria personalizada de conteúdo e eventos por proximidade',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
