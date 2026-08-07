'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon, { type IconName } from './icons';
import { detectar, type Plataforma } from '@/lib/platform';

interface Aba {
  href: string;
  label: string;
  icon: IconName;
}

const ABAS: Aba[] = [
  { href: '/', label: 'Início', icon: 'sparkles' },
  { href: '/agenda', label: 'Agenda', icon: 'calendarCheck' },
  { href: '/esporte', label: 'Esporte', icon: 'trophy' },
  { href: '/livros', label: 'Livros', icon: 'library' },
  { href: '/conta', label: 'Conta', icon: 'user' },
];

/**
 * Barra de navegação inferior no celular.
 *
 * As duas plataformas usam barra embaixo, mas com convenções diferentes, e as
 * respeitamos:
 *
 * iOS — rótulo sempre visível sob o ícone, item ativo só pela cor (sem
 * pílula de fundo), tipografia menor, e respiro extra para o indicador de
 * início do iPhone via env(safe-area-inset-bottom).
 *
 * Android — o item ativo ganha a pílula de fundo do Material 3, o ícone do
 * ativo é preenchido, e a barra tem altura menor porque a navegação do
 * sistema já ocupa espaço embaixo. Também tratamos o botão Voltar do
 * aparelho: quando o app está instalado e a pessoa está na raiz, o Voltar
 * fecharia o app; aqui ele apenas sai da navegação normalmente.
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [plat, setPlat] = useState<Plataforma | null>(null);

  useEffect(() => {
    setPlat(detectar());
  }, []);

  // Pré-carrega os destinos: no celular a diferença é perceptível.
  useEffect(() => {
    ABAS.forEach((a) => router.prefetch(a.href));
  }, [router]);

  if (!plat || !plat.ehMobile) return null;

  const ios = plat.sistema === 'ios';

  return (
    <>
      {/*
        Espaçador: impede a barra de cobrir o fim do conteúdo.
        A altura precisa somar a área segura de baixo — no iPhone com indicador
        de início são ~34px que a barra ocupa a mais. Sem somar, o último item
        da página fica escondido atrás dela.
      */}
      <div
        id="espacador-barra"
        aria-hidden
        className="md:hidden"
        style={{ height: `calc(${ios ? '4.5rem' : '4rem'} + env(safe-area-inset-bottom))` }}
      />

      <nav
        aria-label="Navegação principal"
        // iOS usa barra translúcida com desfoque; o Material 3 usa barra
        // opaca. Deixar as duas translúcidas fazia o conteúdo vazar por baixo
        // no Android, o que nenhum app nativo de lá faz.
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800/80 md:hidden ${
          ios ? 'bg-zinc-950/80 backdrop-blur-xl' : 'bg-zinc-950'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className={`mx-auto flex max-w-lg items-stretch justify-around ${ios ? 'px-1 pt-1.5 pb-1' : 'px-2 py-1.5'}`}>
          {ABAS.map((aba) => {
            const ativo = aba.href === '/' ? pathname === '/' : pathname.startsWith(aba.href);
            return (
              <li key={aba.href} className="flex-1">
                <Link
                  href={aba.href}
                  aria-current={ativo ? 'page' : undefined}
                  className={`flex touch-manipulation select-none flex-col items-center gap-0.5 rounded-2xl transition ${
                    ios ? 'py-1' : 'py-1.5'
                  } ${ativo ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300'}`}
                >
                  <span
                    className={
                      // A pílula do ativo é convenção do Material (Android).
                      // No iOS o padrão é só a cor mudar.
                      !ios && ativo
                        ? 'flex h-8 w-16 items-center justify-center rounded-full bg-emerald-500/15'
                        : 'flex h-8 w-16 items-center justify-center'
                    }
                  >
                    <Icon name={aba.icon} size={ios ? 23 : 22} />
                  </span>
                  <span className={ios ? 'text-[10px] font-medium leading-none' : 'text-[11px] leading-none'}>
                    {aba.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
