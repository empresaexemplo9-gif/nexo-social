'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '../icons';
import { useReading } from '@/lib/reading';

interface Capitulo {
  titulo: string;
  paragrafos: string[];
}
interface Livro {
  id: number;
  titulo: string;
  autor: string | null;
  idioma?: string | null;
  capitulos: Capitulo[];
  link: string;
}

const TAMANHOS = [15, 17, 19, 21, 24];

// Fontes pensadas para leitura longa e o "papel" do leitor. Valem para todos
// os livros e ficam guardadas no aparelho.
const FONTES = {
  literata: { rotulo: 'Literata', familia: "'Literata', Georgia, 'Times New Roman', serif" },
  atkinson: { rotulo: 'Atkinson', familia: "'Atkinson Hyperlegible', system-ui, sans-serif" },
} as const;
const PAPEIS = {
  claro: { rotulo: 'Claro', fundo: '#fffdf8', tinta: '#1f1b16', suave: '#6b6257' },
  sepia: { rotulo: 'Sépia', fundo: '#f4ecd8', tinta: '#3a2e22', suave: '#7a6650' },
  noite: { rotulo: 'Noite', fundo: '#16181d', tinta: '#e8e3d9', suave: '#9d978c' },
} as const;
type Fonte = keyof typeof FONTES;
type Papel = keyof typeof PAPEIS;
const CHAVE_ESTILO = 'nexo:leitor:estilo';

function lerEstilo(): { fonte: Fonte; papel: Papel } {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_ESTILO) || '{}');
    return { fonte: v.fonte in FONTES ? v.fonte : 'literata', papel: v.papel in PAPEIS ? v.papel : 'claro' };
  } catch {
    return { fonte: 'literata', papel: 'claro' };
  }
}

function lerMarcador(id: number): { cap: number; tam: number } {
  try {
    const v = JSON.parse(localStorage.getItem(`nexo:leitor:${id}`) || '{}');
    return { cap: Number(v.cap) || 0, tam: Number.isInteger(v.tam) ? v.tam : 2 };
  } catch {
    return { cap: 0, tam: 2 };
  }
}

/**
 * Leitor de livros da plataforma: capítulos, tamanho de letra e o marcador de
 * onde parou (fica no aparelho). O texto vem do Projeto Gutenberg já dividido
 * pela /api/leitor.
 */
