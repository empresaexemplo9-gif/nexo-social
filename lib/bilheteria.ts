// Bilheteria própria — tipos e formatação, usáveis no servidor e no navegador.
//
// Todo valor de dinheiro trafega em CENTAVOS, como inteiro. Real com ponto
// flutuante erra em contas simples (0.1 + 0.2), e ingresso é dinheiro de
// verdade: a conversão para reais acontece só na hora de mostrar.

export type StatusPedido = 'pendente' | 'pago' | 'cancelado' | 'expirado';
export type StatusIngresso = 'valido' | 'usado' | 'cancelado';

export interface TipoIngresso {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  quantity: number;
  sold: number;
  max_per_order: number;
  sales_start: string | null;
  sales_end: string | null;
  active: boolean;
}

export interface Pedido {
  id: string;
  event_id: string;
  status: StatusPedido;
  total_cents: number;
  buyer_name: string | null;
  buyer_email: string | null;
  payment_provider: string | null;
  payment_ref: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Ingresso {
  id: string;
  code: string;
  status: StatusIngresso;
  event_id: string;
  ticket_type_id: string;
  holder_name: string | null;
  checked_in_at: string | null;
  created_at: string;
}

/** Centavos → "R$ 80,00". Zero vira "Gratuito", que é o que a pessoa quer ler. */
export function moeda(cents: number): string {
  if (!cents) return 'Gratuito';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Quantos ainda dá para comprar de um tipo, respeitando estoque e limite. */
export function disponivel(t: TipoIngresso): number {
  return Math.max(0, Math.min(t.quantity - t.sold, t.max_per_order));
}

/** Por que um tipo de ingresso não pode ser comprado agora — ou null se pode. */
export function motivoIndisponivel(t: TipoIngresso, agora = new Date()): string | null {
  if (!t.active) return 'Não está à venda';
  if (t.sales_start && agora < new Date(t.sales_start)) return 'Vendas ainda não começaram';
  if (t.sales_end && agora > new Date(t.sales_end)) return 'Vendas encerradas';
  if (t.quantity - t.sold <= 0) return 'Esgotado';
  return null;
}

/** Um evento só vende aqui dentro se alguém cadastrou tipos de ingresso. */
export function vendeNaPlataforma(tipos: TipoIngresso[]): boolean {
  return tipos.length > 0;
}

const RESTAM_LABEL = 8;

/** "Últimos 3" quando o estoque está no fim; vazio quando ainda há folga. */
export function alertaEstoque(t: TipoIngresso): string {
  const restam = t.quantity - t.sold;
  if (restam <= 0) return 'Esgotado';
  if (restam <= RESTAM_LABEL) return restam === 1 ? 'Último ingresso' : `Últimos ${restam}`;
  return '';
}
