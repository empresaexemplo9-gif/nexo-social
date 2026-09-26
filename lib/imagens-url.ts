// Endereço das imagens do bucket público "perfis" (foto de perfil e imagem
// do grupo). Puro: serve no servidor e no navegador. As fotos dos grupos
// ficam no bucket privado "comunidade" e só saem por link assinado (ver
// lib/comunidade.ts).

import { resolveSupabaseUrl } from './supabase-config';

export function urlPublica(path?: string | null): string | null {
  if (!path) return null;
  return `${resolveSupabaseUrl()}/storage/v1/object/public/perfis/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/** Caminho válido de imagem dentro de uma pasta (o nome é sempre gerado pelo app). */
export function caminhoValido(path: unknown, pasta: string): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith(`${pasta}/`) &&
    /^[\w-]+\.(jpg|jpeg|png|webp|gif)$/i.test(path.slice(pasta.length + 1))
  );
}