export default function Leitor({ id, capa }: { id: number; capa?: string | null }) {
  const [livro, setLivro] = useState<Livro | null>(null);
  const [erro, setErro] = useState('');
  const [cap, setCap] = useState(0);
  const [tam, setTam] = useState(2);
  const [fonte, setFonte] = useState<Fonte>('literata');
  const [papel, setPapel] = useState<Papel>('claro');
  const rolagem = useRef<HTMLDivElement>(null);
  const { find, add } = useReading();
  const naEstante = find('gutenberg', `gutenberg-${id}`);

  useEffect(() => {
    const m = lerMarcador(id);
    setCap(m.cap);
    setTam(m.tam);
    const e = lerEstilo();
    setFonte(e.fonte);
    setPapel(e.papel);
    let vivo = true;
    fetch(`/api/leitor?id=${id}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        if (vivo) setLivro(j);
      })
      .catch((e) => vivo && setErro(e.message || 'Não foi possível abrir o livro.'));
    return () => {
      vivo = false;
    };
  }, [id]);

  useEffect(() => {
    try {
      localStorage.setItem(`nexo:leitor:${id}`, JSON.stringify({ cap, tam }));
    } catch {
      // sem armazenamento: o leitor funciona, só não lembra onde parou
    }
    rolagem.current?.scrollTo({ top: 0 });
  }, [id, cap, tam]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_ESTILO, JSON.stringify({ fonte, papel }));
    } catch {
      /* sem armazenamento: vale só nesta leitura */
    }
  }, [fonte, papel]);

  if (erro) {
    return (
      <div className="p-8 text-center text-sm text-zinc-400">
        <p>{erro}</p>
      </div>
    );
  }
  if (!livro) {
    return (
      <div className="space-y-3 p-8" aria-busy="true">
        <div className="h-6 w-2/3 animate-pulse rounded bg-zinc-800" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-zinc-800/70" style={{ width: `${70 + ((i * 13) % 30)}%` }} />
        ))}
      </div>
    );
  }

  const total = livro.capitulos.length;
  const atual = livro.capitulos[Math.min(cap, total - 1)];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-950/70 px-4 py-2.5">
        <select
          value={Math.min(cap, total - 1)}
          onChange={(e) => setCap(Number(e.target.value))}
          aria-label="Capítulo"
          className="min-w-0 max-w-[16rem] flex-1 truncate rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100"
        >
          {livro.capitulos.map((c, i) => (
            <option key={i} value={i}>
              {c.titulo}
            </option>
          ))}
        </select>
        <span className="font-mono text-[11px] text-zinc-500">
          {Math.min(cap, total - 1) + 1}/{total}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className="action-collage px-2 py-1 text-xs" onClick={() => {
            const texto = [livro.titulo, livro.autor ?? '', ...livro.capitulos.flatMap(c => [c.titulo, ...c.paragrafos]), `Fonte: ${livro.link}`].join('\n\n');
            const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
            const a = document.createElement('a'); a.href = url; a.download = `livro-${id}.txt`; document.body.appendChild(a); a.click(); a.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}>Baixar texto</button>
          <select
            value={fonte}
            onChange={(e) => setFonte(e.target.value as Fonte)}
            aria-label="Fonte do texto"
            className="h-8 rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 text-xs text-zinc-200"
            style={{ fontFamily: FONTES[fonte].familia }}
          >
            {(Object.keys(FONTES) as Fonte[]).map((k) => (
              <option key={k} value={k} style={{ fontFamily: FONTES[k].familia }}>{FONTES[k].rotulo}</option>
            ))}
          </select>
          <div role="radiogroup" aria-label="Cor do papel" className="flex items-center gap-1">
            {(Object.keys(PAPEIS) as Papel[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={papel === k}
                aria-label={`Papel ${PAPEIS[k].rotulo}`}
                title={PAPEIS[k].rotulo}
                onClick={() => setPapel(k)}
                className={`h-6 w-6 rounded-full border-2 transition ${papel === k ? 'border-emerald-400 scale-110' : 'border-zinc-700'}`}
                style={{ backgroundColor: PAPEIS[k].fundo }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTam((t) => Math.max(0, t - 1))}
            aria-label="Diminuir letra"
            className="action-collage action-collage--paper h-8 rounded-lg px-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            A−
          </button>
          <button
            type="button"
            onClick={() => setTam((t) => Math.min(TAMANHOS.length - 1, t + 1))}
            aria-label="Aumentar letra"
            className="action-collage action-collage--paper h-8 rounded-lg px-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            A+
          </button>
          <button
            type="button"
            disabled={Boolean(naEstante)}
            onClick={() =>
              add({
                title: livro.titulo,
                author: livro.autor,
                kind: 'livro',
                status: 'lendo',
                source: 'gutenberg',
                externalId: `gutenberg-${id}`,
                url: livro.link,
                coverUrl: capa ?? null,
              })
            }
            className={"action-collage " + (`ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
              naEstante ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300'
            }`)}
          >
            <Icon name={naEstante ? 'check' : 'bookmark'} size={13} />
            {naEstante ? 'Na estante' : 'Estou lendo'}
          </button>
        </div>
      </div>

      <div ref={rolagem} className="min-h-0 flex-1 overflow-y-auto transition-colors" style={{ backgroundColor: PAPEIS[papel].fundo }}>
        <article
          className="mx-auto max-w-prose px-5 py-8 sm:px-8"
          style={{ fontSize: TAMANHOS[tam], fontFamily: FONTES[fonte].familia, color: PAPEIS[papel].tinta, fontKerning: 'normal', hyphens: 'auto' }}
          lang={livro.idioma ?? undefined}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: PAPEIS[papel].suave }}>{livro.titulo}</p>
          <h3 className="mt-2 text-3xl font-bold leading-tight" style={{ color: PAPEIS[papel].tinta }}>{atual.titulo}</h3>
          <div className="mt-6 space-y-[0.9em] leading-[1.8]">
            {atual.paragrafos.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-10 flex items-center justify-between gap-3 border-t border-zinc-800 pt-5 font-sans">
            <button
              type="button"
              onClick={() => setCap((c) => Math.max(0, c - 1))}
              disabled={cap <= 0}
              className="action-collage action-collage--paper inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-emerald-400 disabled:opacity-30"
            >
              <Icon name="chevronRight" size={14} className="rotate-180" /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setCap((c) => Math.min(total - 1, c + 1))}
              disabled={cap >= total - 1}
              className="inline-flex items-center gap-1.5 rounded-xl action-patch action-patch--cobalt bg-emerald-400 px-3.5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-30"
            >
              Próximo capítulo <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
