'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from './icons';
import { moeda } from '@/lib/bilheteria';

// Carteira de ingressos. O QR fica grande e com fundo branco de propósito:
// leitor de portaria em ginásio mal iluminado precisa de contraste, e o brilho
// do celular costuma estar baixo.

interface IngressoAPI {
  id: string;
  code: string;
  status: 'valido' | 'usado' | 'cancelado';
  holder: string | null;
  checkedInAt: string | null;
  eventId: string;
  evento: {
    titulo: string;
    data: string;
    startsAt: string | null;
    local: string;
    cidade: string;
    imagem: string;
    tema: string;
  } | null;
  tipo: { nome: string; precoCents: number } | null;
}

const SELO: Record<IngressoAPI['status'], { texto: string; classe: string }> = {
  valido: { texto: 'Válido', classe: 'border-emerald-700 bg-emerald-950/40 text-emerald-300' },
  usado: { texto: 'Utilizado', classe: 'border-zinc-700 bg-zinc-900 text-zinc-400' },
  cancelado: { texto: 'Cancelado', classe: 'border-red-900 bg-red-950/30 text-red-400' },
};

export default function MeusIngressos() {
  const [ingressos, setIngressos] = useState<IngressoAPI[] | null>(null);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ingressos/meus')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error ?? 'Falha ao carregar.');
        return d;
      })
      .then((d) => setIngressos(d.ingressos ?? []))
      .catch((e) => {
        setErro(e.message);
        setIngressos([]);
      });
  }, []);

  if (ingressos === null) {
    return <p className="py-12 text-center text-sm text-zinc-400">Carregando seus ingressos…</p>;
  }

  if (erro) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-sm text-zinc-300">{erro}</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950"
        >
          Entrar na conta
        </Link>
      </div>
    );
  }

  if (!ingressos.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <p className="text-3xl">🎟️</p>
        <p className="mt-3 text-sm text-zinc-300">Você ainda não tem ingressos.</p>
        <Link
          href="/#agenda"
          className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950"
        >
          Ver a agenda
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {ingressos.map((i) => {
        const selo = SELO[i.status];
        const expandido = aberto === i.id;
        return (
          <li key={i.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="flex gap-4 p-4">
              {i.evento?.imagem && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={i.evento.imagem}
                  alt=""
                  className="hidden h-20 w-20 shrink-0 rounded-xl object-cover sm:block"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${selo.classe}`}>
                    {selo.texto}
                  </span>
                  {i.tipo && <span className="text-xs text-zinc-400">{i.tipo.nome}</span>}
                  {i.tipo && <span className="font-mono text-xs text-zinc-500">{moeda(i.tipo.precoCents)}</span>}
                </div>
                <Link
                  href={`/evento/${i.eventId}`}
                  className="mt-1 block truncate text-base font-semibold text-zinc-50 hover:text-clay-300"
                >
                  {i.evento?.titulo ?? 'Evento'}
                </Link>
                <p className="truncate text-sm text-zinc-400">
                  {i.evento?.data}
                  {i.evento?.local ? ` · ${i.evento.local}` : ''}
                  {i.evento?.cidade ? ` · ${i.evento.cidade}` : ''}
                </p>
                {i.holder && <p className="mt-1 text-xs text-zinc-500">Em nome de {i.holder}</p>}
                {i.checkedInAt && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Entrada em {new Date(i.checkedInAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAberto(expandido ? null : i.id)}
              aria-expanded={expandido}
              className="flex w-full items-center justify-center gap-2 border-t border-zinc-800 bg-zinc-950/60 py-3 text-sm font-semibold text-zinc-200 transition hover:text-clay-300"
            >
              <Icon name="ticket" size={16} />
              {expandido ? 'Fechar' : 'Mostrar QR de entrada'}
            </button>

            {expandido && (
              <div className="space-y-3 border-t border-zinc-800 bg-white/95 p-6 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/ingressos/qr/${i.code}`}
                  alt={`QR Code do ingresso ${i.code}`}
                  className="mx-auto h-56 w-56"
                />
                <p className="font-mono text-sm tracking-widest text-zinc-900">{i.code}</p>
                <p className="text-xs text-zinc-600">
                  {i.status === 'valido'
                    ? 'Apresente este código na entrada.'
                    : i.status === 'usado'
                      ? 'Este ingresso já foi utilizado.'
                      : 'Ingresso cancelado.'}
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
