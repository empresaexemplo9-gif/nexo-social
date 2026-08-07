/* Service worker da nexo.social.
 *
 * Objetivo modesto e seguro: deixar o app instalável e não deixar a tela em
 * branco quando a rede cai. NÃO faz cache de resposta de API — placar, ao vivo
 * e agenda precisam ser sempre atuais, e servir dado velho ali seria pior que
 * mostrar erro.
 *
 * Estratégias:
 *   - navegação (HTML): rede primeiro, com a página offline como reserva;
 *   - estáticos do build (/_next/static, ícones): cache primeiro, pois têm
 *     hash no nome e nunca mudam de conteúdo;
 *   - qualquer /api/: passa direto, sem tocar no cache.
 */

const VERSAO = 'nexo-v1';
const SHELL = `${VERSAO}-shell`;
const ESTATICO = `${VERSAO}-estatico`;
const OFFLINE = '/offline';

const PRE_CACHE = [OFFLINE, '/icon-192.png', '/icon-512.png', '/logo.svg'];

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
