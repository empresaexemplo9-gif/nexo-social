// Widgets da home: cada bloco da página inicial é um widget que a pessoa pode
// esconder, trocar de lugar e deixar inteiro ou pela metade. Além dos blocos
// fixos, há widgets por interesse — clipes, acervo e eventos de um tema que ela
// segue — para montar a home em torno do que gosta.
//
// O arranjo fica nas preferências (`homeWidgets`): a ordem da lista é a ordem
// na tela e o que não está na lista está escondido. `null` = arranjo padrão.

import type { IconName } from '@/components/icons';
import type { CategorySlug } from './data';

export type TamanhoWidget = 'inteira' | 'metade';

export interface WidgetDaHome {
  id: string;
  tamanho: TamanhoWidget;
}

export interface TipoDeWidget {
  titulo: string;
  descricao: string;
  icone: IconName;
  tamanhoPadrao: TamanhoWidget;
}

/** Blocos fixos da home, na ordem do arranjo padrão. */
export const WIDGETS_FIXOS: Record<string, TipoDeWidget> = {
  trilha: {
    titulo: 'Sua trilha',
    descricao: 'Músicas e playlists do Spotify com os seus estilos.',
    icone: 'headphones',
    tamanhoPadrao: 'metade',
  },
  'assistir-ler': {
    titulo: 'Para assistir e ler',
    descricao: 'Filmes, séries e livros dos gêneros que você escolheu.',
    icone: 'film',
    tamanhoPadrao: 'metade',
  },
  shorts: {
    titulo: 'Shorts para você',
    descricao: 'Vídeos curtos dos seus temas e hobbies.',
    icone: 'shorts',
    tamanhoPadrao: 'inteira',
  },
  revista: {
    titulo: 'Revista do dia',
    descricao: 'Matérias, perfis e curiosidades dos seus temas.',
    icone: 'jornal',
    tamanhoPadrao: 'inteira',
  },
  gratis: {
    titulo: 'Assistir, ler e ouvir de graça',
    descricao: 'Filmes, livros e audiolivros liberados, tocando aqui.',
    icone: 'play',
    tamanhoPadrao: 'inteira',
  },
  nichos: {
    titulo: 'Seus nichos',
    descricao: 'Os temas com as indicações de cada um.',
    icone: 'compass',
    tamanhoPadrao: 'inteira',
  },
  'ao-vivo': {
    titulo: 'Ao vivo nos seus temas',
    descricao: 'O que está no ar agora nos temas que você segue.',
    icone: 'broadcast',
    tamanhoPadrao: 'inteira',
  },
  clipes: {
    titulo: 'Clipes do seu tema principal',
    descricao: 'Vídeos do primeiro tema que você segue.',
    icone: 'video',
    tamanhoPadrao: 'inteira',
  },
  'conhecer-hoje': {
    titulo: 'Para conhecer hoje',
    descricao: 'Acervo histórico dos seus temas — muda todo dia.',
    icone: 'sparkles',
    tamanhoPadrao: 'inteira',
  },
  agenda: {
    titulo: 'Sua agenda',
    descricao: 'O que vem por aí e os eventos perto de você.',
    icone: 'calendarCheck',
    tamanhoPadrao: 'inteira',
  },
  'bom-dia': {
    titulo: 'Bom Dia',
    descricao: 'Trilha matinal, receitas rápidas e hábitos.',
    icone: 'sunrise',
    tamanhoPadrao: 'metade',
  },
  newsletter: {
    titulo: 'Curadoria por e-mail',
    descricao: 'Receba um resumo dos seus temas.',
    icone: 'bookmark',
    tamanhoPadrao: 'metade',
  },
};

/** Widgets por interesse: `clipes:musica`, `acervo:cinema`, `eventos:esporte`… */
export const WIDGETS_DE_TEMA = {
  eventos: { titulo: (tema: string) => `Eventos de ${tema}`, descricao: 'Os próximos eventos deste tema.', icone: 'calendar' as IconName },
  clipes: { titulo: (tema: string) => `Clipes de ${tema}`, descricao: 'Vídeos novos deste tema.', icone: 'video' as IconName },
  acervo: { titulo: (tema: string) => `Para conhecer: ${tema}`, descricao: 'Clássicos e história deste tema.', icone: 'library' as IconName },
};
export type TipoDeTema = keyof typeof WIDGETS_DE_TEMA;

const LIMITE = 40;
const ID_DE_TEMA = /^(eventos|clipes|acervo):([a-z-]{2,30})$/;

export function widgetDeTema(id: string): { tipo: TipoDeTema; tema: CategorySlug } | null {
  const m = ID_DE_TEMA.exec(id);
  return m ? { tipo: m[1] as TipoDeTema, tema: m[2] as CategorySlug } : null;
}

export function widgetsPadrao(): WidgetDaHome[] {
  return Object.entries(WIDGETS_FIXOS).map(([id, t]) => ({ id, tamanho: t.tamanhoPadrao }));
}

/**
 * Valida o que veio do aparelho ou da conta: só ids conhecidos, sem repetir,
 * tamanhos válidos. `null` quando não há arranjo salvo (usa o padrão).
 */
export function normalizarWidgets(valor: unknown): WidgetDaHome[] | null {
  if (!Array.isArray(valor)) return null;
  const vistos = new Set<string>();
  const saida: WidgetDaHome[] = [];
  for (const item of valor) {
    if (!item || typeof item !== 'object') continue;
    const id = (item as { id?: unknown }).id;
    const tamanho = (item as { tamanho?: unknown }).tamanho;
    if (typeof id !== 'string' || vistos.has(id)) continue;
    if (!(id in WIDGETS_FIXOS) && !widgetDeTema(id)) continue;
    vistos.add(id);
    saida.push({ id, tamanho: tamanho === 'metade' ? 'metade' : 'inteira' });
    if (saida.length >= LIMITE) break;
  }
  return saida;
}
