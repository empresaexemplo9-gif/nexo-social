'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface Banimento {
  userId: string;
  nome: string | null;
  email: string | null;
  termo: string | null;
  trecho: string | null;
  origem: string | null;
  criadoEm: string;
  revogadoEm: string | null;
}
interface Termo {
  termo: string;
  tipo: 'palavra' | 'prefixo' | 'frase';
}

/** De que parte da plataforma veio o texto (nome da tabela → nome da tela). */
const ORIGEM: Record<string, string> = {
  profiles: 'nome do perfil',
  community_groups: 'grupo',
  community_posts: 'mural do grupo',
  community_post_comments: 'comentário',
  community_chat_messages: 'chat do grupo',
  community_albums: 'álbum',
  messages: 'chat com contato',
  appointments: 'agenda',
  publicacoes: 'publicação',
  publicacao_comentarios: 'opinião',
  listas: 'lista',
  lista_itens: 'item de lista',
  lista_comentarios: 'feedback de lista',
  rodas: 'roda de conversa',
  roda_mensagens: 'mensagem de roda',
  perfil_social: 'perfil',
};

const TIPO: Record<Termo['tipo'], string> = {
  palavra: 'palavra inteira',
  prefixo: 'começo de palavra',
  frase: 'frase',
};

const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

/**
 * Moderação no painel: quem foi banido (com o trecho que causou, para
 * revisar e desfazer um engano) e a lista de palavras proibidas.
 */
export default function AdminModeracao({ demo }: { demo: boolean }) {
  const [banimentos, setBanimentos] = useState<Banimento[]>([]);
  const [termos, setTermos] = useState<Termo[]>([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [novo, setNovo] = useState<{ termo: string; tipo: Termo['tipo'] }>({ termo: '', tipo: 'palavra' });

  const carregar = useCallback(async () => {
    if (demo) return;
    try {
      const r = await fetch('/api/admin/moderacao', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Falha ao carregar a moderação.');
      setBanimentos(j.banimentos || []);
      setTermos(j.termos || []);
      setErro('');
    } catch (e) {
      setErro((e as Error).message);
    }
  }, [demo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const enviar = async (chave: string, init: RequestInit, sucesso: string, url = '/api/admin/moderacao') => {
    setOcupado(chave);
    setAviso('');
    try {
      const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não deu certo.');
      setAviso(sucesso);
      await carregar();
    } catch (e) {
      setAviso(`❌ ${(e as Error).message}`);
    } finally {
      setOcupado(null);
    }
  };

  if (demo) return <p className="text-sm text-zinc-400">Configure o Supabase para usar a moderação.</p>;

  const ativos = banimentos.filter((b) => !b.revogadoEm);
  const revogados = banimentos.filter((b) => b.revogadoEm);

  return (
    <div className="space-y-8">
      {erro && <p role="alert" className="rounded-xl border border-clay-500/40 bg-clay-500/10 p-3 text-sm">{erro}</p>}
      {aviso && <p role="status" className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">{aviso}</p>}

      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-50">Banimentos ({ativos.length})</h3>
          <p className="text-xs text-zinc-400">
            Quem escreve uma palavra proibida é banido na hora e o texto não é publicado. Aqui fica o trecho, para você conferir — se
            foi engano, revogue: o acesso volta.
          </p>
        </div>
        {!ativos.length && <p className="text-sm text-zinc-500">Ninguém banido.</p>}
        <ul className="space-y-3">
          {ativos.map((b) => (
            <li key={b.userId} className="card-soft space-y-2 p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-zinc-50">
                  {b.nome || 'Sem nome'} <span className="font-normal text-zinc-500">{b.email}</span>
                </p>
                <span className="text-xs text-zinc-500">{quando(b.criadoEm)}</span>
              </div>
              <p className="text-xs text-zinc-400">
                Termo: <strong className="text-clay-400">{b.termo}</strong> · em {ORIGEM[b.origem ?? ''] ?? b.origem}
              </p>
              {b.trecho && <blockquote className="whitespace-pre-wrap rounded-lg border-l-2 border-clay-500 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300">{b.trecho}</blockquote>}
              <button
                type="button"
                disabled={ocupado === b.userId}
                onClick={() => {
                  if (window.confirm(`Revogar o banimento de ${b.nome || b.email}? A conta volta a ter acesso.`)) {
                    void enviar(b.userId, { method: 'POST', body: JSON.stringify({ acao: 'revogar', userId: b.userId }) }, 'Banimento revogado. O acesso voltou.');
                  }
                }}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:border-zinc-500 disabled:opacity-50"
              >
                {ocupado === b.userId ? 'Revogando…' : 'Revogar banimento (foi engano)'}
              </button>
            </li>
          ))}
        </ul>
        {revogados.length > 0 && (
          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer">Revogados ({revogados.length})</summary>
            <ul className="mt-2 space-y-1">
              {revogados.map((b) => (
                <li key={b.userId}>
                  {b.nome || b.email} — termo “{b.termo}”, revogado em {quando(b.revogadoEm!)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-50">Palavras proibidas ({termos.length})</h3>
          <p className="text-xs text-zinc-400">
            A comparação ignora acento, maiúscula, letra repetida (“porrrra”), número no lugar de letra (“p0rr4”) e letras soltas (“p o r
            r a”). <strong>Palavra inteira</strong> não pega a palavra dentro de outra (“cultura” não é “cu”); <strong>começo de
            palavra</strong> pega as variações (“caralh” → caralho, caralhada); <strong>frase</strong> é uma sequência de palavras.
          </p>
        </div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar('novo', { method: 'POST', body: JSON.stringify({ acao: 'termo', ...novo }) }, `“${novo.termo}” entrou na lista.`).then(() =>
              setNovo((n) => ({ ...n, termo: '' })),
            );
          }}
        >
          <input
            value={novo.termo}
            onChange={(e) => setNovo((n) => ({ ...n, termo: e.target.value }))}
            placeholder="Novo termo"
            maxLength={60}
            className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none"
          />
          <select
            value={novo.tipo}
            onChange={(e) => setNovo((n) => ({ ...n, tipo: e.target.value as Termo['tipo'] }))}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
          >
            {(Object.keys(TIPO) as Termo['tipo'][]).map((t) => (
              <option key={t} value={t}>{TIPO[t]}</option>
            ))}
          </select>
          <button type="submit" disabled={ocupado === 'novo' || novo.termo.trim().length < 2} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">
            Acrescentar
          </button>
        </form>
        <ul className="flex flex-wrap gap-2">
          {termos.map((t) => (
            <li key={t.termo} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
              <span>{t.termo}</span>
              <span className="text-[10px] text-zinc-500">{TIPO[t.tipo]}</span>
              <button
                type="button"
                aria-label={`Tirar “${t.termo}” da lista`}
                disabled={ocupado === t.termo}
                onClick={() => void enviar(t.termo, { method: 'DELETE' }, `“${t.termo}” saiu da lista.`, `/api/admin/moderacao?termo=${encodeURIComponent(t.termo)}`)}
                className="ml-0.5 text-zinc-500 hover:text-clay-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
