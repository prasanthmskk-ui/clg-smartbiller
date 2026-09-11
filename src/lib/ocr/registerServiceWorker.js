// Register the offline service worker (production builds only).
export function registerServiceWorker() {
  if (import.meta.env.DEV) return
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err)
    })
  })
}
