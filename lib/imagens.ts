'use client';

// Envio de imagens direto do navegador para o Supabase Storage.
//
// Antes de subir, a foto é reduzida num <canvas>: a do celular sai de 4–12 MB
// para algumas centenas de KB, o mural carrega rápido no 4G e, de brinde, os
// metadados da câmera (inclusive a localização por GPS) ficam para trás. O
// envio vai direto ao Storage, sem passar pelo servidor do app — que tem
// limite de tamanho de requisição.

import { supabase } from './supabase';

export interface ImagemPronta {
  blob: Blob;
  ext: 'jpg' | 'gif';
  width: number;
  height: number;
}

const ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif', ''];

/**
 * Reduz a imagem para no máximo `max` px no lado maior, em JPEG. GIF animado
 * segue como veio (se couber em `maxBytesGif`), para não perder a animação.
 * `quadrado`: corta no centro (foto de perfil).
 */
export async function prepararImagem(
  file: File,
  { max, qualidade = 0.85, quadrado = false, manterGif = false, maxBytesGif = 8 * 1024 * 1024 }: {
    max: number;
    qualidade?: number;
    quadrado?: boolean;
    manterGif?: boolean;
    maxBytesGif?: number;
  },
): Promise<ImagemPronta> {
  if (!file.type.startsWith('image/') && !ACEITOS.includes(file.type)) {
    throw new Error(`"${file.name}" não é uma imagem.`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  } catch {
    throw new Error(`Não consegui abrir "${file.name}". Envie em JPG, PNG ou WebP.`);
  }

  if (manterGif && file.type === 'image/gif' && file.size <= maxBytesGif) {
    const r = { blob: file as Blob, ext: 'gif' as const, width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return r;
  }

  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (quadrado) {
    const lado = Math.min(sw, sh);
    sx = (sw - lado) / 2;
    sy = (sh - lado) / 2;
    sw = sh = lado;
  }
  const escala = Math.min(1, max / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * escala));
  const h = Math.max(1, Math.round(sh * escala));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador não consegue preparar a imagem.');
  // PNG transparente vira JPEG: fundo branco em vez de preto.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', qualidade));
  if (!blob) throw new Error('Não consegui preparar a imagem.');
  return { blob, ext: 'jpg', width: w, height: h };
}

export const novoNome = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Sobe um arquivo; o nome é sempre novo (nada é sobrescrito). */
export async function enviarImagem(bucket: 'perfis' | 'comunidade', path: string, img: ImagemPronta) {
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase.storage.from(bucket).upload(path, img.blob, {
    contentType: img.ext === 'gif' ? 'image/gif' : 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) {
    const msg = error.message || '';
    if (/row-level security|unauthorized|403/i.test(msg)) throw new Error('Você não tem permissão para enviar imagens aqui.');
    if (/too large|size/i.test(msg)) throw new Error('A imagem é grande demais.');
    if (/bucket not found/i.test(msg)) throw new Error('O armazenamento de imagens ainda não foi configurado (rode o db/schema.sql).');
    throw new Error(`Falha ao enviar a imagem: ${msg}`);
  }
}

export async function apagarImagens(bucket: 'perfis' | 'comunidade', paths: string[]) {
  if (!supabase || !paths.length) return;
  await supabase.storage.from(bucket).remove(paths).catch(() => undefined);
}

export interface FotoEnviada {
  path: string;
  thumbPath: string;
  width: number;
  height: number;
}

/**
 * Prepara e envia fotos para o grupo: a imagem (até 2048 px) e uma miniatura
 * (480 px) de cada uma. Se uma falhar, apaga as que já subiram.
 */
export async function enviarFotosDoGrupo(
  groupId: string,
  files: File[],
  aoProgredir?: (feitas: number, total: number) => void,
): Promise<FotoEnviada[]> {
  const feitas: FotoEnviada[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      aoProgredir?.(i, files.length);
      const [grande, mini] = await Promise.all([
        prepararImagem(file, { max: 2048, manterGif: true }),
        prepararImagem(file, { max: 480, qualidade: 0.75 }),
      ]);
      const nome = novoNome();
      const path = `grupos/${groupId}/${nome}.${grande.ext}`;
      const thumbPath = `grupos/${groupId}/${nome}_p.jpg`;
      await enviarImagem('comunidade', path, grande);
      feitas.push({ path, thumbPath: '', width: grande.width, height: grande.height });
      await enviarImagem('comunidade', thumbPath, mini);
      feitas[feitas.length - 1].thumbPath = thumbPath;
    }
    aoProgredir?.(files.length, files.length);
    return feitas;
  } catch (e) {
    await apagarImagens('comunidade', feitas.flatMap((f) => [f.path, f.thumbPath]).filter(Boolean));
    throw e;
  }
}

/** Imagem do grupo (só o dono): sobe para "perfis" e grava no grupo. Devolve o caminho. */
export async function trocarImagemDoGrupo(groupId: string, file: File): Promise<string> {
  const img = await prepararImagem(file, { max: 800, quadrado: true, qualidade: 0.86 });
  const path = `grupos/${groupId}/${novoNome()}.jpg`;
  await enviarImagem('perfis', path, img);
  const res = await fetch(`/api/comunidade/grupos/${groupId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagePath: path }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    await apagarImagens('perfis', [path]);
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return path;
}
