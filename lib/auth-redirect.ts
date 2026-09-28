export function safeAuthDestination(raw: string | null | undefined): string | null {
  if (!raw?.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u0020]/.test(raw)) return null;
  try {
    const url = new URL(raw, 'https://nexo.invalid');
    if (url.origin !== 'https://nexo.invalid' || /^\/(?:login|auth)(?:\/|$)/.test(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}
