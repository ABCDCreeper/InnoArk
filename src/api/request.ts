const BASE_URL = '/api'
const TOKEN_KEY = 'innoark_token'

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function handleError(res: Response, body: any, path: string): never {
  const err = body?.error ?? { code: 'HTTP_ERROR', message: `请求失败 (${res.status})` }
  if (res.status === 401 && !path.startsWith('/sessions')) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('innoark_user')
    if (!location.pathname.startsWith('/login')) location.href = '/login'
  }
  throw new ApiError(res.status, err.code, err.message)
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) handleError(res, body, path)
  return body as T
}

export const get = <T>(path: string) => request<T>(path)
export const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
export const patch = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) })
export const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })
