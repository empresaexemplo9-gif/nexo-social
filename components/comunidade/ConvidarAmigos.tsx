'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../icons';
import PessoaPicker, { type Pessoa } from '../PessoaPicker';
import { caminhoDoConvite } from '@/lib/comunidade-tipos';

/**
 * "Convidar amigos": quem já usa a nexo.social recebe o convite nas
 * notificações; quem ainda não usa recebe o link do grupo (WhatsApp,
 * Telegram, SMS, e-mail ou copiar), cria o acesso e já entra no grupo.
 */
export default function ConvidarAmigos({
  groupId,
  groupName,
  token,
  meuNome,
  jaNoGrupo,
  onFechar,
  onConvidou,
}: {
  groupId: string;
  groupName: string;
  token: string;
  meuNome: string;
  /** Membros e convidados: não aparecem no seletor. */
  jaNoGrupo: string[];
  onFechar: () => void;
  onConvidou: () => void;
}) {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);

  const link = typeof window === 'undefined' ? caminhoDoConvite(token) : `${window.location.origin}${caminhoDoConvite(token)}`;
  const mensagem =
    `${meuNome} está te chamando para o grupo "${groupName}" na nexo.social — para trocar indicações de livros, ` +
    `músicas e filmes e ouvir e assistir juntos. Crie seu acesso grátis e entre: ${link}`;

  useEffect(() => {
    setPodeCompartilhar(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    // Esc que o seletor de pessoas já usou (para fechar a lista dele) não fecha o modal.
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
          ? `Convite enviado para ${n === 1 ? pessoas[0].name : `${n} pessoas`}. Ele fica nas notificações até a pessoa aceitar ou recusar.`
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

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt('Copie o link do convite:', link);
    }
  };

  const compartilhar = async () => {
    try {
      await navigator.share({ title: `Grupo ${groupName} na nexo.social`, text: mensagem, url: link });
    } catch {
      /* a pessoa fechou o compartilhamento */
    }
  };

  const canais: { rotulo: string; href: string; icone: 'chat' | 'send' | 'mail' }[] = [
    { rotulo: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(mensagem)}`, icone: 'chat' },
    { rotulo: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(mensagem)}`, icone: 'send' },
    { rotulo: 'SMS', href: `sms:?&body=${encodeURIComponent(mensagem)}`, icone: 'chat' },
    {
      rotulo: 'E-mail',
      href: `mailto:?subject=${encodeURIComponent(`Convite para o grupo ${groupName} na nexo.social`)}&body=${encodeURIComponent(mensagem)}`,
      icone: 'mail',
    },
  ];

  // Direto no <body>: fora de qualquer espaçamento ou empilhamento da página.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Convidar amigos">
      <button type="button" className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" onClick={onFechar} aria-label="Fechar" />
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-soft sm:rounded-3xl sm:p-6"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">Convidar amigos</h2>
            <p className="text-xs text-zinc-400">para o grupo {groupName}</p>
          </div>
          <button onClick={onFechar} className="action-collage action-collage--paper rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" aria-label="Fechar">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Quem já está na plataforma */}
        <section className="mt-5 space-y-2.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Icon name="users" size={16} className="text-emerald-400" /> Quem já usa a nexo.social
          </h3>
          <PessoaPicker
            value={pessoas}
            onChange={setPessoas}
            excluir={jaNoGrupo}
            placeholder="Digite o nome da pessoa"
            semResultado={<p>Se ela ainda não tem conta, mande o link aqui embaixo.</p>}
          />
          <button
            onClick={convidar}
            disabled={!pessoas.length || enviando}
            className="inline-flex items-center gap-2 rounded-2xl action-patch action-patch--cobalt bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <Icon name="send" size={15} /> {enviando ? 'Enviando…' : pessoas.length > 1 ? `Convidar ${pessoas.length} pessoas` : 'Enviar convite'}
          </button>
          {aviso && (
            <p className={`rounded-2xl border p-3 text-xs ${aviso.tipo === 'ok' ? 'border-emerald-900/60 bg-emerald-950/25 text-emerald-200' : 'border-clay-800/60 bg-clay-950/25 text-clay-200'}`}>
              {aviso.texto}
            </p>
          )}
        </section>

        {/* Fora da plataforma */}
        <section className="mt-6 space-y-2.5 border-t border-zinc-800 pt-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Icon name="link" size={16} className="text-clay-400" /> Quem ainda não tem conta
          </h3>
          <p className="text-xs text-zinc-400">
            Mande o link do grupo: a pessoa cria o acesso dela na nexo.social e já entra aqui, sem precisar de outro convite.
          </p>
          <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-1.5 pl-3.5">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-400">{link}</span>
            <button
              onClick={copiar}
              className="action-collage inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-700"
            >
              <Icon name={copiado ? 'check' : 'copy'} size={14} /> {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {canais.map((c) => (
              <a
                key={c.rotulo}
                href={c.href}
                target={c.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="action-collage action-collage--paper inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2.5 text-xs font-medium text-zinc-200 transition hover:border-emerald-700 hover:text-emerald-300"
              >
                <Icon name={c.icone} size={14} /> {c.rotulo}
              </a>
            ))}
          </div>
          {podeCompartilhar && (
            <button
              onClick={compartilhar}
              className="action-collage action-collage--paper inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-emerald-700"
            >
              <Icon name="compartilhar" size={16} /> Mais opções de compartilhar
            </button>
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}
