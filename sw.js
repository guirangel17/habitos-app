// Service worker — cache-first do app shell, com versionamento para updates.
const VERSAO = 'rotina-v7.19';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './data.js', './derive.js',
  './store.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './icons/badge-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // data/*.json muda a cada análise do pipeline — rede primeiro, cache só como fallback offline
  if (url.pathname.includes('/data/')) {
    e.respondWith(
      fetch(e.request).then((resp) => {
        const copia = resp.clone();
        caches.open(VERSAO).then((c) => c.put(e.request, copia));
        return resp;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit
      || fetch(e.request).then((resp) => {
        const copia = resp.clone();
        caches.open(VERSAO).then((c) => c.put(e.request, copia));
        return resp;
      }))
  );
});

// push do pipeline (GitHub Actions → Web Push) — atividade identificada com o app fechado.
// Best-effort/opt-in (Ajustes → Lembretes): nunca é dependência, o card de confirmação em Hoje
// funciona igual sem isso na próxima vez que o app abrir.
self.addEventListener('push', (e) => {
  let dados = { titulo: 'Rotina', corpo: 'Toque para abrir.' };
  try { if (e.data) dados = { ...dados, ...e.data.json() }; } catch { /* payload não-JSON, usa default */ }
  e.waitUntil(self.registration.showNotification(dados.titulo, {
    body: dados.corpo, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { aba: 'hoje' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const aba = e.notification.data?.aba || 'hoje';
  e.waitUntil((async () => {
    const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientes) {
      if (new URL(c.url).pathname === new URL('./', self.registration.scope).pathname) return c.focus();
    }
    return self.clients.openWindow(`./?aba=${aba}`);
  })());
});
