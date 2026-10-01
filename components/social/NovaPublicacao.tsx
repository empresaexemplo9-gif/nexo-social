'use client';

import React, { useEffect, useState } from 'react';
import Icon from '../icons';
import Estrelas from './Estrelas';
import SeletorDeVisibilidade from './SeletorDeVisibilidade';
import { CAMPO } from './util';
import { ASSUNTO_TIPOS, TIPOS_PUBLICACAO, type AssuntoTipo, type Publicacao, type TipoPublicacao, type Visibilidade } from '@/lib/mural-tipos';
import { LEMBRETE_DAS_REGRAS } from '@/lib/regras';
import { TOPICS } from '@/lib/data';

/** O assunto que cada tipo sugere de início. */
const ASSUNTO_INICIAL: Partial<Record<TipoPublicacao, AssuntoTipo>> = { resenha: 'filme', experiencia: 'show', livro: 'livro' };

export interface Rascunho {
  tipo?: TipoPublicacao;
  assunto?: string;
  autorDoLivro?: string;
  assuntoTipo?: AssuntoTipo;
  corpo?: string;
}

/**
 * Publicar no mural: conversa, pergunta (pedir opinião), resenha, experiência,
 * vídeo ou livro lido — e quem vê (todos, contatos ou um grupo).
 */
export default function NovaPublicacao({ inicial, aoPublicar }: { inicial?: Rascunho | null; aoPublicar: (p: Publicacao) => void }) {
  const [tipo, setTipo] = useState<TipoPublicacao>(inicial?.tipo ?? 'conversa');
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState(inicial?.corpo ?? '');
  const [assunto, setAssunto] = useState(inicial?.assunto ?? '');
  const [autorDoLivro, setAutorDoLivro] = useState(inicial?.autorDoLivro ?? '');
  const [assuntoTipo, setAssuntoTipo] = useState<AssuntoTipo>(inicial?.assuntoTipo ?? ASSUNTO_INICIAL[inicial?.tipo ?? 'conversa'] ?? 'filme');
  const [nota, setNota] = useState<number | null>(null);
  const [url, setUrl] = useState('');
  const [tema, setTema] = useState('');
  const [visibilidade, setVisibilidade] = useState<Visibilidade>('todos');
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState(Boolean(inicial));

  // Quem vê, de início: o padrão que a pessoa escolheu na página dela.
  useEffect(() => {
    fetch('/api/perfil')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.visibilidadePadrao && setVisibilidade(j.visibilidadePadrao))
      .catch(() => undefined);
  }, []);

  const def = TIPOS_PUBLICACAO.find((t) => t.id === tipo)!;

  const escolherTipo = (t: TipoPublicacao) => {
    setTipo(t);
    setAberto(true);
    if (ASSUNTO_INICIAL[t]) setAssuntoTipo(ASSUNTO_INICIAL[t]!);
  };

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch('/api/mural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          titulo,
          corpo,
          assunto: tipo === 'livro' && autorDoLivro.trim() ? `${assunto.trim()} — ${autorDoLivro.trim()}` : assunto,
          assuntoTipo,
          nota,
          url,
          tema: tema || null,
          visibilidade,
          grupoId,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 403 && j.banido) {
        window.location.href = '/banido';
        return;
      }
      if (!res.ok) throw new Error(j.error || 'Não foi possível publicar.');
      aoPublicar(j.publicacao);
      setTitulo('');
      setCorpo('');
      setAssunto('');
      setAutorDoLivro('');
      setNota(null);
      setUrl('');
      setAberto(false);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="card-soft space-y-3 p-5" aria-label="Nova publicação">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="O que você quer publicar">
        {TIPOS_PUBLICACAO.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={tipo === t.id && aberto}
            onClick={() => escolherTipo(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tipo === t.id && aberto ? 'bg-emerald-500 text-zinc-950' : 'border border-zinc-800 text-zinc-300 hover:text-zinc-50'
            }`}
          >
            <Icon name={t.icone} size={13} /> {t.rotulo}
          </button>
        ))}
      </div>

      {!aberto ? (
        <button type="button" onClick={() => setAberto(true)} className={`${CAMPO} text-left text-zinc-500`}>
          {def.convite}
        </button>
      ) : (
        <form onSubmit={publicar} className="space-y-3">
          {def.assunto && tipo === 'livro' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <input required value={assunto} onChange={(e) => setAssunto(e.target.value)} maxLength={85} placeholder="Título do livro" aria-label="Título do livro" className={CAMPO} />
              <input value={autorDoLivro} onChange={(e) => setAutorDoLivro(e.target.value)} maxLength={70} placeholder="Autor(a) (opcional)" aria-label="Autor(a)" className={CAMPO} />
            </div>
          )}
          {def.assunto && tipo !== 'livro' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <select value={assuntoTipo} onChange={(e) => setAssuntoTipo(e.target.value as AssuntoTipo)} aria-label="Sobre o quê" className={CAMPO}>
                {ASSUNTO_TIPOS.filter((a) => a.id !== 'livro' || tipo === 'resenha').map((a) => (
                  <option key={a.id} value={a.id}>{a.rotulo}</option>
                ))}
              </select>
              <input
                required
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                maxLength={160}
                placeholder={tipo === 'experiencia' ? 'Onde você foi? Ex.: Rock in Rio 2026' : 'O nome do filme, série, livro, jogo…'}
                aria-label="Sobre o quê"
                className={CAMPO}
              />
            </div>
          )}
          {def.nota && (
            <p className="flex items-center gap-2 text-xs text-zinc-400">
              Sua nota <Estrelas nota={nota} aoMudar={setNota} tamanho="text-xl" />
            </p>
          )}
          {tipo === 'video' && (
            <input required value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" maxLength={1000} placeholder="Link do vídeo no YouTube" className={CAMPO} />
          )}
          {(tipo === 'conversa' || tipo === 'pergunta' || tipo === 'video') && (
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={160}
              required={tipo === 'pergunta'}
              placeholder={tipo === 'pergunta' ? 'Sua pergunta' : 'Título (opcional)'}
              className={CAMPO}
            />
          )}
          <textarea
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            rows={4}
            maxLength={5000}
            required={tipo === 'conversa'}
            placeholder={def.convite}
            className={CAMPO}
          />
          <div className="flex flex-wrap items-center gap-3">
            <select value={tema} onChange={(e) => setTema(e.target.value)} aria-label="Tema (opcional)" className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300">
              <option value="">Tema (opcional)</option>
              {TOPICS.map((t) => (
                <option key={t.slug} value={t.slug}>{t.label}</option>
              ))}
            </select>
            {tipo !== 'video' && (
              <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" maxLength={1000} placeholder="Link (opcional)" className="min-w-0 flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500" />
            )}
          </div>
          <SeletorDeVisibilidade valor={visibilidade} grupoId={grupoId} aoMudar={(v, g) => { setVisibilidade(v); setGrupoId(g); }} />
          {erro && <p role="alert" className="rounded-2xl border border-clay-800/60 bg-clay-950/25 p-3 text-xs text-clay-200">{erro}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={enviando || (visibilidade === 'grupo' && !grupoId)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <Icon name="send" size={15} /> {enviando ? 'Publicando…' : 'Publicar'}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="text-xs text-zinc-500 hover:text-zinc-200">Cancelar</button>
            <span className="ml-auto text-[11px] text-zinc-500">{LEMBRETE_DAS_REGRAS}</span>
          </div>
        </form>
      )}
    </section>
  );
}
