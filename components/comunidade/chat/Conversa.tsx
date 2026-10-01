'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../icons';
import Avatar from '../../Avatar';
import { supabase } from '@/lib/supabase';
import { prepararImagem } from '@/lib/imagens';
import PainelDeFigurinhas, { salvarFigurinha, type Escolha } from './PainelDeFigurinhas';

// Conversa da Comunidade — a mesma no chat de grupo e no chat entre contatos:
// texto com emoji, foto, vídeo, mensagem de voz, figurinha, adesivo e botões
// de chamada de voz e de vídeo.

export type TipoMsg = 'texto' | 'imagem' | 'video' | 'audio' | 'figurinha' | 'adesivo';
export interface Msg {
  id: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string | null;
  fromMe: boolean;
  createdAt: string;
  readAt?: string | null;
  kind: TipoMsg;
  body: string;
  mediaUrl: string | null;
  mediaPath: string | null;
  meta: Record<string, number | string> | null;
  /** Mensagem respondida (citação em cima da bolha). */
  replyTo?: { id: string; authorId: string; authorName: string; texto: string } | null;
}

interface Props {
  /** Rota da conversa: GET/POST/DELETE (ex.: /api/comunidade/grupos/<id>/chat). */
  endpoint: string;
  /** Mostra nome e foto de quem escreveu (chat de grupo). */
  emGrupo?: boolean;
  vazio?: string;
  placeholder?: string;
  onLigar?: (video: boolean) => void;
  /** Cabeçalho extra (nome do contato, ações). */
  cabecalho?: React.ReactNode;
  altura?: string;
  /** Sem borda e cantos (quando já está dentro de outra moldura). */
  semMoldura?: boolean;
  /** Avisa quem está em volta (ex.: o resumo da home) que algo foi enviado. */
  aoEnviar?: () => void;
}

