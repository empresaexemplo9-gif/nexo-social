'use client';

// O canal ao vivo dos jogos de um grupo: "grupo:<id>:jogos" (privado — só
// membros entram, ver db/community-games.sql). A presença diz quem está na
// sala de jogos e quais mesas estão abertas; as jogadas vão por broadcast,
// todas no evento "jogo", com o id da mesa.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type JogoId = 'trilha' | 'arcanos';

export interface MesaAnunciada {
  id: string;
  jogo: JogoId;
  host: string;
  hostNome: string;
  estado: 'aberta' | 'jogando';
  jogadores: string[];
  /** Linha curta para o lobby ("Chama + Sombra", "10 rodadas"). */
  detalhe?: string;
}

export interface Presente {
  userId: string;
  nome: string;
  avatar: string | null;
  desde: number;
  mesa: MesaAnunciada | null;
}

export interface Mensagem {
  mesa: string;
  tipo: string;
  de: string;
  [k: string]: unknown;
}

type Ouvinte = (m: Mensagem) => void;

export function useCanalDeJogos(groupId: string, eu: { userId: string; nome: string; avatar: string | null } | null) {
  const [estado, setEstado] = useState<'conectando' | 'ok' | 'erro'>('conectando');
  const [presentes, setPresentes] = useState<Presente[]>([]);
  const canal = useRef<RealtimeChannel | null>(null);
  const ouvintes = useRef(new Set<Ouvinte>());
  const minhaMesa = useRef<MesaAnunciada | null>(null);
  const desde = useRef(Date.now());
  const euRef = useRef(eu);
  euRef.current = eu;

  const meta = useCallback((): Presente | null => {
    const e = euRef.current;
    return e ? { userId: e.userId, nome: e.nome, avatar: e.avatar, desde: desde.current, mesa: minhaMesa.current } : null;
  }, []);

  useEffect(() => {
    const sb = supabase;
    if (!eu?.userId) return;
    if (!sb) {
      setEstado('erro');
      return;
    }
    let vivo = true;
    const sessao = `${eu.userId}:${Math.random().toString(36).slice(2, 8)}`;
    setEstado('conectando');

    (async () => {
      const topico = `grupo:${groupId}:jogos`;
      for (const c of sb.getChannels().filter((c) => c.topic === `realtime:${topico}`)) await sb.removeChannel(c);
      await sb.realtime.setAuth();
      if (!vivo) return;
      const c = sb.channel(topico, { config: { private: true, broadcast: { self: false }, presence: { key: sessao } } });
      c.on('presence', { event: 'sync' }, () => {
        const mapa = c.presenceState<Presente>();
        const porPessoa = new Map<string, Presente>();
        for (const metas of Object.values(mapa)) {
          for (const m of metas as unknown as Presente[]) {
            const atual = porPessoa.get(m.userId);
            // A mesma pessoa em dois aparelhos: vale o que tem mesa (ou o mais novo).
            if (!atual || (m.mesa && !atual.mesa) || (!!m.mesa === !!atual.mesa && m.desde > atual.desde)) porPessoa.set(m.userId, m);
          }
        }
        setPresentes(Array.from(porPessoa.values()).sort((a, b) => a.desde - b.desde));
      });
      c.on('broadcast', { event: 'jogo' }, ({ payload }) => {
        const m = payload as Mensagem;
        if (!m || typeof m.mesa !== 'string' || typeof m.tipo !== 'string') return;
        ouvintes.current.forEach((f) => f(m));
      });
      canal.current = c;
      c.subscribe(async (status) => {
        if (!vivo) return;
        if (status === 'SUBSCRIBED') {
          const m = meta();
          if (m) await c.track(m);
          setEstado('ok');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setEstado('erro');
        }
      });
    })().catch(() => vivo && setEstado('erro'));

    return () => {
      vivo = false;
      const c = canal.current;
      canal.current = null;
      if (c) void sb.removeChannel(c);
    };
    // O nome e a foto mudam pouco; reconectar só quando muda a pessoa ou o grupo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, eu?.userId, meta]);

  /** Anuncia (ou tira) a minha mesa no lobby. */
  const anunciar = useCallback(
    async (mesa: MesaAnunciada | null) => {
      minhaMesa.current = mesa;
      const c = canal.current;
      const m = meta();
      if (c && m) await c.track(m);
    },
    [meta],
  );

  const enviar = useCallback((mesa: string, tipo: string, dados: Record<string, unknown> = {}) => {
    const c = canal.current;
    const e = euRef.current;
    if (!c || !e) return;
    void c.send({ type: 'broadcast', event: 'jogo', payload: { ...dados, mesa, tipo, de: e.userId } });
  }, []);

  const ouvir = useCallback((f: Ouvinte) => {
    ouvintes.current.add(f);
    return () => {
      ouvintes.current.delete(f);
    };
  }, []);

  const mesas = presentes.flatMap((p) => (p.mesa && p.mesa.host === p.userId ? [p.mesa] : []));
  return { estado, presentes, mesas, anunciar, enviar, ouvir };
}

/** Id curto para mesas e partidas. */
export const novoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
