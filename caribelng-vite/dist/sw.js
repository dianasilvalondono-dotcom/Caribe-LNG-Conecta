// ── No-op service worker ────────────────────────────────────────────────────
// SW mínimo que existe pero NO cachea ni recarga.
// Reemplaza al kill-switch anterior que estaba creando un loop de recarga.
// ────────────────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Borrar cualquier caché viejo
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {}
    // Tomar control sin recargar
    try { await self.clients.claim() } catch {}
  })())
})

// Fetch passthrough — sin cache, sin intercepción, sin loop
self.addEventListener('fetch', () => {})
