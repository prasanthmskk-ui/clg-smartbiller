// Service worker for true offline-first behaviour.
// Strategy:
//  - /tessdata/* (our local language packs) and tesseract core/wasm from CDN:
//    cache-first, so after the very first load they never hit the network.
//  - App shell (html/js/css): network-first with cache fallback, so updates
//    appear but the app still works offline.
//  - Everything else: cache-first.

const CACHE = 'clg-billing-v1'
const TESSDATA_HOSTS = ['cdn.jsdelivr.net', 'unpkg.com', 'github.com']

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

function isTessAsset(url) {
  return (
    url.pathname.includes('/tessdata/') ||
    TESSDATA_HOSTS.some((h) => url.hostname.includes(h)) ||
    url.pathname.includes('tesseract') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.wasm.gz') ||
    url.pathname.endsWith('.traineddata.gz')
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (isTessAsset(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        try {
          const res = await fetch(request)
          if (res && res.ok) cache.put(request, res.clone())
          return res
        } catch (e) {
          return cached || Response.error()
        }
      })
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
    return
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      try {
        const res = await fetch(request)
        if (res && res.ok) cache.put(request, res.clone())
        return res
      } catch (e) {
        return cached || Response.error()
      }
    })
  )
})
