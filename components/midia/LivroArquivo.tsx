'use client';
import React, { useEffect, useRef, useState } from 'react';

export default function LivroArquivo({ id, titulo }: { id: string; titulo: string }) {
  const [pdf, setPdf] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const arquivo = useRef<{ url: string; nome: string } | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); if (arquivo.current) URL.revokeObjectURL(arquivo.current.url); }, []);
  async function abrir(baixar: boolean) {
    if (carregando) return;
    setErro(''); setCarregando(true);
    const abort = new AbortController(); controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 90000);
    try {
      if (!arquivo.current) {
        const r = await fetch(`/api/livros-arquivo?id=${encodeURIComponent(id)}`, { signal: abort.signal });
        const j = await r.json(); if (!r.ok) throw new Error(j.error || 'PDF indisponível.');
        if (!Number.isInteger(j.tamanho) || j.tamanho <= 0 || j.tamanho > 40 * 1024 * 1024) throw new Error('Tamanho de PDF inválido.');
        const chunks: ArrayBuffer[] = [];
        const partes = Math.ceil(j.tamanho / (1024 * 1024));
        for (let parte = 0; parte < partes; parte++) {
          const response = await fetch(`/api/livros-arquivo?id=${encodeURIComponent(id)}&parte=${parte}`, { signal: abort.signal });
          if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.error || 'Não foi possível baixar o PDF.'); }
          chunks.push(await response.arrayBuffer());
        }
        const blob = new Blob(chunks as BlobPart[], { type: 'application/pdf' });
        if (!(await blob.slice(0,5).text()).startsWith('%PDF-')) throw new Error('A fonte não entregou um PDF válido.');
        arquivo.current = { url: URL.createObjectURL(blob), nome: j.nome };
      }
      setPdf(arquivo.current.url);
      if (baixar) { const a = document.createElement('a'); a.href = arquivo.current.url; a.download = arquivo.current.nome; document.body.appendChild(a); a.click(); a.remove(); }
    } catch (e) { if (!abort.signal.aborted) setErro(e instanceof Error ? e.message : 'Falha ao baixar.'); else setErro('Download interrompido. Tente novamente.'); }
    finally { window.clearTimeout(timeout); setCarregando(false); }
  }
  return <div className="flex h-full min-h-[70vh] flex-col">
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-700 p-3 text-sm">
      <button type="button" disabled={carregando} onClick={() => void abrir(false)} className="action-collage px-3 py-2">{carregando ? 'Carregando PDF…' : 'Abrir PDF aqui'}</button>
      <button type="button" disabled={carregando} onClick={() => void abrir(true)} className="action-collage px-3 py-2">Baixar PDF</button>
      {pdf && <button type="button" onClick={() => setPdf(null)} className="underline">Voltar ao leitor digital</button>}
      {erro && <p role="alert">{erro}</p>}
    </div>
    <iframe src={pdf ?? `https://archive.org/embed/${encodeURIComponent(id)}`} title={titulo} allowFullScreen className="min-h-[60vh] w-full flex-1" />
  </div>;
}
