'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Icon from '@/components/icons';
import { usePreferences } from '@/lib/preferences';
import { APARENCIA_PADRAO, MAXIMO_NO_BANNER, type ItemNoBanner } from '@/lib/aparencia-tipos';
import type { ItemExclusivo } from '@/lib/exclusivos';

type Meu = ItemExclusivo & { quantidade?: number };

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const CONFERIDO = 'nexo:banner:conferido';

/**
 * Adesivos e bottons colados no banner da home. Fora da edição é só uma
 * camada por cima do banner (não pega o toque: os botões continuam
 * funcionando). Na edição, a pessoa escolhe da coleção, arrasta, gira e tira;
 * "Pronto" guarda na conta. No banner eles ficam um pouco menores que no chat.
 */
export default function AdesivosDoBanner({ editando, onFechar }: { editando: boolean; onFechar: () => void }) {
  const { prefs, ready, save } = usePreferences();
  const aparencia = prefs.aparencia ?? APARENCIA_PADRAO;
  const salvos = aparencia.banner ?? [];
  const [rascunho, setRascunho] = useState<ItemNoBanner[]>(salvos);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [meus, setMeus] = useState<Meu[] | null>(null);
  const [erro, setErro] = useState('');
  const camada = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ idx: number; id: number } | null>(null);

  // Ao abrir a edição, parte do que está salvo e busca a coleção.
  useEffect(() => {
    if (!editando) return;
    setRascunho(salvos);
    setSelecionado(null);
    setErro('');
    fetch('/api/exclusivos?kind=sticker,button', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.status === 401) throw new Error('Entre na sua conta para usar seus adesivos e bottons.');
        if (!r.ok) throw new Error(j.error || 'Não foi possível abrir sua coleção.');
        setMeus(j.items ?? []);
      })
      .catch((e) => setErro((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editando]);

  // Uma vez por sessão: o que está no banner ainda é da pessoa? (o superadministrador pode tirar)
  const ids = salvos.map((i) => i.id).join(',');
  useEffect(() => {
    if (!ready || !ids || editando) return;
    try {
      if (sessionStorage.getItem(CONFERIDO) === ids) return;
    } catch {
      /* sem armazenamento */
    }
    let vivo = true;
    fetch('/api/exclusivos?kind=sticker,button', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!vivo || !j || !Array.isArray(j.items)) return;
        const tem = new Set(j.items.map((i: { id: string }) => i.id));
        const ficam = salvos.filter((i) => tem.has(i.id));
        if (ficam.length !== salvos.length) void save({ aparencia: { ...aparencia, banner: ficam } });
        try {
          sessionStorage.setItem(CONFERIDO, ficam.map((i) => i.id).join(','));
        } catch {
          /* sem armazenamento */
        }
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, ids, editando]);

  const itens = editando ? rascunho : salvos;
  if (!ready || (!editando && !itens.length)) return null;

  const usados = (id: string) => rascunho.filter((i) => i.id === id).length;
  const cheio = rascunho.length >= MAXIMO_NO_BANNER;

  const colocar = (m: Meu) => {
    if (cheio || usados(m.id) >= (m.quantidade ?? 1)) return;
    const n = rascunho.length;
    // Espalha os novos pela direita do banner, onde fica o mural (sem cobrir o título).
    const novo: ItemNoBanner = {
      id: m.id,
      url: m.url,
      tipo: m.kind === 'button' ? 'button' : 'sticker',
      x: limitar(62 + ((n * 13) % 32), 4, 96),
      y: limitar(22 + ((n * 23) % 58), 6, 94),
      giro: [-8, 6, -4, 9, -6, 3][n % 6],
    };
    setRascunho([...rascunho, novo]);
    setSelecionado(n);
  };

  const mudar = (idx: number, parte: Partial<ItemNoBanner>) => setRascunho((r) => r.map((i, k) => (k === idx ? { ...i, ...parte } : i)));
  const tirar = (idx: number) => {
    setRascunho((r) => r.filter((_, k) => k !== idx));
    setSelecionado(null);
  };

  const mover = (e: React.PointerEvent) => {
    const a = arrasto.current;
    const caixa = camada.current?.getBoundingClientRect();
    if (!a || a.id !== e.pointerId || !caixa) return;
    mudar(a.idx, {
      x: Math.round(limitar(((e.clientX - caixa.left) / caixa.width) * 100, 2, 98) * 10) / 10,
      y: Math.round(limitar(((e.clientY - caixa.top) / caixa.height) * 100, 2, 98) * 10) / 10,
    });
  };

  const salvar = async () => {
    await save({ aparencia: { ...aparencia, banner: rascunho } });
    try {
      sessionStorage.setItem(CONFERIDO, rascunho.map((i) => i.id).join(','));
    } catch {
      /* sem armazenamento */
    }
    onFechar();
  };

  const sel = selecionado !== null ? rascunho[selecionado] : null;

  return (
    <>
      <div ref={camada} className={`banner-camada absolute inset-0 z-[5] ${editando ? 'banner-camada--editando' : 'pointer-events-none'}`} aria-hidden={!editando}>
        {itens.map((item, idx) => (
          <span
            key={`${item.id}-${idx}`}
            className={`banner-item ${item.tipo === 'button' ? 'banner-item--botton' : 'banner-item--adesivo'} ${editando && selecionado === idx ? 'banner-item--selecionado' : ''}`}
            style={{ left: `${item.x}%`, top: `${item.y}%`, '--giro': `${item.giro}deg` } as React.CSSProperties}
            onPointerDown={
              editando
                ? (e) => {
                    e.preventDefault();
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    } catch {
                      /* sem captura (ponteiro já solto): segue arrastando enquanto estiver em cima */
                    }
                    arrasto.current = { idx, id: e.pointerId };
                    setSelecionado(idx);
                  }
                : undefined
            }
            onPointerMove={editando ? mover : undefined}
            onPointerUp={editando ? () => (arrasto.current = null) : undefined}
            onPointerCancel={editando ? () => (arrasto.current = null) : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="" draggable={false} />
          </span>
        ))}
      </div>

      {/* A bandeja vai direto no <body>: fora do banner (que corta o que passa da borda) e do tema da área. */}
      {editando &&
        typeof document !== 'undefined' &&
        createPortal(
        <div className="banner-bandeja fixed inset-x-3 z-[80] mx-auto max-w-3xl rounded-3xl p-4 shadow-2xl" role="dialog" aria-label="Enfeitar o banner">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">
              Enfeite o banner <span className="font-normal opacity-70">· toque para colocar, arraste para mover ({rascunho.length}/{MAXIMO_NO_BANNER})</span>
            </p>
            {sel && selecionado !== null && (
              <div className="flex items-center gap-1.5" aria-label="Item escolhido">
                <button type="button" onClick={() => mudar(selecionado, { giro: limitar(sel.giro - 8, -30, 30) })} className="banner-acao" title="Girar para a esquerda" aria-label="Girar para a esquerda">
                  ↺
                </button>
                <button type="button" onClick={() => mudar(selecionado, { giro: limitar(sel.giro + 8, -30, 30) })} className="banner-acao" title="Girar para a direita" aria-label="Girar para a direita">
                  ↻
                </button>
                <button type="button" onClick={() => tirar(selecionado)} className="banner-acao banner-acao--tirar" aria-label="Tirar do banner">
                  Tirar
                </button>
              </div>
            )}
          </div>

          {erro ? (
            <p className="mt-3 text-sm opacity-80">{erro}</p>
          ) : !meus ? (
            <p className="mt-3 text-sm opacity-70">Abrindo sua coleção…</p>
          ) : !meus.length ? (
            <p className="mt-3 text-sm opacity-80">
              Você ainda não tem adesivos nem bottons.{' '}
              <Link href="/colecionaveis?aba=missoes" className="font-semibold underline">
                Cumpra missões para ganhar
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {meus.map((m) => {
                const esgotado = cheio || usados(m.id) >= (m.quantidade ?? 1);
                return (
                  <li key={m.id} className="shrink-0">
                    <button
                      type="button"
                      disabled={esgotado}
                      onClick={() => colocar(m)}
                      title={esgotado ? (cheio ? 'O banner está cheio' : 'Já está no banner') : `Colocar “${m.title}”`}
                      className="banner-escolha grid h-16 w-16 place-items-center rounded-2xl p-1.5 disabled:opacity-35"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.thumbUrl} alt={m.title} className={`max-h-full max-w-full ${m.kind === 'button' ? 'rounded-full' : ''}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {rascunho.length > 0 && (
              <button type="button" onClick={() => (setRascunho([]), setSelecionado(null))} className="mr-auto text-xs font-semibold underline opacity-80">
                Tirar todos
              </button>
            )}
            <button type="button" onClick={onFechar} className="banner-acao">
              Cancelar
            </button>
            <button type="button" onClick={() => void salvar()} className="banner-acao banner-acao--pronto">
              <Icon name="check" size={14} /> Pronto
            </button>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
