'use client';

// Resposta a convites (compromisso ou grupo) — a mesma do sino, da agenda e da
// Comunidade — e o aviso entre as telas: quem responde no sino atualiza a
// agenda aberta, e vice-versa.

export const EVENTO_CONVITES = 'nexo:convites';

export function avisarConvites() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_CONVITES));
}

export interface ConviteAlvo {
  type: string;
  appointmentId?: string | null;
  groupId?: string | null;
}

/** Positivo = concordo / aceito. Negativo = não concordo / recuso. */
export async function responderConvite(alvo: ConviteAlvo, positivo: boolean): Promise<{ ok: boolean; error?: string }> {
  let res: Response;
  try {
    if (alvo.type === 'convite_grupo' && alvo.groupId) {
      res = await fetch(`/api/comunidade/grupos/${alvo.groupId}/resposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aceitar: positivo }),
      });
    } else if (alvo.appointmentId) {
      res = await fetch('/api/agenda/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: alvo.appointmentId, status: positivo ? 'confirmado' : 'recusado' }),
      });
    } else {
      return { ok: false, error: 'Convite sem destino.' };
    }
  } catch {
    return { ok: false, error: 'Sem conexão. Tente de novo.' };
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
  avisarConvites();
  return { ok: true };
}
