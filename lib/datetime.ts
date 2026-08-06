// Utilitários de data/hora dos eventos.
// Formatação sempre no fuso America/Sao_Paulo para que servidor e cliente
// produzam exatamente o mesmo texto (evita divergência de hidratação).

const TZ = 'America/Sao_Paulo';

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  day: '2-digit',
  month: 'short',
});

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
});

const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'short' });

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Ano, mês e dia no fuso de São Paulo — base das seleções semanais/mensais. */
export function saoPauloParts(d: Date = new Date()): { year: number; month: number; day: number } {
  const [year, month, day] = partsFmt.format(d).split('-').map(Number);
  return { year, month, day };
}

/** "12 de ago • 19:00" */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${dateFmt.format(d).replace('.', '')} • ${timeFmt.format(d)}`;
}

/** "sáb, 12 de ago • 19:00" */
export function formatEventDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${weekdayFmt.format(d).replace('.', '')}, ${formatEventDate(iso)}`;
}

/** Dias inteiros entre hoje e a data (0 = hoje, 1 = amanhã), no fuso local do evento. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  const dayMs = 86400000;
  // Compara por dia-calendário em UTC (determinístico nos dois lados).
  const a = Math.floor(d.getTime() / dayMs);
  const b = Math.floor(now.getTime() / dayMs);
  return a - b;
}

export function isHappeningNow(startsAt: string, endsAt: string | undefined, now: Date = new Date()): boolean {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 3 * 3600000; // 3h por padrão
  const t = now.getTime();
  return t >= start && t <= end;
}

export function isUpcoming(startsAt: string, endsAt: string | undefined, now: Date = new Date()): boolean {
  const end = endsAt ? new Date(endsAt).getTime() : new Date(startsAt).getTime() + 3 * 3600000;
  return end >= now.getTime();
}

/** Rótulo curto: "Acontecendo agora", "Hoje", "Amanhã", "Em 3 dias", "sáb, 12 de ago". */
export function relativeLabel(startsAt: string, endsAt?: string, now: Date = new Date()): string {
  if (isHappeningNow(startsAt, endsAt, now)) return 'Acontecendo agora';
  const d = daysUntil(startsAt, now);
  if (d < 0) return 'Já aconteceu';
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Amanhã';
  if (d <= 7) return `Em ${d} dias`;
  return formatEventDateLong(startsAt).split(' •')[0];
}
