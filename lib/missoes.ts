// Missões: o que a pessoa faz na plataforma e libera colecionáveis por sorteio.
//
// Puro (sem banco): o catálogo, a semana das semanais e o tamanho do prêmio. O
// servidor (lib/missoes-servidor.ts) mede o progresso no uso real e resgata
// pela função do banco (db/missoes.sql), que sorteia itens quaisquer do
// catálogo — pode sair repetido, e repetido se troca.

export type Medida =
  | 'questionario'
  | 'perfil'
  | 'publicacoes'
  | 'comentarios'
  | 'reacoes'
  | 'listas'
  | 'rodas_criadas'
  | 'rodas_mensagens'
  | 'grupos'
  | 'chat_grupo'
  | 'compromissos'
  | 'leituras'
  | 'convites'
  | 'trocas';

export type PeriodoDaMissao = 'unica' | 'semanal';

export interface Missao {
  /** Fixo: é a chave do resgate no banco. */
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  periodo: PeriodoDaMissao;
  medida: Medida;
  meta: number;
  /** Quantos itens o resgate sorteia: de `premio[0]` a `premio[1]`. */
  premio: [number, number];
  /** Onde fazer. */
  link: string;
}

export const MISSOES: Missao[] = [
  // --- Da semana (voltam toda segunda-feira) ----------------------------------------
  { id: 'semana-publicar', titulo: 'Mural da semana', descricao: 'Publique 3 vezes no mural esta semana.', icone: 'jornal', periodo: 'semanal', medida: 'publicacoes', meta: 3, premio: [1, 2], link: '/comunidade' },
  { id: 'semana-comentar', titulo: 'Puxa conversa', descricao: 'Comente 5 vezes em publicações, listas ou posts de grupo.', icone: 'chat', periodo: 'semanal', medida: 'comentarios', meta: 5, premio: [1, 1], link: '/comunidade' },
  { id: 'semana-reagir', titulo: 'Dá um toque', descricao: 'Reaja 10 vezes a publicações e listas.', icone: 'heart', periodo: 'semanal', medida: 'reacoes', meta: 10, premio: [1, 1], link: '/comunidade' },
  { id: 'semana-roda', titulo: 'Roda viva', descricao: 'Mande 3 mensagens em rodas de conversa.', icone: 'users', periodo: 'semanal', medida: 'rodas_mensagens', meta: 3, premio: [1, 1], link: '/comunidade?aba=rodas' },
  { id: 'semana-grupo', titulo: 'Turma reunida', descricao: 'Mande 5 mensagens no chat de um grupo.', icone: 'chat', periodo: 'semanal', medida: 'chat_grupo', meta: 5, premio: [1, 1], link: '/comunidade?aba=grupos' },

  // --- Conquistas (uma vez) ----------------------------------------------------------
  { id: 'questionario', titulo: 'Conte do que gosta', descricao: 'Responda o questionário de interesses.', icone: 'sparkles', periodo: 'unica', medida: 'questionario', meta: 1, premio: [1, 1], link: '/questionario' },
  { id: 'perfil', titulo: 'Cara nova', descricao: 'Coloque foto e bio no seu perfil.', icone: 'user', periodo: 'unica', medida: 'perfil', meta: 2, premio: [1, 2], link: '/conta' },
  { id: 'primeira-publicacao', titulo: 'Primeira publicação', descricao: 'Publique pela primeira vez no mural.', icone: 'jornal', periodo: 'unica', medida: 'publicacoes', meta: 1, premio: [1, 2], link: '/comunidade' },
  { id: 'dez-publicacoes', titulo: 'Voz do mural', descricao: 'Chegue a 10 publicações no mural.', icone: 'broadcast', periodo: 'unica', medida: 'publicacoes', meta: 10, premio: [2, 3], link: '/comunidade' },
  { id: 'comentarios-10', titulo: 'Bom de papo', descricao: 'Chegue a 10 comentários.', icone: 'chat', periodo: 'unica', medida: 'comentarios', meta: 10, premio: [1, 2], link: '/comunidade' },
  { id: 'primeira-lista', titulo: 'Minha lista', descricao: 'Monte uma lista (filmes, músicas, livros…).', icone: 'bookmark', periodo: 'unica', medida: 'listas', meta: 1, premio: [1, 2], link: '/comunidade?aba=listas' },
  { id: 'primeira-roda', titulo: 'Abra a roda', descricao: 'Crie uma roda de conversa.', icone: 'users', periodo: 'unica', medida: 'rodas_criadas', meta: 1, premio: [1, 2], link: '/comunidade?aba=rodas' },
  { id: 'entrar-grupo', titulo: 'Turma', descricao: 'Entre em um grupo da comunidade.', icone: 'users', periodo: 'unica', medida: 'grupos', meta: 1, premio: [1, 1], link: '/comunidade?aba=grupos' },
  { id: 'agenda-3', titulo: 'Agenda viva', descricao: 'Marque 3 compromissos na agenda.', icone: 'calendarCheck', periodo: 'unica', medida: 'compromissos', meta: 3, premio: [1, 2], link: '/agenda' },
  { id: 'leituras-3', titulo: 'Leitor', descricao: 'Registre 3 leituras.', icone: 'book', periodo: 'unica', medida: 'leituras', meta: 3, premio: [1, 2], link: '/livros' },
  { id: 'convite-aceito', titulo: 'Traga alguém', descricao: 'Tenha 1 convite aceito por quem você chamou.', icone: 'mail', periodo: 'unica', medida: 'convites', meta: 1, premio: [2, 3], link: '/convites' },
  { id: 'primeira-troca', titulo: 'Primeira troca', descricao: 'Troque um repetido com alguém.', icone: 'refresh', periodo: 'unica', medida: 'trocas', meta: 1, premio: [1, 1], link: '/colecionaveis?aba=trocas' },
];

