const API_BASE = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')

function buildApiUrl(path) {
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath
}

export async function apiFetch(path, options = {}) {
  if (import.meta.env.PROD && !API_BASE) {
    throw new Error('VITE_API_URL is not configured for the production build.')
  }

  const url = buildApiUrl(path)
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    })
    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP ${response.status}: ${text}`)
    }
    return response
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Unable to reach the billing server at ${url || window.location.origin}. Start it with "npm run dev".`, { cause: error })
    }
    throw error
  }
}

export function getLocalStorageReceipts() {
  try {
    const stored = localStorage.getItem('saved_receipts')
    const data = stored ? JSON.parse(stored) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
