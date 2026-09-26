'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from './icons';

export interface Pessoa {
  id: string;
  name: string;
  emailHint: string | null;
  proximo: boolean;
}

/**
 * Escolhe pessoas DA PLATAFORMA pelo nome — para marcar num compromisso ou
 * convidar para um grupo. Nada de digitar e-mail: o convite vai direto para
 * a agenda e as notificações da conta escolhida.
 *
 * Aberto e vazio, sugere as pessoas próximas (contatos, colegas de
 * compromisso e de grupo); digitando, busca pelo nome ou pelo e-mail exato.
 */
export default function PessoaPicker({
  value,
  onChange,
  placeholder = 'Digite o nome de quem você quer convidar',
  excluir = [],
  semResultado,
}: {
  value: Pessoa[];
  onChange: (next: Pessoa[]) => void;
  placeholder?: string;
  /** Ids que não devem aparecer (quem já está no grupo, por exemplo). */
  excluir?: string[];
  /** O que mostrar quando ninguém da plataforma bate com o termo. */
  semResultado?: React.ReactNode;
}) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<Pessoa[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const caixa = useRef<HTMLDivElement>(null);

  const termo = q.trim();

  useEffect(() => {
    if (!aberto || termo.length === 1) {
      if (termo.length === 1) setResultados([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setCarregando(true);
      try {
        const res = await fetch(`/api/pessoas?q=${encodeURIComponent(termo)}`, { signal: ctrl.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setResultados(json.pessoas || []);
        setErro('');
      } catch (e: any) {
        if (!ctrl.signal.aborted) setErro(e?.message || 'Falha ao buscar pessoas.');
      } finally {
        if (!ctrl.signal.aborted) setCarregando(false);
      }
    }, termo ? 250 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [termo, aberto]);

  // Clique fora fecha a lista.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  const escolhidos = new Set(value.map((p) => p.id));
  const opcoes = resultados.filter((p) => !escolhidos.has(p.id) && !excluir.includes(p.id));

  // Escolheu: a lista fecha para não cobrir o botão de enviar logo abaixo.
  // Digitar ou clicar no campo abre de novo, para escolher mais alguém.
  const escolher = (p: Pessoa) => {
    onChange([...value, p]);
    setQ('');
    setAberto(false);
  };

  return (
    <div
      ref={caixa}
      className="relative"
      // Foco saiu do seletor (Tab, clique fora): a lista fecha e não fica por
      // cima do botão de enviar.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAberto(false);
      }}
    >
      <div className="flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-2.5 py-1.5 focus-within:border-emerald-600">
        {value.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 py-1 pl-2.5 pr-1 text-xs font-medium text-emerald-300"
          >
            {p.name}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x.id !== p.id))}
              className="rounded-full p-0.5 hover:bg-emerald-500/20"
              aria-label={`Tirar ${p.name}`}
            >
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onClick={() => setAberto(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Enter escolhe a primeira opção, e nunca envia o formulário.
              e.preventDefault();
              if (opcoes[0]) escolher(opcoes[0]);
            } else if (e.key === 'Backspace' && !q && value.length) {
              onChange(value.slice(0, -1));
            } else if (e.key === 'Escape' && aberto) {
              // Fecha só a lista, não o modal em volta (que ignora o Esc já
              // tratado — o React escuta no próprio document, então
              // stopPropagation não chegaria a impedir o listener do modal).
              e.preventDefault();
              setAberto(false);
            }
          }}
          placeholder={value.length ? 'Adicionar mais alguém…' : placeholder}
          className="min-w-[10rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          aria-label="Buscar pessoas da plataforma"
          aria-expanded={aberto}
          role="combobox"
          aria-autocomplete="list"
        />
      </div>

      {aberto && (
        <div className="absolute inset-x-0 z-30 mt-1.5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-soft" role="listbox">
          <p className="border-b border-zinc-800/70 px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            {termo ? 'Na plataforma' : 'Pessoas próximas'}
            {carregando && ' · buscando…'}
          </p>
          <div className="max-h-64 overflow-y-auto">
            {erro ? (
              <p className="px-3.5 py-3 text-xs text-clay-300">{erro}</p>
            ) : opcoes.length ? (
              opcoes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(p)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-zinc-800/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold uppercase text-emerald-300">
                    {p.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">{p.name}</span>
                    {p.emailHint && <span className="block truncate text-[11px] text-zinc-500">{p.emailHint}</span>}
                  </span>
                  {p.proximo && <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">próximo</span>}
                </button>
              ))
            ) : carregando ? null : termo.length < 2 ? (
              <p className="px-3.5 py-3 text-xs text-zinc-500">
                {termo ? 'Continue digitando…' : 'Digite o nome de alguém que já usa a nexo.social.'}
              </p>
            ) : (
              <div className="space-y-1.5 px-3.5 py-3 text-xs text-zinc-400">
                <p>Ninguém na plataforma com “{termo}”.</p>
                {semResultado}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
