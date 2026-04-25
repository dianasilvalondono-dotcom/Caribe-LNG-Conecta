// ── KILL SWITCH SW ──────────────────────────────────────────────────────────
// Este service worker se auto-elimina en la próxima visita y limpia todos los
// caches. Se instaló para recuperar usuarios con SW viejo cacheado después de
// cambios de env vars y bundle. Una vez todos los usuarios pasen por acá, se
// reintroduce un SW normal en el próximo deploy.
// ────────────────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Borrar TODOS los caches
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {}

    // 2. Tomar control de pestañas abiertas
    try { await self.clients.claim() } catch {}

    // 3. Desregistrarse a sí mismo
    try { await self.registration.unregister() } catch {}

    // 4. Recargar todas las pestañas abiertas para que carguen sin SW
    try {
      const tabs = await self.clients.matchAll({ type: 'window' })
      tabs.forEach((t) => {
        try { t.navigate(t.url) } catch {}
      })
    } catch {}
  })())
})

// Fetch handler vacío — dejamos pasar todo al navegador sin cachear
self.addEventListener('fetch', () => {})
