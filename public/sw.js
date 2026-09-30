/* Service worker da nexo.social.
 *
 * Deixa o app instalável, não deixa a tela em branco quando a rede cai e
 * mostra os avisos no aparelho (push) — com som, mesmo com o app fechado.
 * NÃO faz cache de resposta de API — placar, ao vivo e agenda precisam ser
 * sempre atuais, e servir dado velho ali seria pior que mostrar erro.
 *
 * Estratégias:
 *   - navegação (HTML): rede primeiro, com a página offline como reserva;
 *   - estáticos do build (/_next/static, ícones): cache primeiro, pois têm
 *     hash no nome e nunca mudam de conteúdo;
 *   - qualquer /api/: passa direto, sem tocar no cache.
 */

// Suba a versão quando um arquivo sem hash no nome mudar de conteúdo (ícones,
// logo.svg): o cache antigo é apagado na ativação e o novo é baixado.
// v4: selo NEXO • SOCIAL • CULTURA • NOVIDADE e tema claro.
// v6: avisos no aparelho (push).
const VERSAO = 'nexo-v6';
const SHELL = `${VERSAO}-shell`;
const ESTATICO = `${VERSAO}-estatico`;
const OFFLINE = '/offline';

const PRE_CACHE = [OFFLINE, '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/logo.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRE_CACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((k) => !k.startsWith(VERSAO)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Só cuidamos do nosso próprio domínio.
  if (url.origin !== self.location.origin) return;

  // API nunca entra em cache: os dados são de agora.
  if (url.pathname.startsWith('/api/')) return;

  // Navegação: rede primeiro, offline como último recurso.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(OFFLINE)) ?? Response.error()),
    );
    return;
  }

  // Estáticos com hash: cache primeiro.
  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(ESTATICO).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
  }
});

// ---------------------------------------------------------------------------
// Avisos no aparelho (push)
// ---------------------------------------------------------------------------
//
// O servidor manda { tipo, titulo, corpo, link, etiqueta, ligacao, quando }.
// Todo aviso toca (silent: false). Ligação: fica na tela com Atender/Recusar e
// volta a tocar e vibrar a cada 5 segundos por 30 segundos, até a pessoa
// atender, recusar ou fechar. Com o app aberto e na frente, a ligação toca no
// próprio app, e o aviso da conversa que a pessoa já está vendo não repete.

const VIBRAR_LIGACAO = [700, 300, 700, 300, 700, 1200];
const VIBRAR_AVISO = [200, 100, 200];
const TOQUE_DA_LIGACAO_MS = 30000;
const INTERVALO_DO_TOQUE_MS = 5000;
// Etiquetas de ligações que a pessoa já atendeu, recusou ou fechou.
const encerradas = new Set();

async function janelasNaFrente() {
  const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return janelas.filter((c) => c.visibilityState === 'visible' && c.focused);
}

async function appNaFrente() {
  return (await janelasNaFrente()).length > 0;
}

/** O app já avisa sozinho: ligação com o app na frente, ou a conversa que já está aberta. */
async function appJaAvisa(a) {
  const janelas = await janelasNaFrente();
  if (!janelas.length) return false;
  if (a.ligacao) return true;
  const alvo = new URL(a.link || '/', self.location.origin);
  return janelas.some((c) => {
    const u = new URL(c.url);
    return u.pathname === alvo.pathname && u.search === alvo.search && alvo.pathname !== '/';
  });
}

function opcoesDoAviso(a) {
  const ligacao = Boolean(a.ligacao);
  return {
    body: a.corpo || '',
    tag: a.etiqueta || undefined,
    renotify: Boolean(a.etiqueta),
    silent: false,
    requireInteraction: ligacao,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: ligacao ? VIBRAR_LIGACAO : VIBRAR_AVISO,
    timestamp: a.quando || Date.now(),
    data: { link: a.link || '/', tipo: a.tipo || '', id: a.id || null },
    actions: ligacao
      ? [
          { action: 'atender', title: 'Atender' },
          { action: 'recusar', title: 'Recusar' },
        ]
      : [],
  };
}

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function tocarLigacao(titulo, opcoes) {
  const fim = Date.now() + TOQUE_DA_LIGACAO_MS;
  while (Date.now() + INTERVALO_DO_TOQUE_MS < fim) {
    await esperar(INTERVALO_DO_TOQUE_MS);
    if (encerradas.has(opcoes.tag)) return;
    const abertas = await self.registration.getNotifications({ tag: opcoes.tag });
    if (!abertas.length || (await appNaFrente())) return;
    await self.registration.showNotification(titulo, { ...opcoes, timestamp: Date.now() });
  }
}

async function mostrarAviso(a) {
  const titulo = a.titulo || 'nexo.social';
  const opcoes = opcoesDoAviso(a);
  if (a.tipo !== 'teste' && (await appJaAvisa(a))) return;
  if (opcoes.tag) encerradas.delete(opcoes.tag);
  await self.registration.showNotification(titulo, opcoes);
  if (a.ligacao && opcoes.tag) await tocarLigacao(titulo, opcoes);
}

self.addEventListener('push', (event) => {
  let aviso = {};
  try {
    aviso = event.data ? event.data.json() : {};
  } catch (e) {
    aviso = { titulo: 'nexo.social', corpo: event.data ? event.data.text() : '' };
  }
  event.waitUntil(mostrarAviso(aviso));
});

async function abrirNaPlataforma(link) {
  const destino = new URL(link || '/', self.location.origin);
  if (destino.origin !== self.location.origin) return;
  const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const janela = janelas.find((c) => new URL(c.url).origin === self.location.origin);
  if (janela) {
    await janela.focus();
    if ('navigate' in janela) {
      try {
        await janela.navigate(destino.href);
        return;
      } catch (e) {
        // janela não controlada por este SW: abre uma nova
      }
    }
  }
  await self.clients.openWindow(destino.href);
}

self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  if (n.tag) encerradas.add(n.tag);
  n.close();
  if (event.action === 'recusar') return;
  event.waitUntil(abrirNaPlataforma((n.data && n.data.link) || '/'));
});

self.addEventListener('notificationclose', (event) => {
  if (event.notification.tag) encerradas.add(event.notification.tag);
});

// O navegador trocou a inscrição sozinho: inscreve de novo e avisa o servidor.
function chaveEmBytes(base64) {
  const b = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = atob(b);
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const r = await fetch('/api/push/chave', { credentials: 'include' }).then((x) => x.json()).catch(() => null);
      if (!r || !r.chave) return;
      const nova = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(r.chave) });
      await fetch('/api/push/inscricao', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscricao: nova.toJSON(), antiga: event.oldSubscription ? event.oldSubscription.endpoint : null }),
      });
    })(),
  );
});
