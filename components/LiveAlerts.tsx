'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import InlinePlayer, { type PlayRequest } from './InlinePlayer';
import { usePreferences } from '@/lib/preferences';
import { relativeLabel } from '@/lib/datetime';
import { getTopic, type CategorySlug } from '@/lib/data';

interface AoVivo {
  id: string;
  tema: CategorySlug;
  titulo: string;
  canal: string;
  thumb: string | null;
  embedUrl: string;
  url: string;
  estado: 'agora' | 'agendado';
  comecaEm?: string;
}

const CHAVE_AVISADOS = 'nexo:aovivo:avisados';

function jaAvisou(id: string): boolean {
  try {
    const raw = window.localStorage.getItem(CHAVE_AVISADOS);
    return raw ? (JSON.parse(raw) as string[]).includes(id) : false;
  } catch {
    return false;
  }
}

function marcarAvisado(id: string) {
  try {
    const raw = window.localStorage.getItem(CHAVE_AVISADOS);
    const lista = raw ? (JSON.parse(raw) as string[]) : [];
    // Guarda só os últimos 50 — não é histórico, é anti-repetição.
    window.localStorage.setItem(CHAVE_AVISADOS, JSON.stringify([id, ...lista].slice(0, 50)));
  } catch {
    /* sem armazenamento: avisa de novo, o que é melhor que não avisar */
  }
}

/**
 * O que está no ar agora nos temas que a pessoa segue, e o que começa em breve.
 *
 * A notificação do sistema só dispara com a aba aberta — é a limitação honesta
 * de notificar sem servidor de push. Os jogos, que têm hora marcada, aparecem
 * na lista de qualquer forma.
 */
export default function LiveAlerts() {
  const { prefs, ready } = usePreferences();
  const [agora, setAgora] = useState<AoVivo[]>([]);
  const [emBreve, setEmBreve] = useState<AoVivo[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tocando, setTocando] = useState<PlayRequest | null>(null);
  const [permissao, setPermissao] = useState<NotificationPermission | 'indisponivel'>('indisponivel');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) setPermissao(Notification.permission);
  }, []);

  const carregar = useCallback(async () => {
    const temas = (prefs.interests ?? []).join(',');
    try {
      const res = await fetch(`/api/aovivo?temas=${encodeURIComponent(temas)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return;

      setAgora(json.agora ?? []);
      setEmBreve(json.emBreve ?? []);
      setAvisos(json.avisos ?? []);

      // Notifica só o que entrou no ar desde a última checagem.
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        for (const item of (json.agora ?? []) as AoVivo[]) {
          if (jaAvisou(item.id)) continue;
          marcarAvisado(item.id);
          new Notification('Começou agora no nexo.social', {
            body: `${item.titulo} — ${item.canal}`,
            tag: item.id,
          });
        }
      }
    } finally {
      setCarregando(false);
    }
  }, [prefs.interests]);

  useEffect(() => {
    if (!ready) return;
    carregar();
    // A rota tem cache de 15 min no servidor; checar de 5 em 5 aqui não gera
    // requisição nova ao YouTube, só pega o cache atualizado.
    timer.current = setInterval(carregar, 5 * 60 * 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [ready, carregar]);

  const pedirPermissao = async () => {
    if (!('Notification' in window)) return;
    setPermissao(await Notification.requestPermission());
  };

  if (!ready || carregando) return null;
  if (agora.length === 0 && emBreve.length === 0 && avisos.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-zinc-50">
            <span className="text-red-400">
              <Icon name="broadcast" size={20} />
            </span>
            Ao vivo nos seus temas
          </h2>
          <p className="mt-1 text-sm text-zinc-300">
            {agora.length > 0
              ? `${agora.length} ${agora.length === 1 ? 'transmissão' : 'transmissões'} no ar agora.`
              : 'Nada no ar neste momento — veja o que começa em breve.'}
          </p>
        </div>

        {permissao === 'default' && (
          <button
            onClick={pedirPermissao}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-zinc-700 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
          >
            <Icon name="alert" size={13} /> Avisar quando começar
          </button>
        )}
        {permissao === 'granted' && (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-emerald-400">
            <Icon name="check" size={13} /> Avisos ligados
          </span>
        )}
      </div>

      <div id="player-aovivo" className="scroll-mt-24">
        {tocando && <InlinePlayer req={tocando} onClose={() => setTocando(null)} />}
      </div>

      {agora.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agora.map((i) => {
            const t = getTopic(i.tema);
            const embutivel = Boolean(i.embedUrl);
            const conteudo = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> AO VIVO
                  </span>
                  {t && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${t.accent.bg} ${t.accent.text}`}>
                      {t.label}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-50">{i.titulo}</h3>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500">{i.canal}</p>
              </>
            );

            return embutivel ? (
              <button
                key={i.id}
                onClick={() => {
                  setTocando({ titulo: i.titulo, url: i.embedUrl, externo: i.url });
                  document.getElementById('player-aovivo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="rounded-2xl border border-red-900/50 bg-red-950/10 p-4 text-left transition hover:border-red-800"
              >
                {conteudo}
              </button>
            ) : (
              <Link
                key={i.id}
                href={i.url}
                className="rounded-2xl border border-red-900/50 bg-red-950/10 p-4 transition hover:border-red-800"
              >
                {conteudo}
              </Link>
            );
          })}
        </div>
      )}

      {emBreve.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-100">Em breve</h3>
          <ul className="space-y-2">
            {emBreve.slice(0, 6).map((i) => {
              const t = getTopic(i.tema);
              return (
                <li key={i.id}>
                  <Link
                    href={i.url}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
                  >
                    <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] ${t?.accent.bg ?? ''} ${t?.accent.text ?? ''}`}>
                      {i.comecaEm ? relativeLabel(i.comecaEm) : 'em breve'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-100">{i.titulo}</span>
                      <span className="block truncate text-[11px] text-zinc-500">{i.canal}</span>
                    </span>
                    <Icon name="chevronRight" size={15} className="shrink-0 text-zinc-600" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {avisos.map((a) => (
        <p key={a} className="flex items-start gap-2 rounded-2xl border border-clay-800/50 bg-clay-950/20 p-3 text-[11px] leading-relaxed text-clay-200">
          <Icon name="alert" size={13} className="mt-0.5 shrink-0" /> {a}
        </p>
      ))}
    </section>
  );
}
