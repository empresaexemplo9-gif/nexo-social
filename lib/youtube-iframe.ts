'use client';

// Carrega (uma vez) a API do player do YouTube, para controlar os vídeos
// embutidos: saber quando um termina, quando falha e o que está tocando.

let api: Promise<void> | null = null;

export function carregarApiDoYoutube(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!api) {
    api = new Promise<void>((resolve, reject) => {
      const anterior = window.onYouTubeIframeAPIReady;
      const limite = window.setTimeout(() => {
        api = null;
        reject(new Error('A API do YouTube não respondeu.'));
      }, 15000);
      window.onYouTubeIframeAPIReady = () => {
        anterior?.();
        clearTimeout(limite);
        resolve();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => {
          clearTimeout(limite);
          api = null;
          script.remove();
          reject(new Error('A API do YouTube não carregou.'));
        };
        document.head.appendChild(script);
      }
    });
  }
  return api;
}