const MAX_VIDEO = 50 * 1024 * 1024;
// Mensagem só com 1 a 3 emojis aparece grande.
const SO_EMOJI = new RegExp('^(?:\\p{Extended_Pictographic}|\\p{Emoji_Modifier}|\\u200d|\\ufe0f|\\p{Regional_Indicator}){1,12}$', 'u');
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dia = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(Date.now() - 86400000);
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: d.getFullYear() === hoje.getFullYear() ? undefined : 'numeric' });
};
/** Prévia curta da mensagem (citação no campo de resposta). */
function previaDe(m: Msg): string {
  switch (m.kind) {
    case 'imagem': return m.body ? `📷 ${m.body}` : '📷 Foto';
    case 'video': return m.body ? `🎬 ${m.body}` : '🎬 Vídeo';
    case 'audio': return '🎤 Mensagem de voz';
    case 'figurinha': return String(m.meta?.emoji ?? '🖼️ Figurinha');
    case 'adesivo': return '🏷️ Adesivo';
    default: return m.body;
  }
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const nomeDeArquivo = (ext: string) => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;

function formatoDeAudio(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const t of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return '';
}

export default function Conversa({ endpoint, emGrupo = false, vazio = 'Nenhuma mensagem ainda.', placeholder = 'Mensagem…', onLigar, cabecalho, altura = 'h-[32rem]', semMoldura = false, aoEnviar }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pasta, setPasta] = useState('');
  const [meuId, setMeuId] = useState('');
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [carregado, setCarregado] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [painel, setPainel] = useState(false);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const [gravando, setGravando] = useState<{ inicio: number } | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const [respondendo, setRespondendo] = useState<Msg | null>(null);
  const [destacada, setDestacada] = useState<string | null>(null);
  const [contato, setContato] = useState('');
  const rolagem = useRef<HTMLDivElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const gravador = useRef<{ rec: MediaRecorder; partes: Blob[]; stream: MediaStream; cancelado: boolean } | null>(null);
  const ultima = useRef<string | null>(null);
  const pertoDoFim = useRef(true);

  // --- Carregar e acompanhar ------------------------------------------------
  const carregar = useCallback(async (completo = false) => {
    const depois = !completo && ultima.current ? `?depois=${encodeURIComponent(ultima.current)}` : '';
    const res = await fetch(`${endpoint}${depois}`, { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(j.error || 'Falha ao carregar a conversa.');
      return;
    }
    setErro('');
    setPasta(j.pasta ?? '');
    setMeuId(j.meuId ?? '');
    if (j.contact?.name) setContato(j.contact.name);
    const novas: Msg[] = j.messages ?? [];
    setMsgs((atuais) => {
      if (completo || !depois) return novas;
      const vistos = new Set(atuais.map((m) => m.id));
      const juntas = [...atuais, ...novas.filter((m) => !vistos.has(m.id))];
      return juntas;
    });
    const ult = novas[novas.length - 1]?.createdAt;
    if (ult && (!ultima.current || ult > ultima.current)) ultima.current = ult;
    if (completo && !novas.length) ultima.current = null;
    setCarregado(true);
  }, [endpoint]);

  useEffect(() => {
    ultima.current = null;
    setMsgs([]);
    setCarregado(false);
    void carregar(true);
    const rapido = window.setInterval(() => document.visibilityState === 'visible' && void carregar(), 2500);
    // De tempos em tempos, a lista inteira (pega mensagens apagadas e links novos).
    const completo = window.setInterval(() => document.visibilityState === 'visible' && void carregar(true), 60000);
    return () => {
      window.clearInterval(rapido);
      window.clearInterval(completo);
    };
  }, [carregar]);

  // Desce para a última mensagem quando chega algo novo (se a pessoa estava no
  // fim) — e de novo quando uma foto ou vídeo termina de carregar e cresce.
  const descer = useCallback(() => {
    const el = rolagem.current;
    if (el && pertoDoFim.current) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(descer, [msgs.length, descer]);

  // --- Enviar ------------------------------------------------------------------
  const postar = async (corpo: Record<string, unknown>) => {
    const replyTo = respondendo?.id;
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(replyTo ? { ...corpo, replyTo } : corpo) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || 'Falha ao enviar.');
    setRespondendo(null);
    pertoDoFim.current = true;
    await carregar();
    aoEnviar?.();
  };

  const responder = (m: Msg) => {
    setRespondendo(m);
    setPainel(false);
    requestAnimationFrame(() => campo.current?.focus());
  };

  /** Toca na citação: rola até a mensagem original e pisca nela. */
  const irPara = (id: string) => {
    const el = rolagem.current?.querySelector<HTMLElement>(`[data-msg="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setDestacada(id);
    window.setTimeout(() => setDestacada((d) => (d === id ? null : d)), 1400);
  };

  const subir = async (blob: Blob, ext: string, tipo: string) => {
    if (!supabase) throw new Error('Envio de arquivos indisponível.');
    if (!pasta || !meuId) throw new Error('A conversa ainda está carregando.');
    const path = `${pasta}/${meuId}/${nomeDeArquivo(ext)}`;
    const { error } = await supabase.storage.from('chat').upload(path, blob, { contentType: tipo, upsert: false });
    if (error) throw new Error(/mime|type/i.test(error.message) ? 'Esse formato de arquivo não é aceito.' : /size|large/i.test(error.message) ? 'Arquivo grande demais (máximo 50 MB).' : 'Não deu para enviar o arquivo.');
    return path;
  };

  const enviarTexto = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setTexto('');
    setEnviando('texto');
    try {
      await postar({ kind: 'texto', body: t });
    } catch (err) {
      setErro((err as Error).message);
      setTexto(t);
    } finally {
      setEnviando(null);
      campo.current?.focus();
    }
  };

  const anexar = async (file: File) => {
    setErro('');
    try {
      if (file.type.startsWith('video/')) {
        if (file.size > MAX_VIDEO) throw new Error('Vídeo grande demais: o limite é 50 MB.');
        setEnviando('video');
        const meta = await new Promise<{ w?: number; h?: number; duracao?: number }>((ok) => {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.onloadedmetadata = () => { ok({ w: v.videoWidth, h: v.videoHeight, duracao: v.duration }); URL.revokeObjectURL(v.src); };
          v.onerror = () => ok({});
          v.src = URL.createObjectURL(file);
        });
        const ext = file.type.includes('webm') ? 'webm' : file.type.includes('quicktime') ? 'mov' : 'mp4';
        const path = await subir(file, ext, file.type || 'video/mp4');
        await postar({ kind: 'video', mediaPath: path, meta, body: texto.trim() });
      } else {
        setEnviando('imagem');
        const img = await prepararImagem(file, { max: 1600, qualidade: 0.86, manterGif: true });
        const path = await subir(img.blob, img.ext, img.ext === 'gif' ? 'image/gif' : 'image/jpeg');
        await postar({ kind: 'imagem', mediaPath: path, meta: { w: img.width, h: img.height }, body: texto.trim() });
      }
      setTexto('');
    } catch (err) {
      setErro((err as Error).message || 'Não deu para enviar o arquivo.');
    } finally {
      setEnviando(null);
      if (arquivo.current) arquivo.current.value = '';
    }
  };

  const escolher = async (e: Escolha) => {
    if (e.tipo === 'emoji') {
      const el = campo.current;
      const ini = el?.selectionStart ?? texto.length;
      const fim = el?.selectionEnd ?? texto.length;
      setTexto((t) => t.slice(0, ini) + e.emoji + t.slice(fim));
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(ini + e.emoji.length, ini + e.emoji.length);
      });
      return;
    }
    setPainel(false);
    setEnviando(e.tipo);
    try {
      if (e.tipo === 'adesivo') await postar({ kind: 'adesivo', meta: { n: e.n } });
      else if (e.tipo === 'exclusivo') await postar({ kind: 'adesivo', meta: { exclusiveId: e.id } });
      else await postar({ kind: 'figurinha', mediaPath: e.mediaPath, meta: e.emoji ? { emoji: e.emoji } : undefined });
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(null);
    }
  };

  // --- Mensagem de voz ----------------------------------------------------------
  useEffect(() => {
    if (!gravando) return;
    const t = window.setInterval(() => setAgora(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [gravando]);

  const comecarGravacao = async () => {
    setErro('');
    const tipo = formatoDeAudio();
    if (!tipo || !navigator.mediaDevices?.getUserMedia) {
      setErro('Este navegador não grava áudio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream, { mimeType: tipo, audioBitsPerSecond: 48000 });
      const g = { rec, partes: [] as Blob[], stream, cancelado: false };
      gravador.current = g;
      rec.ondataavailable = (ev) => ev.data.size && g.partes.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const duracao = (Date.now() - inicio) / 1000;
        gravador.current = null;
        setGravando(null);
        if (g.cancelado || duracao < 0.8) return;
        const base = tipo.split(';')[0];
        const blob = new Blob(g.partes, { type: base });
        setEnviando('audio');
        try {
          const ext = base.includes('mp4') ? 'm4a' : base.includes('ogg') ? 'ogg' : 'webm';
          const path = await subir(blob, ext, base);
          await postar({ kind: 'audio', mediaPath: path, meta: { duracao } });
        } catch (err) {
          setErro((err as Error).message);
        } finally {
          setEnviando(null);
        }
      };
      const inicio = Date.now();
      rec.start(250);
      setGravando({ inicio });
      setAgora(inicio);
    } catch {
      setErro('Sem acesso ao microfone. Libere o microfone nas permissões do navegador.');
    }
  };
  const pararGravacao = (cancelar = false) => {
    const g = gravador.current;
    if (!g) return;
    g.cancelado = cancelar;
    if (g.rec.state !== 'inactive') g.rec.stop();
  };
  useEffect(() => () => pararGravacao(true), []);

  // --- Apagar ----------------------------------------------------------------------
  const apagar = async (m: Msg) => {
    if (!window.confirm('Apagar esta mensagem para todos?')) return;
    const res = await fetch(`${endpoint}?msg=${m.id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) setErro(j.error || 'Não deu para apagar.');
    else {
      setMsgs((atuais) => atuais.filter((x) => x.id !== m.id).map((x) => (x.replyTo?.id === m.id ? { ...x, replyTo: null } : x)));
      setRespondendo((r) => (r?.id === m.id ? null : r));
    }
  };

  // --- Desenho ------------------------------------------------------------------------
  return (
    <section className={`relative flex flex-col overflow-hidden bg-zinc-950/50 ${semMoldura ? '' : 'rounded-2xl border border-zinc-800'} ${altura}`}>
      <header className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
        <div className="min-w-0 flex-1">{cabecalho}</div>
        {onLigar && (
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => onLigar(false)} title="Chamada de voz" aria-label="Chamada de voz"
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition hover:bg-emerald-950 hover:text-emerald-400">
              <Icon name="phone" size={17} />
            </button>
            <button type="button" onClick={() => onLigar(true)} title="Chamada de vídeo" aria-label="Chamada de vídeo"
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition hover:bg-emerald-950 hover:text-emerald-400">
              <Icon name="video" size={17} />
            </button>
          </div>
        )}
      </header>

      <div
        ref={rolagem}
        onScroll={(e) => {
          const el = e.currentTarget;
          pertoDoFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-4"
      >
        {!carregado && !erro && <p className="text-center text-xs text-zinc-500">Carregando…</p>}
        {carregado && msgs.length === 0 && <p className="py-10 text-center text-xs text-zinc-500">{vazio}</p>}
        {msgs.map((m, i) => {
          const anterior = msgs[i - 1];
          const novoDia = !anterior || dia(anterior.createdAt) !== dia(m.createdAt);
          const mesmoAutor = anterior && !novoDia && anterior.authorId === m.authorId;
          return (
            <React.Fragment key={m.id}>
              {novoDia && (
                <p className="sticky top-0 z-10 mx-auto my-3 w-fit rounded-full bg-zinc-900/90 px-3 py-1 text-[11px] font-medium text-zinc-400 backdrop-blur">{dia(m.createdAt)}</p>
              )}
              <Bolha m={m} emGrupo={emGrupo} mostrarAutor={emGrupo && !m.fromMe && !mesmoAutor} destacada={destacada === m.id} onAmpliar={setAmpliada} onApagar={apagar} onResponder={responder} onIrPara={irPara} onCarregou={descer} />
            </React.Fragment>
          );
        })}
        {enviando && enviando !== 'texto' && (
          <p className="flex items-center justify-end gap-2 text-[11px] text-zinc-500">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            {enviando === 'video' ? 'Enviando vídeo…' : enviando === 'imagem' ? 'Enviando foto…' : enviando === 'audio' ? 'Enviando áudio…' : 'Enviando…'}
          </p>
        )}
      </div>

      {erro && <p className="border-t border-zinc-800 px-4 py-2 text-xs text-clay-300">{erro}</p>}

      <div className="relative border-t border-zinc-800 p-2.5">
        {respondendo && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border-l-4 border-emerald-400 bg-zinc-900 py-1.5 pl-3 pr-1.5">
            <Icon name="reply" size={14} className="shrink-0 text-emerald-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-emerald-400">Respondendo a {respondendo.fromMe ? 'você' : respondendo.authorName || contato || 'mensagem'}</span>
              <span className="block truncate text-xs text-zinc-400">{previaDe(respondendo)}</span>
            </span>
            <button type="button" onClick={() => setRespondendo(null)} aria-label="Cancelar resposta" className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        {painel && meuId && <PainelDeFigurinhas meuId={meuId} onEscolher={(e) => void escolher(e)} onFechar={() => setPainel(false)} />}
        {gravando ? (
          <div className="flex items-center gap-3 rounded-xl bg-zinc-900 px-3 py-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#dc2626]" />
            <span className="font-mono text-sm text-zinc-100">{mmss((agora - gravando.inicio) / 1000)}</span>
            <span className="flex-1 text-xs text-zinc-500">Gravando mensagem de voz…</span>
            <button type="button" onClick={() => pararGravacao(true)} className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-clay-300">Cancelar</button>
            <button type="button" onClick={() => pararGravacao(false)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-zinc-950">
              <Icon name="send" size={13} /> Enviar
            </button>
          </div>
        ) : (
          <form onSubmit={enviarTexto} className="flex items-end gap-1.5">
            <button type="button" data-abre-painel onClick={() => setPainel((p) => !p)} aria-label="Emoji, figurinhas e adesivos" title="Emoji, figurinhas e adesivos"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl transition ${painel ? 'bg-emerald-950' : 'hover:bg-zinc-800'}`}>
              😊
            </button>
            <button type="button" onClick={() => arquivo.current?.click()} disabled={Boolean(enviando)} aria-label="Enviar foto ou vídeo" title="Foto ou vídeo"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40">
              <Icon name="image" size={19} />
            </button>
            <input ref={arquivo} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden onChange={(e) => e.target.files?.[0] && void anexar(e.target.files[0])} />
            <textarea
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && respondendo) setRespondendo(null);
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void enviarTexto();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={placeholder}
              className="max-h-32 min-h-[2.5rem] min-w-0 flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:border-emerald-600 focus:outline-none"
            />
            {texto.trim() ? (
              <button disabled={Boolean(enviando)} aria-label="Enviar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50">
                <Icon name="send" size={17} />
              </button>
            ) : (
              <button type="button" onClick={() => void comecarGravacao()} disabled={Boolean(enviando)} aria-label="Gravar mensagem de voz" title="Mensagem de voz"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50">
                <Icon name="mic" size={17} />
              </button>
            )}
          </form>
        )}
      </div>

      {ampliada && (
        <button type="button" onClick={() => setAmpliada(null)} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" aria-label="Fechar imagem">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ampliada} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
        </button>
      )}
    </section>
  );
}

type BolhaProps = {
  m: Msg;
  emGrupo: boolean;
  mostrarAutor: boolean;
  destacada: boolean;
  onAmpliar: (url: string) => void;
  onApagar: (m: Msg) => void;
  onResponder: (m: Msg) => void;
  onIrPara: (id: string) => void;
  onCarregou: () => void;
};

function Bolha({ m, emGrupo, mostrarAutor, destacada, onAmpliar, onApagar, onResponder, onIrPara, onCarregou }: BolhaProps) {
  const [salva, setSalva] = useState(false);
  // Arrastar a mensagem para a direita (no toque) responde, como nos apps de conversa.
  const [arraste, setArraste] = useState(0);
  const toque = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const LIMIAR = 56;
  const semBolha = m.kind === 'figurinha' || m.kind === 'adesivo';
  const lado = m.fromMe ? 'justify-end' : 'justify-start';
  const cor = m.fromMe ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-100';
  const rodape = (
    <span className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${m.fromMe && !semBolha ? 'text-zinc-800/70' : 'text-zinc-500'}`}>
      {hora(m.createdAt)}
      {m.fromMe && !emGrupo && <span title={m.readAt ? 'Lida' : 'Enviada'}>{m.readAt ? '✓✓' : '✓'}</span>}
    </span>
  );

  let conteudo: React.ReactNode;
  switch (m.kind) {
    case 'imagem':
      conteudo = m.mediaUrl ? (
        <button type="button" onClick={() => onAmpliar(m.mediaUrl!)} className="block overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.mediaUrl} alt={m.body || 'Foto'} loading="lazy" onLoad={onCarregou} className="max-h-72 w-auto max-w-full object-cover" style={{ aspectRatio: m.meta?.w && m.meta?.h ? `${m.meta.w}/${m.meta.h}` : undefined }} />
        </button>
      ) : <p className="text-xs opacity-70">Foto indisponível</p>;
      break;
    case 'video':
      conteudo = m.mediaUrl ? <video src={m.mediaUrl} controls playsInline preload="metadata" onLoadedMetadata={onCarregou} className="max-h-80 w-full max-w-sm rounded-xl bg-black" /> : <p className="text-xs opacity-70">Vídeo indisponível</p>;
      break;
    case 'audio':
      conteudo = m.mediaUrl ? (
        <div className="flex items-center gap-2">
          <Icon name="mic" size={15} className="shrink-0 opacity-70" />
          <audio src={m.mediaUrl} controls preload="metadata" className="h-9 w-56 max-w-full" />
          {m.meta?.duracao ? <span className="text-[11px] opacity-70">{mmss(Number(m.meta.duracao))}</span> : null}
        </div>
      ) : <p className="text-xs opacity-70">Áudio indisponível</p>;
      break;
    case 'figurinha':
      conteudo = m.meta?.emoji ? (
        <span className="figurinha-pula block text-7xl leading-none drop-shadow-lg">{m.meta.emoji}</span>
      ) : m.mediaUrl ? (
        <span className="group/fig relative block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.mediaUrl} alt="Figurinha" loading="lazy" onLoad={onCarregou} className="figurinha-pula h-36 w-36 object-contain drop-shadow-xl" />
          {!m.fromMe && m.mediaPath && (
            <button type="button" onClick={() => { salvarFigurinha(m.mediaPath!); setSalva(true); }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-zinc-900/95 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 opacity-0 transition group-hover/fig:opacity-100 focus:opacity-100">
              {salva ? 'Salva ✓' : 'Salvar figurinha'}
            </button>
          )}
        </span>
      ) : null;
      break;
    case 'adesivo':
      // eslint-disable-next-line @next/next/no-img-element
      conteudo = m.mediaUrl ? (
        m.meta?.botton ? (
          <img src={m.mediaUrl} alt="Botton" loading="lazy" onLoad={onCarregou} className="h-28 w-28 rounded-full object-cover shadow-xl" />
        ) : (
          <img src={m.mediaUrl} alt="Adesivo" loading="lazy" onLoad={onCarregou} className="max-h-40 w-auto max-w-[14rem] -rotate-2 object-contain" />
        )
      ) : null;
      break;
    default:
      conteudo = null;
  }

  const citacao = m.replyTo && (
    <button type="button" onClick={() => onIrPara(m.replyTo!.id)}
      className={`mb-1 block w-full rounded-lg border-l-4 px-2 py-1 text-left ${m.fromMe && !semBolha ? 'border-zinc-950/40 bg-zinc-950/10' : 'border-emerald-400 bg-zinc-950/40'}`}>
      <span className={`block text-[11px] font-semibold ${m.fromMe && !semBolha ? 'text-zinc-950/80' : 'text-emerald-400'}`}>{m.replyTo.authorName}</span>
      <span className={`line-clamp-2 block text-xs ${m.fromMe && !semBolha ? 'text-zinc-950/70' : 'text-zinc-400'}`}>{m.replyTo.texto}</span>
    </button>
  );
  const acoes = (
    <span className="mb-2 flex shrink-0 gap-0.5 opacity-0 transition group-hover/msg:opacity-100 group-focus-within/msg:opacity-100">
      <button type="button" onClick={() => onResponder(m)} className="rounded-full p-1 text-zinc-500 hover:text-emerald-400" aria-label="Responder mensagem" title="Responder">
        <Icon name="reply" size={14} />
      </button>
      {m.fromMe && (
        <button type="button" onClick={() => onApagar(m)} className="rounded-full p-1 text-zinc-600 hover:text-clay-300" aria-label="Apagar mensagem" title="Apagar">
          <Icon name="trash" size={13} />
        </button>
      )}
    </span>
  );

  return (
    <div
      data-msg={m.id}
      className={`group/msg relative flex items-end gap-2 rounded-xl transition-colors duration-700 [touch-action:pan-y] ${lado} ${destacada ? 'bg-emerald-400/15' : ''}`}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') return;
        toque.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
      }}
      onPointerMove={(e) => {
        const t = toque.current;
        if (!t || t.id !== e.pointerId) return;
        const dx = e.clientX - t.x;
        const dy = e.clientY - t.y;
        if (t.horizontal === null && Math.hypot(dx, dy) > 8) t.horizontal = Math.abs(dx) > Math.abs(dy);
        if (t.horizontal) setArraste(Math.max(0, Math.min(dx, 80)));
      }}
      onPointerUp={() => {
        if (arraste >= LIMIAR) onResponder(m);
        toque.current = null;
        setArraste(0);
      }}
      onPointerCancel={() => {
        toque.current = null;
        setArraste(0);
      }}
    >
      {arraste > 0 && (
        <span className="absolute left-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-900 text-emerald-400" style={{ opacity: Math.min(1, arraste / LIMIAR) }}>
          <Icon name="reply" size={14} />
        </span>
      )}
      {m.fromMe && acoes}
      {emGrupo && !m.fromMe && (
        <span className="w-7 shrink-0">{mostrarAutor && <Avatar nome={m.authorName || '?'} path={m.authorAvatar} tamanho={28} />}</span>
      )}
      <div
        className={`max-w-[85%] sm:max-w-[70%] ${semBolha ? '' : `rounded-2xl px-3 py-2 text-sm ${cor}`} ${!semBolha && m.kind !== 'texto' ? 'p-1.5' : ''}`}
        style={arraste ? { transform: `translateX(${arraste}px)` } : undefined}
      >
        {mostrarAutor && <p className={`mb-1 text-[11px] font-semibold text-emerald-400 ${semBolha ? 'px-1' : ''}`}>{m.authorName}</p>}
        {citacao}
        {conteudo}
        {m.body && m.kind !== 'figurinha' && m.kind !== 'adesivo' && (
          <p className={`whitespace-pre-wrap break-words ${m.kind === 'texto' ? '' : 'px-1.5 pt-1.5'} ${SO_EMOJI.test(m.body.trim()) ? 'text-4xl leading-tight' : ''}`}>{m.body}</p>
        )}
        <span className={m.kind === 'texto' || semBolha ? '' : 'px-1.5'}>{rodape}</span>
      </div>
      {!m.fromMe && acoes}
    </div>
  );
}
