'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../icons';
import PessoaPicker, { type Pessoa } from '../PessoaPicker';

/**
 * Convites de grupo são exclusivamente internos: somente contas já existentes
 * na nexo.social podem ser selecionadas. Não existe link público de grupo.
 */
export default function ConvidarAmigos({
  groupId,
  groupName,
  jaNoGrupo,
  onFechar,
  onConvidou,
}: {
  groupId: string;
  groupName: string;
  jaNoGrupo: string[];
  onFechar: () => void;
  onConvidou: () => void;
}) {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && onFechar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onFechar]);

  const convidar = async () => {
    if (!pessoas.length) return;
    setEnviando(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/comunidade/grupos/${groupId}/convites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: pessoas.map((p) => p.id) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const n = json.convidados ?? 0;
      setAviso({
        tipo: 'ok',
        texto: n
          ? `Convite enviado para ${n === 1 ? pessoas[0].name : `${n} pessoas`}. O convite aparece dentro da conta da pessoa.`
          : 'Essas pessoas já estavam no grupo ou com convite pendente.',
      });
      setPessoas([]);
      onConvidou();
    } catch (e: any) {
      setAviso({ tipo: 'erro', texto: e?.message || 'Falha ao convidar.' });
    } finally {
      setEnviando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Convidar pessoas">
      <button type="button" className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" onClick={onFechar} aria-label="Fechar" />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-soft sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">Convidar para o grupo</h2>
            <p className="text-xs text-zinc-400">{groupName}</p>
          </div>
          <button onClick={onFechar} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" aria-label="Fechar">
            <Icon name="close" size={18} />
          </button>
        </div>

        <section className="mt-5 space-y-3">
          <p className="text-xs leading-relaxed text-zinc-400">
            Somente pessoas que já possuem conta na nexo.social podem receber convite de grupo. O convite fica dentro da própria plataforma.
          </p>
          <PessoaPicker
            value={pessoas}
            onChange={setPessoas}
            excluir={jaNoGrupo}
            placeholder="Buscar uma conta existente"
            semResultado={<p>Essa pessoa precisa ter uma conta ativa na plataforma antes de poder entrar em um grupo.</p>}
          />
          <button
            onClick={convidar}
            disabled={!pessoas.length || enviando}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <Icon name="send" size={15} /> {enviando ? 'Enviando…' : pessoas.length > 1 ? `Convidar ${pessoas.length} pessoas` : 'Enviar convite'}
          </button>
          {aviso && (
            <p className={`rounded-2xl border p-3 text-xs ${aviso.tipo === 'ok' ? 'border-emerald-900/60 bg-emerald-950/25 text-emerald-200' : 'border-clay-800/60 bg-clay-950/25 text-clay-200'}`}>
              {aviso.texto}
            </p>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}
