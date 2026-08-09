'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { alertaEstoque, disponivel, moeda, motivoIndisponivel, type TipoIngresso } from '@/lib/bilheteria';

// Compra de ingresso SEM sair da nexo.social.
//
// O caminho inteiro acontece nesta tela: escolher o lote, criar o pedido, pagar
// no PIX (o QR é desenhado aqui, não numa aba do Mercado Pago) e receber o
// ingresso. Nenhum passo manda a pessoa para outro site.
//
// Quando o evento veio de uma bilheteria de terceiros (Sympla, Ticketmaster), a
// venda continua lá — não temos o estoque deles. Aí o EventView mostra o link
// de origem, e este componente nem aparece.

interface Props {
  eventId: string;
  eventTitle: string;
  nomePadrao?: string;
  emailPadrao?: string;
  /** Avisa a página se este evento vende ingresso aqui dentro. */
  onVenda?: (vende: boolean) => void;
}

type Etapa = 'escolha' | 'dados' | 'pix' | 'pronto';

interface Pix {
  copiaECola: string;
  qrBase64: string;
  expiraEm: string | null;
}

/** De quanto em quanto tempo perguntamos se o PIX caiu. */
const POLL_MS = 4000;

export default function Checkout({ eventId, eventTitle, nomePadrao = '', emailPadrao = '', onVenda }: Props) {
  const [tipos, setTipos] = useState<TipoIngresso[] | null>(null);
  const [qtd, setQtd] = useState<Record<string, number>>({});
  const [etapa, setEtapa] = useState<Etapa>('escolha');
  const [nome, setNome] = useState(nomePadrao);
  const [email, setEmail] = useState(emailPadrao);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [pix, setPix] = useState<Pix | null>(null);
  const [orderId, setOrderId] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState<number | null>(null);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // `onVenda` numa ref: se a página passar uma função nova a cada render, uma
  // dependência direta refaria o fetch para sempre.
  const aviso = useRef(onVenda);
  aviso.current = onVenda;

  useEffect(() => {
    let vivo = true;
    fetch(`/api/ingressos?event=${encodeURIComponent(eventId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        const lista: TipoIngresso[] = Array.isArray(d?.tipos) ? d.tipos : [];
        setTipos(lista);
        aviso.current?.(lista.length > 0);
      })
      .catch(() => {
        if (!vivo) return;
        setTipos([]);
        aviso.current?.(false);
      });
    return () => {
      vivo = false;
    };
  }, [eventId]);

  const selecionados = useMemo(
    () => (tipos ?? []).filter((t) => (qtd[t.id] ?? 0) > 0).map((t) => ({ tipo: t, n: qtd[t.id] })),
    [tipos, qtd],
  );
  const total = selecionados.reduce((s, { tipo, n }) => s + tipo.price_cents * n, 0);
  const quantidade = selecionados.reduce((s, { n }) => s + n, 0);

  const pararPoll = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => pararPoll, [pararPoll]);

  // Conta regressiva da reserva. Sem isso a pessoa não sabe que o ingresso
  // volta para o estoque se ela demorar.
  useEffect(() => {
    if (etapa !== 'pix' || !pix?.expiraEm) return;
    const fim = new Date(pix.expiraEm).getTime();
    const tick = () => setRestante(Math.max(0, Math.floor((fim - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [etapa, pix]);

  function ajustar(t: TipoIngresso, delta: number) {
    const teto = disponivel(t);
    setQtd((q) => {
      const novo = Math.max(0, Math.min(teto, (q[t.id] ?? 0) + delta));
      return { ...q, [t.id]: novo };
    });
  }

  async function comprar() {
    setErro('');
    setEnviando(true);
    try {
      const res = await fetch('/api/ingressos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          nome,
          email,
          itens: selecionados.map(({ tipo, n }) => ({ ticketTypeId: tipo.id, quantity: n })),
        }),
      });
      const d = await res.json();

      if (!res.ok) {
        setErro(d?.error ?? 'Não foi possível concluir a compra.');
        if (res.status === 401) setErro('Entre na sua conta para comprar o ingresso.');
        return;
      }

      setOrderId(d.orderId);
      if (d.gratuito) {
        setEtapa('pronto');
        return;
      }
      setPix(d.pix);
      setEtapa('pix');
      timer.current = setInterval(() => conferir(d.orderId), POLL_MS);
    } catch {
      setErro('Falha de conexão. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  async function conferir(id: string) {
    try {
      const res = await fetch(`/api/ingressos/pedido/${id}`);
      const d = await res.json();
      if (d?.pedido?.status === 'pago') {
        pararPoll();
        setEtapa('pronto');
      } else if (d?.pedido?.status === 'expirado' || d?.pedido?.status === 'cancelado') {
        pararPoll();
        setErro('A reserva expirou e os ingressos voltaram para o estoque.');
        setEtapa('escolha');
      }
    } catch {
      // Rede oscilando: a próxima rodada tenta de novo.
    }
  }

  async function copiar() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro('Não foi possível copiar. Selecione o código manualmente.');
    }
  }

  // Carregando, ou o evento não vende aqui dentro: o EventView cuida do resto.
  if (tipos === null || tipos.length === 0) return null;

  const aberto = tipos.filter((t) => !motivoIndisponivel(t));

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-5">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Icon name="ticket" size={18} />
        <h2 className="text-lg font-semibold text-zinc-50">Comprar ingresso</h2>
        <span className="rounded-full border border-emerald-700 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
          aqui na nexo.social
        </span>
      </header>

      {etapa === 'escolha' && (
        <>
          <ul className="space-y-2">
            {tipos.map((t) => {
              const bloqueio = motivoIndisponivel(t);
              const n = qtd[t.id] ?? 0;
              const teto = disponivel(t);
              const alerta = alertaEstoque(t);
              return (
                /* Duas linhas: o nome do lote fica com a largura toda, e preço
                   e contador vêm embaixo. Numa só linha, "Cadeira inferior"
                   virava "Cad…" na tela do celular. */
                <li
                  key={t.id}
                  className={`space-y-2 rounded-xl border p-3 ${
                    bloqueio ? 'border-zinc-800 bg-zinc-950/40 opacity-60' : 'border-zinc-700 bg-zinc-950'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{t.name}</p>
                    {t.description && <p className="text-xs text-zinc-400">{t.description}</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-emerald-300">{moeda(t.price_cents)}</span>
                    {alerta && !bloqueio && (
                      <span className="whitespace-nowrap text-xs font-medium text-clay-300">{alerta}</span>
                    )}
                    {bloqueio ? (
                      <span className="ml-auto rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                        {bloqueio}
                      </span>
                    ) : (
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => ajustar(t, -1)}
                          disabled={n === 0}
                          aria-label={`Tirar um ingresso ${t.name}`}
                          className="h-10 w-10 rounded-lg border border-zinc-700 text-lg text-zinc-200 disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-mono text-sm text-zinc-100" aria-live="polite">
                          {n}
                        </span>
                        <button
                          type="button"
                          onClick={() => ajustar(t, +1)}
                          disabled={n >= teto}
                          aria-label={`Somar um ingresso ${t.name}`}
                          className="h-10 w-10 rounded-lg border border-zinc-700 text-lg text-zinc-200 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {erro && <p className="text-sm text-red-400">{erro}</p>}

          {aberto.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum lote disponível no momento.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-zinc-300">
                Total: <strong className="font-mono text-emerald-300">{moeda(total)}</strong>
                {quantidade > 0 && <span className="text-zinc-500"> · {quantidade} ingresso(s)</span>}
              </span>
              <button
                type="button"
                onClick={() => setEtapa('dados')}
                disabled={quantidade === 0}
                className="ml-auto rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-40"
              >
                Continuar
              </button>
            </div>
          )}
        </>
      )}

      {etapa === 'dados' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            comprar();
          }}
          className="space-y-3"
        >
          <p className="text-sm text-zinc-300">
            {quantidade} ingresso(s) para <strong className="text-zinc-100">{eventTitle}</strong> —{' '}
            <span className="font-mono text-emerald-300">{moeda(total)}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Nome de quem vai usar</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                maxLength={120}
                autoComplete="name"
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-zinc-500">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={200}
                autoComplete="email"
                inputMode="email"
                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              />
            </label>
          </div>

          {erro && <p className="text-sm text-red-400">{erro}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEtapa('escolha')}
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {enviando ? 'Reservando…' : total === 0 ? 'Confirmar ingresso' : 'Gerar PIX'}
            </button>
          </div>
        </form>
      )}

      {etapa === 'pix' && pix && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Pague <strong className="font-mono text-emerald-300">{moeda(total)}</strong> pelo PIX. O ingresso é liberado
            assim que o pagamento cair — pode deixar esta tela aberta.
          </p>

          {pix.qrBase64 && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`data:image/png;base64,${pix.qrBase64}`}
              alt="QR Code do PIX"
              className="mx-auto h-56 w-56 rounded-xl bg-white p-2"
            />
          )}

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-zinc-500">PIX copia e cola</span>
            <div className="flex gap-2">
              <input
                readOnly
                value={pix.copiaECola}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-300"
              />
              <button
                type="button"
                onClick={copiar}
                className="shrink-0 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900"
              >
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2 text-zinc-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Aguardando o pagamento…
            </span>
            {restante !== null && (
              <span className="font-mono text-clay-300">
                reserva expira em {String(Math.floor(restante / 60)).padStart(2, '0')}:
                {String(restante % 60).padStart(2, '0')}
              </span>
            )}
            <button
              type="button"
              onClick={() => conferir(orderId)}
              className="ml-auto rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200"
            >
              <Icon name="refresh" size={13} /> Já paguei
            </button>
          </div>

          {erro && <p className="text-sm text-red-400">{erro}</p>}
        </div>
      )}

      {etapa === 'pronto' && (
        <div className="space-y-3 text-center">
          <p className="text-4xl">🎟️</p>
          <p className="text-base font-semibold text-emerald-300">Ingresso confirmado</p>
          <p className="text-sm text-zinc-300">
            {quantidade} ingresso(s) para <strong className="text-zinc-100">{eventTitle}</strong>. O QR Code de entrada
            fica na sua carteira.
          </p>
          <Link
            href="/meus-ingressos"
            className="inline-block rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
          >
            Ver meus ingressos
          </Link>
        </div>
      )}
    </section>
  );
}
