'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Icon from './icons';
import { usePreferences } from '@/lib/preferences';
import { CATEGORIAS_DE_AVISO, formaDosAvisos, type CategoriaDeAviso } from '@/lib/push-regras';
import { ativarPush, desativarPush, estadoDoPush, testarPush, type EstadoDoPush } from '@/lib/push-cliente';

const EXPLICACAO: Record<EstadoDoPush, string> = {
  'sem-suporte': 'Este navegador não recebe avisos no aparelho. No celular, use o Chrome (Android) ou o app instalado na Tela de Início (iPhone).',
  'precisa-instalar': 'No iPhone e no iPad, os avisos só chegam com o app na Tela de Início: toque em Compartilhar → "Adicionar à Tela de Início" e abra por lá.',
  bloqueado: 'Os avisos estão bloqueados neste navegador. Libere em Configurações do site → Notificações e volte aqui.',
  'sem-servidor': 'Os avisos no aparelho ainda estão sendo ligados na plataforma. Tente de novo em breve.',
  desligado: 'Ligações tocam, mensagens e convites chegam com som — mesmo com o app fechado.',
  ligado: 'Este aparelho recebe os avisos com som, mesmo com o app fechado.',
};

function useEstadoDoPush() {
  const [estado, setEstado] = useState<EstadoDoPush | null>(null);
  const atualizar = useCallback(() => {
    estadoDoPush().then(setEstado).catch(() => setEstado('sem-suporte'));
  }, []);
  useEffect(atualizar, [atualizar]);
  return [estado, setEstado, atualizar] as const;
}

/** Cartão completo (Minha Conta): ligar neste aparelho, testar e escolher os tipos. */
export default function AvisosNoAparelho() {
  const { prefs, save } = usePreferences();
  const [estado, setEstado] = useEstadoDoPush();
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const quer = formaDosAvisos(prefs.notificacoes);

  const ligar = async () => {
    setOcupado(true);
    setMensagem('');
    try {
      const e = await ativarPush();
      setEstado(e);
      if (e === 'ligado') {
        await testarPush().catch(() => undefined);
        setMensagem('Pronto! Mandamos um aviso de teste para este aparelho.');
      }
    } catch (err: any) {
      setMensagem(err?.message || 'Não foi possível ativar os avisos.');
    } finally {
      setOcupado(false);
    }
  };

  const desligar = async () => {
    setOcupado(true);
    setMensagem('');
    await desativarPush().catch(() => undefined);
    setEstado('desligado');
    setOcupado(false);
  };

  const testar = async () => {
    setOcupado(true);
    setMensagem('');
    try {
      await testarPush();
      setMensagem('Aviso de teste enviado. Deve chegar em alguns segundos.');
    } catch (err: any) {
      setMensagem(err?.message || 'Não foi possível mandar o teste.');
    } finally {
      setOcupado(false);
    }
  };

  const alternar = (c: CategoriaDeAviso) => save({ notificacoes: { ...quer, [c]: !quer[c] } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${estado === 'ligado' ? 'bg-emerald-400 text-zinc-950' : 'bg-emerald-950 text-emerald-400'}`}>
          <Icon name="volume" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">
            {estado === 'ligado' ? 'Avisos ligados neste aparelho' : estado === null ? 'Verificando este aparelho…' : 'Avisos com som neste aparelho'}
          </p>
          {estado && <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{EXPLICACAO[estado]}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {estado === 'desligado' && (
            <button type="button" onClick={ligar} disabled={ocupado} className="action-patch action-patch--cobalt rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60">
              {ocupado ? 'Ativando…' : 'Ativar avisos'}
            </button>
          )}
          {estado === 'ligado' && (
            <>
              <button type="button" onClick={testar} disabled={ocupado} className="action-collage rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 disabled:opacity-60">
                Mandar um teste
              </button>
              <button type="button" onClick={desligar} disabled={ocupado} className="action-collage action-collage--paper rounded-xl px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-clay-300 disabled:opacity-60">
                Desligar neste aparelho
              </button>
            </>
          )}
        </div>
      </div>
      {mensagem && (
        <p role="status" className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300">
          {mensagem}
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">O que avisa (em todos os seus aparelhos)</legend>
        {CATEGORIAS_DE_AVISO.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 p-3 hover:border-zinc-700">
            <input type="checkbox" checked={quer[c.id]} onChange={() => alternar(c.id)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--acento-400))]" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-100">{c.rotulo}</span>
              <span className="block text-xs text-zinc-400">{c.detalhe}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}

/** Chamada curta (no painel de notificações) para ligar os avisos neste aparelho. */
export function ConviteParaAvisos() {
  const [estado, setEstado] = useEstadoDoPush();
  const [ocupado, setOcupado] = useState(false);
  if (estado !== 'desligado' && estado !== 'precisa-instalar') return null;
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800 bg-emerald-950/30 px-4 py-3">
      <Icon name="volume" size={16} className="shrink-0 text-emerald-400" />
      <p className="min-w-0 flex-1 text-[11px] leading-snug text-zinc-300">
        {estado === 'precisa-instalar'
          ? 'Adicione o app à Tela de Início para receber ligações e mensagens com som.'
          : 'Receba ligações, mensagens e convites com som, mesmo com o app fechado.'}
      </p>
      {estado === 'desligado' && (
        <button
          type="button"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            setEstado(await ativarPush().catch(() => 'desligado' as const));
            setOcupado(false);
          }}
          className="shrink-0 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-950 disabled:opacity-60"
        >
          {ocupado ? '…' : 'Ativar'}
        </button>
      )}
    </div>
  );
}
