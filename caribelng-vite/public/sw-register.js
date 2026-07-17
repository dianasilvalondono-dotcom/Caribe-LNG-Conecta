// Registro del service worker. Va como archivo (no inline) para permitir una
// Content-Security-Policy con script-src 'self' sin 'unsafe-inline' (SEC-14).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch((err) => console.error('SW registration failed:', err));
  });
}
