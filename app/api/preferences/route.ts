import { NextResponse } from 'next/server';
import { getSession } from '@/lib/api-helpers';
import { normalizarWidgets } from '@/lib/widgets';

export const dynamic = 'force-dynamic';

const MIXES = ['misturar', 'famosas', 'lancamentos'];
const ESTILOS = ['misturar', 'classicos', 'descobertas'];

/**
 * Colunas que podem ainda não existir no banco (vieram depois): se o upsert
 * falhar por causa de uma delas, salva o resto em vez de perder o questionário
 * inteiro — e avisa nos logs para rodar o db/schema.sql.
 */
const COLUNAS_OPCIONAIS = ['completed_at', 'music_hits', 'music_mix', 'home_widgets', 'estilo_indicacao', 'idioma_indicacao'];

/** Linha do banco → formato usado pelo aplicativo (camelCase). */
function toClient(row: Record<string, any>) {
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const interests = arr(row.interests);
  return {
    interests,
    subtopics: arr(row.subtopics),
    musicGenres: arr(row.music_genres),
    musicHits: row.music_hits === true,
    musicMix: MIXES.includes(row.music_mix) ? row.music_mix : 'misturar',
    filmGenres: arr(row.film_genres),
    bookGenres: arr(row.book_genres),
    hobbies: arr(row.hobbies),
    readingGoal: Number.isFinite(row.reading_goal) ? Number(row.reading_goal) : 12,
    city: row.city ?? null,
    radiusKm: Number.isFinite(row.radius_km) ? Number(row.radius_km) : 50,
    frequency: row.frequency ?? 'semanal',
    homeWidgets: normalizarWidgets(row.home_widgets),
    estiloIndicacao: ESTILOS.includes(row.estilo_indicacao) ? row.estilo_indicacao : 'misturar',
    idiomaIndicacao: row.idioma_indicacao === 'todos' ? 'todos' : 'pt',
    // Contas anteriores à coluna completed_at têm interesses mas não têm data.
    // Sem esta herança elas voltariam a ver "responda o questionário".
    completedAt: row.completed_at ?? (interests.length > 0 ? (row.updated_at ?? row.created_at ?? null) : null),
  };
}

// Lê as preferências do usuário autenticado.
export async function GET() {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data, error } = await sb.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // O userId identifica de quem é o perfil guardado no aparelho: sem ele, as
  // respostas de quem usou o navegador antes seriam adotadas por esta conta.
  // updatedAt diz ao aparelho se uma edição que ele não conseguiu subir é mais
  // nova que a versão da conta — e por isso deve vencer em vez de ser apagada.
  return NextResponse.json({
    userId: user.id,
    preferences: data ? toClient(data) : null,
    updatedAt: data?.updated_at ?? null,
  });
}

// Cria/atualiza as preferências do usuário autenticado (resultado do questionário).
export async function PUT(request: Request) {
  const { sb, user } = await getSession();
  if (!sb) return NextResponse.json({ error: 'Supabase não configurado.' }, { status: 503 });
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  let body: { interests?: string[]; city?: string | null; radiusKm?: number; frequency?: string; [k: string]: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }

  // Atualização parcial: só grava o que veio no corpo, para que salvar um
  // campo isolado (a meta de leitura, por exemplo) não zere os interesses.
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  const row: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  const b = body as Record<string, unknown>;

  const arrayFields: [string, string][] = [
    ['interests', 'interests'],
    ['subtopics', 'subtopics'],
    ['musicGenres', 'music_genres'],
    ['filmGenres', 'film_genres'],
    ['bookGenres', 'book_genres'],
    ['hobbies', 'hobbies'],
  ];
  for (const [from, to] of arrayFields) {
    if (from in b) row[to] = arr(b[from]);
  }

  if ('city' in b) row.city = b.city ?? null;
  if (Number.isFinite(b.radiusKm)) row.radius_km = b.radiusKm;
  if (typeof b.frequency === 'string') row.frequency = b.frequency;
  if (Number.isFinite(b.readingGoal)) row.reading_goal = Math.min(365, Math.max(1, Number(b.readingGoal)));
  if (typeof b.musicHits === 'boolean') row.music_hits = b.musicHits;
  if (typeof b.musicMix === 'string' && MIXES.includes(b.musicMix)) row.music_mix = b.musicMix;
  if ('homeWidgets' in b) row.home_widgets = normalizarWidgets(b.homeWidgets);
  if (typeof b.estiloIndicacao === 'string' && ESTILOS.includes(b.estiloIndicacao)) row.estilo_indicacao = b.estiloIndicacao;
  if (b.idiomaIndicacao === 'pt' || b.idiomaIndicacao === 'todos') row.idioma_indicacao = b.idiomaIndicacao;

  // A conclusão do questionário fica na conta — é ela que impede a plataforma
  // de pedir o questionário de novo em outro aparelho. `null` limpa (é o que
  // "refazer questionário" envia), senão o perfil antigo voltaria depois.
  if ('completedAt' in b) {
    if (b.completedAt === null) row.completed_at = null;
    else if (typeof b.completedAt === 'string' && !Number.isNaN(Date.parse(b.completedAt))) {
      row.completed_at = new Date(b.completedAt).toISOString();
    }
  }

  let { error } = await sb.from('user_preferences').upsert(row, { onConflict: 'user_id' });

  // Janela entre publicar o código e rodar a migração: sem a coluna, o
  // questionário inteiro falharia. Tira a coluna que o banco recusou e tenta de
  // novo — uma vez por coluna opcional, no máximo.
  for (let i = 0; error && i < COLUNAS_OPCIONAIS.length; i++) {
    const ausente = COLUNAS_OPCIONAIS.find((c) => c in row && error!.message.includes(c));
    if (!ausente) break;
    console.warn(`[preferences] coluna ${ausente} ausente — rode db/schema.sql:`, error.message);
    delete row[ausente];
    ({ error } = await sb.from('user_preferences').upsert(row, { onConflict: 'user_id' }));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Devolve o estado final para o cliente alinhar o armazenamento do aparelho.
  const { data } = await sb.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
  return NextResponse.json({ ok: true, preferences: data ? toClient(data) : null });
}
