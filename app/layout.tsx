import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Nexo Social / Agendrap',
  description: 'Plataforma de curadoria de entretenimento premium',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-zinc-100 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
