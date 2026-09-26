'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './icons';
import { supabase } from '@/lib/supabase';

interface Toque {
  id: string;
  titulo: string;
  corpo: string;
  link: string;
}

const DURACAO = 30_000;

/**
 * Chamada chegando: em qualquer página, aparece o aviso e toca como telefone
 * (duas notas, 440 + 480 Hz, o toque clássico — gerado aqui, sem arquivo de
 * som), e o celular vibra. "Atender" já abre a chamada; "Recusar" dispensa.
 *
 * Navegadores só deixam tocar som depois de um toque na página: o primeiro
 * clique em qualquer lugar destrava o áudio para as próximas chamadas.
 */
export default function AvisoDeChamada() {
  const router = useRouter();
  const [toque, setToque] = useState<Toque | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const tocando = useRef<{ parar: () => void } | null>(null);

  // Destrava o áudio no primeiro gesto da pessoa.
  useEffect(() => {
    const destravar = () => {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!ctx.current && Ctx) ctx.current = new Ctx();
        void ctx.current?.resume();
      } catch {
        /* sem áudio: o aviso ainda aparece */
      }
    };
    window.addEventListener('pointerdown', destravar, { once: true });
    window.addEventListener('keydown', destravar, { once: true });
    return () => {
      window.removeEventListener('pointerdown', destravar);
      window.removeEventListener('keydown', destravar);
    };
  }, []);

  const pararToque = useCallback(() => {
    tocando.current?.parar();
    tocando.current = null;
    if (typeof navigator !== 'undefined') navigator.vibrate?.(0);
  }, []);

  const tocar = useCallback(() => {
    pararToque();
    navigator.vibrate?.([800, 400, 800, 400, 800, 2000, 800, 400, 800]);
    const c = ctx.current;
    if (!c || c.state !== 'running') return;
    const volume = c.createGain();
    volume.gain.value = 0;
    volume.connect(c.destination);
    const osc = [440, 480].map((f) => {
      const o = c.createOscillator();
      o.frequency.value = f;
      o.connect(volume);
      o.start();
      return o;
    });
    // 2 s tocando, 4 s de silêncio — como o telefone.
    const agora = c.currentTime;
    for (let t = 0; t < DURACAO / 1000; t += 6) {
      volume.gain.setValueAtTime(0.12, agora + t);
      volume.gain.setValueAtTime(0, agora + t + 2);
    }
    tocando.current = {
      parar: () => {
        osc.forEach((o) => {
          try {
            o.stop();
          } catch {
            /* já parou */
          }
        });
        volume.disconnect();
      },
    };
  }, [pararToque]);

  const dispensar = useCallback(
    (marcarLida: boolean) => {
      pararToque();
      setToque((t) => {
        if (t && marcarLida) {
          void fetch('/api/agenda/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: t.id }),
          }).catch(() => undefined);
        }
        return null;
      });
    },
    [pararToque],
  );

  // Notificação de chamada chega pelo Realtime (a mesma do sino).
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    let canal: ReturnType<typeof sb.channel> | null = null;
    let vivo = true;
    sb.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!vivo || !uid) return;
      canal = sb
        .channel(`toque:${uid}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, (p: any) => {
          const n = p.new;
          if (n?.type !== 'chamada' || !n.link) return;
          // Aviso velho (a conexão voltou depois de um tempo): não toca.
          if (Date.now() - Date.parse(n.created_at) > DURACAO) return;
          setToque({ id: n.id, titulo: n.title, corpo: n.body ?? '', link: n.link });
          tocar();
        })
        .subscribe();
    });
    return () => {
      vivo = false;
      if (canal) void sb.removeChannel(canal);
    };
  }, [tocar]);

  // Ninguém atendeu: para de tocar.
  useEffect(() => {
    if (!toque) return;
    const t = setTimeout(() => dispensar(false), DURACAO);
    return () => clearTimeout(t);
  }, [toque, dispensar]);

  useEffect(() => pararToque, [pararToque]);

  if (!toque) return null;
  return (
    <div
      role="alertdialog"
      aria-label="Chamada recebida"
      className="fixed inset-x-3 top-3 z-[90] mx-auto flex max-w-md items-center gap-3 rounded-3xl border border-emerald-400/40 bg-zinc-900 p-4 shadow-2xl sm:right-6 sm:left-auto"
      style={{ marginTop: 'env(safe-area-inset-top)' }}
    >
      <span className="flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-full bg-emerald-500 text-zinc-950">
        <Icon name={toque.titulo.includes('voz') ? 'phone' : 'video'} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-50">{toque.titulo}</p>
        <p className="line-clamp-2 text-xs text-zinc-400">{toque.corpo}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => dispensar(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dc2626] text-white hover:bg-[#ef4444]"
          aria-label="Recusar"
          title="Recusar"
        >
          <Icon name="phoneOff" size={18} />
        </button>
        <button
          onClick={() => {
            const destino = `${toque.link}${toque.link.includes('?') ? '&' : '?'}atender=1`;
            dispensar(true);
            router.push(destino);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          aria-label="Atender"
          title="Atender"
        >
          <Icon name="phone" size={18} />
        </button>
      </div>
    </div>
  );
}
