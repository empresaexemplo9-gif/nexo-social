import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from './supabase-server';

// Tipos e utilidades da agenda social (compromissos, convites, recados).

export type ParticipantStatus = 'pendente' | 'confirmado' | 'recusado';

export interface ParticipantDTO {
  userId: string;
  name: string | null;
  email: string | null;
  status: ParticipantStatus;
}

export interface AppointmentDTO {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  city: string | null;
  isGroup: boolean;
  ownerId: string;
  ownerName: string | null;
  /** Papel do usuário atual neste compromisso. */
  role: 'dono' | 'convidado';
  /** Resposta do usuário atual (só existe quando convidado). */
  myStatus: ParticipantStatus | null;
  participants: ParticipantDTO[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Nomes/e-mails dos usuários citados, em uma consulta só. */
export async function profilesByIds(sb: SupabaseClient, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map<string, { name: string | null; email: string | null }>();
  const { data } = await sb.from('profiles').select('id, full_name, email').in('id', unique);
  const map = new Map<string, { name: string | null; email: string | null }>();
  for (const p of data ?? []) map.set(p.id, { name: p.full_name ?? null, email: p.email ?? null });
  return map;
}

/**
 * Compromissos do usuário: os que ele criou + aqueles em que foi marcado.
 * Ordenados por data de início.
 */
export async function listAppointments(sb: SupabaseClient, userId: string): Promise<AppointmentDTO[]> {
  // 1) IDs em que sou participante
  const { data: mine } = await sb.from('appointment_participants').select('appointment_id, status').eq('user_id', userId);
  const invitedIds = (mine ?? []).map((r: any) => r.appointment_id);
  const myStatusById = new Map<string, ParticipantStatus>((mine ?? []).map((r: any) => [r.appointment_id, r.status]));

  // 2) Compromissos que eu criei
  const { data: owned, error } = await sb.from('appointments').select('*').eq('owner_id', userId);
  if (error) throw new Error(error.message);

  // 3) Compromissos em que fui marcado
  let invited: any[] = [];
  if (invitedIds.length) {
    const { data } = await sb.from('appointments').select('*').in('id', invitedIds);
    invited = data ?? [];
  }

  const byId = new Map<string, any>();
  for (const a of [...(owned ?? []), ...invited]) byId.set(a.id, a);
  const rows = Array.from(byId.values());
  if (!rows.length) return [];

  // 4) Participantes de todos eles
  const { data: parts } = await sb
    .from('appointment_participants')
    .select('appointment_id, user_id, status')
    .in('appointment_id', rows.map((r) => r.id));

  const names = await profilesByIds(sb, [
    ...rows.map((r) => r.owner_id),
    ...(parts ?? []).map((p: any) => p.user_id),
  ]);

  return rows
    .map((a): AppointmentDTO => {
      const mineHere = (parts ?? []).filter((p: any) => p.appointment_id === a.id);
      return {
        id: a.id,
        title: a.title,
        description: a.description ?? null,
        startsAt: a.starts_at,
        endsAt: a.ends_at ?? null,
        location: a.location ?? null,
        city: a.city ?? null,
        isGroup: Boolean(a.is_group),
        ownerId: a.owner_id,
        ownerName: names.get(a.owner_id)?.name ?? names.get(a.owner_id)?.email ?? null,
        role: a.owner_id === userId ? 'dono' : 'convidado',
        myStatus: a.owner_id === userId ? null : myStatusById.get(a.id) ?? 'pendente',
        participants: mineHere.map((p: any) => ({
          userId: p.user_id,
          name: names.get(p.user_id)?.name ?? null,
          email: names.get(p.user_id)?.email ?? null,
          status: p.status as ParticipantStatus,
        })),
      };
    })
    .sort((x, y) => new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime());
}

/**
 * Cria notificações para outros usuários.
 * Usa service role porque o RLS impede inserir notificação em nome de terceiros.
 * Sem service role, apenas registra no log (a funcionalidade principal segue).
 */
export async function notify(
  rows: { userId: string; type: string; title: string; body?: string; link?: string; appointmentId?: string; actorId?: string }[],
) {
  if (!rows.length) return { ok: true, sent: 0 };
  const admin = createAdminClient();
  if (!admin) {
    console.warn('[notify] SUPABASE_SERVICE_ROLE_KEY ausente — notificações não gravadas.');
    return { ok: false, sent: 0, reason: 'service role ausente' };
  }
  const { error } = await admin.from('notifications').insert(
    rows.map((r) => ({
      user_id: r.userId,
      type: r.type,
      title: r.title,
      body: r.body ?? null,
      link: r.link ?? null,
      appointment_id: r.appointmentId ?? null,
      actor_id: r.actorId ?? null,
    })),
  );
  if (error) {
    console.error('[notify] falha:', error.message);
    return { ok: false, sent: 0, reason: error.message };
  }
  return { ok: true, sent: rows.length };
}

/** Procura um usuário pelo e-mail (função SECURITY DEFINER no banco). */
export async function findUserByEmail(sb: SupabaseClient, email: string) {
  const { data, error } = await sb.rpc('find_profile_by_email', { p_email: email });
  if (error) return { user: null, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { user: row ? { id: row.id as string, name: (row.full_name as string) ?? null, email: row.email as string } : null, error: null };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
