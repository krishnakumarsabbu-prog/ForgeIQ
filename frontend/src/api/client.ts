const BASE_URL = '/api'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    let message: string
    try {
      const body = await res.text()
      try {
        const parsed = JSON.parse(body)
      message = parsed.detail || parsed.message || body || `API ${res.status}`
      } catch {
        message = body || `API ${res.status}`
      }
    } catch {
      message = `API ${res.status}`
    }
    throw new Error(message)
  }
  const text = await res.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

export const api = {
  get: <T>(path: string) => fetchJson<T>(path),
  post: <T>(path: string, body?: unknown) =>
    fetchJson<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    fetchJson<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => fetchJson<T>(path, { method: 'DELETE' }),
}

export function sseStream(path: string, onEvent: (data: unknown) => void, onClose?: () => void): EventSource {
  const source = new EventSource(`${BASE_URL}${path}`)
  source.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data))
    } catch {
      // ignore parse errors
    }
  }
  source.onerror = () => {
    source.close()
    onClose?.()
  }
  return source
}
