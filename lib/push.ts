import 'server-only';

// Envio dos avisos no aparelho (Web Push, com chaves VAPID). Cada notificação
// gravada em `notifications` sai uma vez para os aparelhos de quem a recebe,
// respeitando o que a pessoa escolheu na conta. Dois caminhos entregam:
//   - na hora: as rotas que geram avisos chamam `despacharAgora()`;
//   - a cada minuto: o banco (pg_cron) chama /api/push/despachar, que pega o
//     que ficou para trás (e os lembretes da agenda).
// Uma notificação nunca sai duas vezes: o banco "reserva" cada uma ao entregar
// (claim_pending_pushes, com SKIP LOCKED).

import { createHmac } from 'crypto';
import webpush from 'web-push';
import { createAdminClient } from './supabase-server';
import {
  AVISOS_PADRAO,
  avisoDaNotificacao,
  categoriaDoTipo,
  formaDosAvisos,
  opcoesDeEntrega,
  type AvisoPush,
  type LinhaDeNotificacao,
  type PreferenciasDeAviso,
} from './push-regras';

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

const PUBLICA = process.env.VAPID_PUBLIC_KEY?.trim() || null;
const PRIVADA = process.env.VAPID_PRIVATE_KEY?.trim() || null;
const ASSUNTO = process.env.VAPID_SUBJECT?.trim() || 'mailto:contato@nexo.social';

export const pushConfigurado = () => Boolean(PUBLICA && PRIVADA);
export const chavePublica = () => PUBLICA;

let preparado = false;
function preparar(): boolean {
  if (!PUBLICA || !PRIVADA) return false;
  if (!preparado) {
    webpush.setVapidDetails(ASSUNTO, PUBLICA, PRIVADA);
    preparado = true;
  }
  return true;
}

/** Segredo que o banco manda ao chamar /api/push/despachar (derivado da chave privada). */
export function segredoDoDespacho(): string | null {
  return PRIVADA ? createHmac('sha256', PRIVADA).update('nexo:despachar-push').digest('hex') : null;
}

// ---------------------------------------------------------------------------
// Quem recebe o quê
// ---------------------------------------------------------------------------

async function preferenciasDe(admin: Admin, ids: string[]): Promise<Map<string, PreferenciasDeAviso>> {
  const mapa = new Map<string, PreferenciasDeAviso>();
  if (!ids.length) return mapa;
  const { data, error } = await admin.from('user_preferences').select('user_id, notification_prefs').in('user_id', ids);
  // Sem a coluna (banco antigo): tudo ligado.
  if (!error) for (const r of data ?? []) mapa.set(r.user_id, formaDosAvisos(r.notification_prefs));
  return mapa;
}

interface Inscricao {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function inscricoesDe(admin: Admin, ids: string[]): Promise<Inscricao[]> {
  if (!ids.length) return [];
  const { data, error } = await admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', ids);
  return error ? [] : (data as Inscricao[]);
}

/** Entrega um aviso em cada aparelho; aparelho que saiu do push é esquecido. */
async function entregar(admin: Admin, inscricoes: Inscricao[], aviso: AvisoPush): Promise<number> {
  const corpo = JSON.stringify(aviso);
  const opcoes = { ...opcoesDeEntrega(aviso), timeout: 6000 };
  let ok = 0;
  const vencidas: string[] = [];
  await Promise.all(
    inscricoes.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, corpo, opcoes);
        ok += 1;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) vencidas.push(s.id);
        else console.warn('[push] falhou para um aparelho:', e?.statusCode ?? '', e?.body || e?.message || e);
      }
    }),
  );
  if (vencidas.length) await admin.from('push_subscriptions').delete().in('id', vencidas);
  else if (ok) await admin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).in('id', inscricoes.map((s) => s.id));
  return ok;
}

// ---------------------------------------------------------------------------
// Despachar
// ---------------------------------------------------------------------------

/** Entrega as notificações novas que ainda não saíram para os aparelhos. */
export async function despacharPush(): Promise<{ avisos: number; entregas: number }> {
  if (!preparar()) return { avisos: 0, entregas: 0 };
  const admin = createAdminClient();
  if (!admin) return { avisos: 0, entregas: 0 };
  const { data, error } = await admin.rpc('claim_pending_pushes', { p_limit: 200 });
  // Sem a migração (db/push.sql): nada a fazer.
  if (error || !Array.isArray(data) || !data.length) return { avisos: 0, entregas: 0 };

  const linhas = data as (LinhaDeNotificacao & { user_id: string })[];
  const pessoas = Array.from(new Set(linhas.map((l) => l.user_id)));
  const [prefs, inscricoes] = await Promise.all([preferenciasDe(admin, pessoas), inscricoesDe(admin, pessoas)]);
  let entregas = 0;
  await Promise.all(
    linhas.map(async (l) => {
      const quer = prefs.get(l.user_id) ?? AVISOS_PADRAO;
      if (!quer[categoriaDoTipo(l.type)]) return;
      const dele = inscricoes.filter((s) => s.user_id === l.user_id);
      if (dele.length) entregas += await entregar(admin, dele, avisoDaNotificacao(l));
    }),
  );
  return { avisos: linhas.length, entregas };
}

/** Despacha sem segurar a resposta da rota por muito tempo (o banco pega o resto em 1 minuto). */
export async function despacharAgora(prazo = 3000): Promise<void> {
  if (!pushConfigurado()) return;
  await Promise.race([
    despacharPush().catch((e) => console.warn('[push] despacho falhou:', e?.message || e)),
    new Promise((ok) => setTimeout(ok, prazo)),
  ]);
}

/** Aviso direto (sem linha em `notifications`): mensagens de grupo, teste. */
export async function enviarAviso(pessoas: string[], aviso: AvisoPush): Promise<number> {
  if (!pessoas.length || !preparar()) return 0;
  const admin = createAdminClient();
  if (!admin) return 0;
  const categoria = categoriaDoTipo(aviso.tipo);
  const ignorarPreferencias = aviso.tipo === 'teste';
  const [prefs, inscricoes] = await Promise.all([preferenciasDe(admin, pessoas), inscricoesDe(admin, pessoas)]);
  const alvo = inscricoes.filter((s) => ignorarPreferencias || (prefs.get(s.user_id) ?? AVISOS_PADRAO)[categoria]);
  return alvo.length ? entregar(admin, alvo, aviso) : 0;
}

// ---------------------------------------------------------------------------
// O banco aprende o endereço do despacho (para o agendador de 1 minuto)
// ---------------------------------------------------------------------------

let configurado = false;
/** Grava no banco para onde (e com que segredo) chamar o despacho. Uma vez por instância. */
export async function configurarDespacho(origem?: string | null): Promise<void> {
  if (configurado || !pushConfigurado()) return;
  const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const base = producao ? `https://${producao.replace(/^https?:\/\//, '')}` : process.env.VERCEL_ENV === 'production' ? origem : null;
  const segredo = segredoDoDespacho();
  const admin = createAdminClient();
  if (!base || !segredo || !admin || !/^https:\/\//.test(base)) return;
  const { error } = await admin.rpc('configurar_push', { p_url: `${base.replace(/\/$/, '')}/api/push/despachar`, p_segredo: segredo });
  if (!error) configurado = true;
}
