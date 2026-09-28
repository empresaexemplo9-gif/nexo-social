import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { arquivoDoLivro } from '@/lib/livros-abertos';
export async function GET(request: Request) {
  const { user } = await getSession();
  if (!user || user.is_anonymous) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,199}$/.test(id)) return NextResponse.json({ error: 'Livro inválido.' }, { status: 400 });
  try {
    const file = await arquivoDoLivro(id);
    const params = new URL(request.url).searchParams;
    if (!params.has('parte')) return NextResponse.json({ nome: file.nome, tamanho: file.tamanho }, { headers: { 'Cache-Control': 'private, no-store' } });
    const parte = Number(params.get('parte'));
    const bloco = 1024 * 1024;
    if (!Number.isInteger(parte) || parte < 0 || parte * bloco >= file.tamanho) return NextResponse.json({ error: 'Parte inválida.' }, { status: 400 });
    const inicio = parte * bloco, fim = Math.min(file.tamanho - 1, inicio + bloco - 1);
    const response = await fetch(file.url, { headers: { Range: `bytes=${inicio}-${fim}` }, cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (response.status !== 206 && !(response.status === 200 && inicio === 0 && file.tamanho <= bloco)) throw new Error('A fonte não permitiu baixar este PDF em partes. Use o leitor digital.');
    if (response.status === 206 && response.headers.get('content-range') !== `bytes ${inicio}-${fim}/${file.tamanho}`) throw new Error('Resposta de download inválida.');
    if (!response.body) throw new Error('PDF indisponível.');
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > bloco) { await reader.cancel(); throw new Error('Resposta maior que o esperado.'); } chunks.push(value); }
    if (total !== fim - inicio + 1) throw new Error('Download incompleto. Tente novamente.');
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'PDF indisponível.' }, { status: 502 }); }
}
