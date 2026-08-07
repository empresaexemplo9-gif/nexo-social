'use client';

// Detecção de plataforma para adaptar instalação e navegação.
//
// A regra que importa: no iOS **nenhum** navegador pode instalar por código —
// nem o Chrome, que lá é o WebKit por baixo. A instalação sai por
// Compartilhar → Adicionar à Tela de Início, e só pelo Safari. Por isso a
// interface precisa mostrar instruções em vez de um botão que não faria nada.

export type Sistema = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'desconhecido';

export interface Plataforma {
  sistema: Sistema;
  ehMobile: boolean;
  /** Já está aberto como app instalado. */
  instalado: boolean;
  /** Safari no iOS — o único que instala lá. */
  ehSafariIOS: boolean;
}

export function detectar(): Plataforma {
  if (typeof window === 'undefined') {
    return { sistema: 'desconhecido', ehMobile: false, instalado: false, ehSafariIOS: false };
  }

  const ua = navigator.userAgent;
  const plataforma = (navigator as any).userAgentData?.platform ?? navigator.platform ?? '';

  // iPad moderno se declara como Mac; o toque desempata.
  const ehIOS =
    /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(plataforma) && navigator.maxTouchPoints > 1);
  const ehAndroid = /Android/.test(ua);

  let sistema: Sistema = 'desconhecido';
  if (ehIOS) sistema = 'ios';
  else if (ehAndroid) sistema = 'android';
  else if (/Win/.test(plataforma) || /Windows/.test(ua)) sistema = 'windows';
  else if (/Mac/.test(plataforma)) sistema = 'macos';
  else if (/Linux|X11/.test(plataforma) || /Linux/.test(ua)) sistema = 'linux';

  const instalado =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // No iOS, Chrome/Firefox/Edge têm marcadores próprios no UA; sem eles é Safari.
  const ehSafariIOS = ehIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

  return { sistema, ehMobile: ehIOS || ehAndroid, instalado, ehSafariIOS };
}
