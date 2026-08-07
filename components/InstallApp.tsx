'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from './icons';
import { detectar, type Plataforma } from '@/lib/platform';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CHAVE_DISPENSADO = 'nexo:instalar:dispensado';

/**
 * "Baixar app".
 *
 * Android, Windows, macOS e Linux: o navegador dispara `beforeinstallprompt` e
 * a instalação acontece com um clique.
 *
 * iOS: não existe API de instalação — nem no Chrome, que lá roda sobre o
 * WebKit. O único caminho é Compartilhar → Adicionar à Tela de Início, no
 * Safari. Então mostramos o passo a passo em vez de um botão que não faria
 * nada.
 */
export default function InstallApp({ compacto = false }: { compacto?: boolean }) {
  const [plat, setPlat] = useState<Plataforma | null>(null);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [passos, setPassos] = useState(false);
  const [dispensado, setDispensado] = useState(true);

  useEffect(() => {
    setPlat(detectar());
    try {
      setDispensado(window.localStorage.getItem(CHAVE_DISPENSADO) === '1');
    } catch {
      setDispensado(false);
    }

    const aoInstalar = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', aoInstalar);

    const instalou = () => {
      setPrompt(null);
      setPlat((p) => (p ? { ...p, instalado: true } : p));
    };
    window.addEventListener('appinstalled', instalou);

    return () => {
      window.removeEventListener('beforeinstallprompt', aoInstalar);
      window.removeEventListener('appinstalled', instalou);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!prompt) {
      setPassos(true);
      return;
    }
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setPrompt(null);
  }, [prompt]);

  const dispensar = () => {
    setDispensado(true);
    try {
      window.localStorage.setItem(CHAVE_DISPENSADO, '1');
    } catch {
      /* sem armazenamento — reaparece na próxima visita */
    }
  };

  if (!plat || plat.instalado) return null;

  const ios = plat.sistema === 'ios';
  const rotulo = plat.ehMobile ? 'Instalar no celular' : 'Instalar no computador';

  // Versão compacta: só o botão, para a barra de navegação.
  if (compacto) {
    return (
      <>
        <button
          onClick={instalar}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition hover:border-emerald-600 hover:text-emerald-300"
        >
          <Icon name="download" size={13} /> Baixar app
        </button>
        {passos && <PassosIOS plat={plat} onClose={() => setPassos(false)} />}
      </>
    );
  }

  if (dispensado) return null;

  return (
    <section className="rounded-3xl border border-emerald-900/50 bg-emerald-950/15 p-5">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-800/60 bg-zinc-950/60 text-emerald-400">
            <Icon name="download" size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-zinc-50">Tenha a nexo.social como app</h2>
            <p className="mt-0.5 text-sm text-zinc-300">
              {ios
                ? 'No iPhone e no iPad, dá para adicionar à tela de início em dois toques.'
                : 'Abre em janela própria, sem barra de endereço, e aparece junto dos seus outros apps.'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={dispensar} className="text-xs text-zinc-500 transition hover:text-zinc-300">
            Agora não
          </button>
          <button
            onClick={instalar}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            <Icon name="download" size={15} /> {ios ? 'Como instalar' : rotulo}
          </button>
        </div>
      </div>
      {passos && <PassosIOS plat={plat} onClose={() => setPassos(false)} />}
    </section>
  );
}

/** Passo a passo para quem não tem instalação por código. */
function PassosIOS({ plat, onClose }: { plat: Plataforma; onClose: () => void }) {
  const ios = plat.sistema === 'ios';

  const passos = ios
    ? plat.ehSafariIOS
      ? [
          'Toque no botão Compartilhar, na barra de baixo (o quadrado com a seta para cima).',
          'Role a lista e toque em "Adicionar à Tela de Início".',
          'Confirme em "Adicionar", no canto superior direito.',
        ]
      : [
          'No iPhone e no iPad, só o Safari instala aplicativos — mesmo o Chrome usa o motor da Apple e não tem essa opção.',
          'Abra nexo-social-two.vercel.app no Safari.',
          'Toque em Compartilhar → "Adicionar à Tela de Início".',
        ]
    : [
        'Procure o ícone de instalar na barra de endereço (um monitor com uma seta, ou ⋮ → Instalar).',
        'Confirme em "Instalar".',
        'Se o ícone não aparecer, o navegador pode não suportar instalação — Chrome, Edge e Brave suportam.',
      ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-zinc-50">
          {ios ? 'Adicionar à Tela de Início' : 'Instalar o app'}
        </h3>
        <ol className="mt-4 space-y-3">
          {passos.map((p, i) => (
            <li key={p} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-zinc-950">
                {i + 1}
              </span>
              {p}
            </li>
          ))}
        </ol>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
