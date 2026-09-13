const BASE_URL = '/api'

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`)
  }
  return res.json()
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