export const missaoPorId = (id: unknown) => MISSOES.find((m) => m.id === id) ?? null;

// As semanas contam no horário de Brasília (sem horário de verão desde 2019).
const BRASILIA = -3 * 3600 * 1000;

/** Segunda-feira 00:00 (Brasília) da semana de `agora`, como instante. */
export function inicioDaSemana(agora: Date): Date {
  const local = new Date(agora.getTime() + BRASILIA);
  const dia = (local.getUTCDay() + 6) % 7; // segunda = 0
  const meiaNoite = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dia);
  return new Date(meiaNoite - BRASILIA);
}

/** A semana ISO de `agora` (Brasília) como chave do resgate: '2026-S40'. */
export function semanaDe(agora: Date): string {
  const local = new Date(agora.getTime() + BRASILIA);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const dia = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dia + 3); // a quinta-feira da semana decide o ano
  const ano = d.getUTCFullYear();
  const primeiraQuinta = new Date(Date.UTC(ano, 0, 4));
  const semana = 1 + Math.round(((d.getTime() - primeiraQuinta.getTime()) / 86400000 - 3 + ((primeiraQuinta.getUTCDay() + 6) % 7)) / 7);
  return `${ano}-S${String(semana).padStart(2, '0')}`;
}

/** A chave do período do resgate: 'sempre' (conquista) ou a semana. */
export const periodoDaMissao = (m: Missao, agora: Date) => (m.periodo === 'unica' ? 'sempre' : semanaDe(agora));

/** Quantos itens sortear neste resgate (`sorte` de 0 a 1). */
export function tamanhoDoPremio(m: Missao, sorte: number) {
  const [min, max] = m.premio;
  return Math.min(max, min + Math.floor(Math.max(0, Math.min(0.999999, sorte)) * (max - min + 1)));
}

export const textoDoPremio = (m: Missao) =>
  m.premio[0] === m.premio[1]
    ? `${m.premio[0]} ${m.premio[0] === 1 ? 'item sorteado' : 'itens sorteados'}`
    : `${m.premio[0]} a ${m.premio[1]} itens sorteados`;

export type EstadoDaMissao = 'andamento' | 'pronta' | 'resgatada';

export interface MissaoParaCliente extends Missao {
  progresso: number;
  estado: EstadoDaMissao;
  /** Os itens que saíram no resgate (ids), quando já resgatada. */
  ganhos?: string[];
}

export function estadoDaMissao(progresso: number, meta: number, resgatada: boolean): EstadoDaMissao {
  if (resgatada) return 'resgatada';
  return progresso >= meta ? 'pronta' : 'andamento';
}
