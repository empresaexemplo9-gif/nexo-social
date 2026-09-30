'use client';

// Ligar e desligar os avisos no aparelho (push) a partir do navegador.

export type EstadoDoPush =
  /** Navegador sem suporte a avisos. */
  | 'sem-suporte'
  /** iPhone/iPad: só recebe avisos com o app na Tela de Início. */
  | 'precisa-instalar'
  /** A pessoa bloqueou os avisos nas configurações do navegador. */
  | 'bloqueado'
  /** O servidor ainda não tem as chaves de push. */
  | 'sem-servidor'
  | 'desligado'
  | 'ligado';

const ehIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalado = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function chaveEmBytes(base64: string): Uint8Array {
  const b = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
}

/** O service worker (registra se ainda não houver — em desenvolvimento ele não é registrado sozinho). */
async function registro(): Promise<ServiceWorkerRegistration> {
  const atual = await navigator.serviceWorker.getRegistration();
  if (atual) return atual;
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

let chaveGuardada: string | null | undefined;
async function chaveDoServidor(): Promise<string | null> {
  if (chaveGuardada !== undefined) return chaveGuardada;
  const r = await fetch('/api/push/chave').then((x) => x.json()).catch(() => null);
  const chave: string | null = typeof r?.chave === 'string' && r.chave ? r.chave : null;
  if (chave) chaveGuardada = chave; // falha de rede não fica guardada
  return chave;
}

export async function estadoDoPush(): Promise<EstadoDoPush> {
  if (typeof window === 'undefined') return 'sem-suporte';
  const suporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!suporta) return ehIOS() && !instalado() ? 'precisa-instalar' : 'sem-suporte';
  if (Notification.permission === 'denied') return 'bloqueado';
  if (!(await chaveDoServidor())) return 'sem-servidor';
  if (Notification.permission !== 'granted') return 'desligado';
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  return inscricao ? 'ligado' : 'desligado';
}

async function enviarInscricao(inscricao: PushSubscription) {
  const r = await fetch('/api/push/inscricao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inscricao: inscricao.toJSON() }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Não foi possível ativar os avisos.');
}

/** Pede a permissão e inscreve este aparelho. Chame a partir de um toque (o navegador exige). */
export async function ativarPush(): Promise<EstadoDoPush> {
  const antes = await estadoDoPush();
  if (antes === 'sem-suporte' || antes === 'precisa-instalar' || antes === 'bloqueado' || antes === 'sem-servidor') return antes;
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') return permissao === 'denied' ? 'bloqueado' : 'desligado';
  const chave = await chaveDoServidor();
  if (!chave) return 'sem-servidor';
  const reg = await registro();
  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(chave) as BufferSource }));
  await enviarInscricao(inscricao);
  return 'ligado';
}

/** Este aparelho para de receber avisos. */
export async function desativarPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  if (!inscricao) return;
  await fetch('/api/push/inscricao', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: inscricao.endpoint }),
  }).catch(() => undefined);
  await inscricao.unsubscribe().catch(() => undefined);
}

/** Garante que o servidor conhece a inscrição deste aparelho (ex.: depois de entrar em outra conta). */
export async function renovarInscricao(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  if (inscricao) await enviarInscricao(inscricao).catch(() => undefined);
}

export async function testarPush(): Promise<void> {
  const r = await fetch('/api/push/teste', { method: 'POST' });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Não foi possível mandar o teste.');
}
