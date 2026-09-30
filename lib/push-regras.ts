// Regras dos avisos no aparelho (push): de que categoria é cada notificação,
// o que cada pessoa quer receber e o formato que o service worker mostra.
// Sem dependências — vale no servidor, no cliente e nos testes.

export type CategoriaDeAviso = 'ligacoes' | 'mensagens' | 'convites' | 'lembretes';

export type PreferenciasDeAviso = Record<CategoriaDeAviso, boolean>;

export const AVISOS_PADRAO: PreferenciasDeAviso = { ligacoes: true, mensagens: true, convites: true, lembretes: true };

export const CATEGORIAS_DE_AVISO: { id: CategoriaDeAviso; rotulo: string; detalhe: string }[] = [
  { id: 'ligacoes', rotulo: 'Ligações', detalhe: 'Chamadas de voz e vídeo tocam como telefone, com Atender e Recusar.' },
  { id: 'mensagens', rotulo: 'Mensagens', detalhe: 'Conversas diretas, recados e mensagens nos seus grupos.' },
  { id: 'convites', rotulo: 'Convites e comentários', detalhe: 'Convites e respostas da agenda, grupos e contatos, e comentários no Mural.' },
  { id: 'lembretes', rotulo: 'Lembretes da agenda', detalhe: 'Um aviso 30 minutos antes de cada compromisso.' },
];

/** A categoria de cada tipo de notificação (o que não se encaixa conta como convite/novidade). */
export function categoriaDoTipo(tipo: string): CategoriaDeAviso {
  if (tipo === 'chamada') return 'ligacoes';
  if (tipo === 'chat' || tipo === 'recado' || tipo === 'grupo_chat') return 'mensagens';
  if (tipo === 'lembrete') return 'lembretes';
  return 'convites';
}

/** Preferências salvas → formato conhecido (o que faltar fica ligado). */
export function formaDosAvisos(v: unknown): PreferenciasDeAviso {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const r = { ...AVISOS_PADRAO };
  for (const c of Object.keys(AVISOS_PADRAO) as CategoriaDeAviso[]) if (typeof o[c] === 'boolean') r[c] = o[c] as boolean;
  return r;
}

/** O que vai dentro do push (o service worker só lê isto). */
export interface AvisoPush {
  id?: string;
  tipo: string;
  titulo: string;
  corpo: string;
  /** Caminho dentro da plataforma que o toque abre. */
  link: string;
  /** Avisos com a mesma etiqueta se substituem (uma conversa, uma ligação). */
  etiqueta: string;
  ligacao: boolean;
  quando: number;
}

/** Só caminhos da própria plataforma (o toque nunca leva para fora). */
export function linkSeguro(link: string | null | undefined): string {
  return typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link.slice(0, 500) : '/';
}

export interface LinhaDeNotificacao {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  actor_id?: string | null;
  group_id?: string | null;
  appointment_id?: string | null;
  created_at?: string | null;
}

export function avisoDaNotificacao(n: LinhaDeNotificacao): AvisoPush {
  const quem = n.actor_id ?? n.id;
  const etiqueta =
    n.type === 'chamada'
      ? `chamada-${n.group_id && linkSeguro(n.link).includes('chamada=grupo') ? `grupo-${n.group_id}` : quem}`
      : n.type === 'chat'
        ? `chat-${quem}`
        : n.type === 'recado'
          ? `recado-${quem}`
          : n.type === 'lembrete'
            ? `lembrete-${n.appointment_id ?? n.id}`
            : `aviso-${n.id}`;
  return {
    id: n.id,
    tipo: n.type,
    titulo: (n.title || 'nexo.social').slice(0, 120),
    corpo: (n.body ?? '').slice(0, 240),
    link: linkSeguro(n.link),
    etiqueta,
    ligacao: n.type === 'chamada',
    quando: n.created_at ? new Date(n.created_at).getTime() || Date.now() : Date.now(),
  };
}

/** Quanto o aviso vale e com que pressa o serviço de push entrega. */
export function opcoesDeEntrega(a: AvisoPush): { TTL: number; urgency: 'high' | 'normal' } {
  const c = categoriaDoTipo(a.tipo);
  if (c === 'ligacoes') return { TTL: 45, urgency: 'high' }; // ligação velha não toca
  if (c === 'mensagens') return { TTL: 60 * 60 * 24, urgency: 'high' };
  if (c === 'lembretes') return { TTL: 60 * 30, urgency: 'high' };
  return { TTL: 60 * 60 * 24 * 3, urgency: 'normal' };
}
