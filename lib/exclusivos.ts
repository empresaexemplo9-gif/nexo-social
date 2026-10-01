export type TipoExclusivo = 'sticker' | 'wallpaper';

export interface ItemExclusivo {
  id: string;
  title: string;
  kind: TipoExclusivo;
  collection: string;
  imagePath: string;
  url: string;
  sortOrder: number;
  createdAt?: string;
}

export const CHAVE_FUNDO_EXCLUSIVO = 'nexo:exclusivo:fundo';
export const EVENTO_FUNDO_EXCLUSIVO = 'nexo:fundo-exclusivo';

export interface FundoExclusivoSalvo {
  id: string;
  title: string;
  url: string;
}

export function lerFundoExclusivo(): FundoExclusivoSalvo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CHAVE_FUNDO_EXCLUSIVO);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v.id !== 'string' || typeof v.title !== 'string' || typeof v.url !== 'string') return null;
    if (!/^https:\/\//i.test(v.url)) return null;
    return { id: v.id, title: v.title, url: v.url };
  } catch {
    return null;
  }
}

export function salvarFundoExclusivo(item: FundoExclusivoSalvo | null) {
  if (typeof window === 'undefined') return;
  try {
    if (item) window.localStorage.setItem(CHAVE_FUNDO_EXCLUSIVO, JSON.stringify(item));
    else window.localStorage.removeItem(CHAVE_FUNDO_EXCLUSIVO);
  } catch {
    /* armazenamento indisponível */
  }
  window.dispatchEvent(new CustomEvent(EVENTO_FUNDO_EXCLUSIVO, { detail: item }));
}
