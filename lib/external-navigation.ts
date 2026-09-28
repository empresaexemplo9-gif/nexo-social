/** Links de navegação externa e entradas OAuth preservam a aba da plataforma. */
export function opensNewTab(href: string, origin: string): boolean {
  try {
    const url = new URL(href, origin);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    return url.origin !== origin || ['/api/youtube/entrar', '/api/spotify/entrar'].includes(url.pathname);
  } catch { return false; }
}
