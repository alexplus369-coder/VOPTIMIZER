/* coi-serviceworker v0.1.7 — Guido Zuidhof — MIT License
 * DEBE estar en el mismo dominio que el HTML (no puede cargarse desde CDN).
 * Agrega COOP/COEP headers para habilitar SharedArrayBuffer (requerido por FFmpeg WASM).
 */
if (typeof window === 'undefined') {
  // ── Corriendo como Service Worker ──
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

  self.addEventListener('message', (ev) => {
    if (ev.data && ev.data.type === 'deregister') {
      self.registration.unregister().then(() => {
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      });
    }
  });

  self.addEventListener('fetch', (event) => {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;

    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.status === 0) return response;

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }).catch((e) => console.error('[coi-sw] fetch error:', e))
    );
  });

} else {
  // ── Corriendo en el contexto del navegador (registro) ──
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem('coiReloadedBySelf');
    window.sessionStorage.removeItem('coiReloadedBySelf');

    if (window.crossOriginIsolated !== false) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(window.document.currentScript.src).then(
        (reg) => {
          console.log('[coi-sw] Registrado OK, scope:', reg.scope);
          reg.addEventListener('updatefound', () => {
            if (reloadedBySelf) return;
            window.sessionStorage.setItem('coiReloadedBySelf', 'true');
            window.location.reload();
          });
        },
        (err) => console.error('[coi-sw] Error al registrar:', err)
      );
    }
  })();
}
