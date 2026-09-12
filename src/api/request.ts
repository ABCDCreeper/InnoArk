const BASE_URL = '/api'
const TOKEN_KEY = 'innoark_token'

interface ErrorBody {
  error?: { code?: string; message?: string }
}

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

let onUnauthorized: (() => void) | null = null

/**
 * 登录态失效时的回调，由 auth store 注册。
 * 请求层只清 localStorage；内存里的登录态必须由 store 一起清掉，
 * 否则会出现「本地已登出、应用仍认为已登录，后续请求全部 401」的状态。
 */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

function handleError(res: Response, body: ErrorBody | null, path: string): never {
  const code = body?.error?.code ?? 'HTTP_ERROR'
  const message = body?.error?.message ?? `请求失败 (${res.status})`
  if (res.status === 401 && !path.startsWith('/sessions')) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('innoark_user')
    onUnauthorized?.()
    if (!location.pathname.startsWith('/login')) location.href = '/login'
  }
  throw new ApiError(res.status, code, message)
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, 15000)
  const abort = () => controller.abort()
  if (options.signal?.aborted) abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal })
    if (res.status === 204) return undefined as T
    const body = await res.json().catch(() => null)
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
    if (!res.ok) handleError(res, body, path)
    if (body === null) throw new ApiError(res.status, 'INVALID_RESPONSE', '服务器响应格式异常，请稍后重试')
    return body as T
  } catch (err) {
    if (timedOut) throw new ApiError(0, 'REQUEST_TIMEOUT', '请求超时；如已提交修改，请刷新确认结果')
    if (controller.signal.aborted || err instanceof ApiError) throw err
    throw new ApiError(0, 'NETWORK_ERROR', '网络连接失败，请检查服务是否运行')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', abort)
  }
}

export const get = <T>(path: string) => request<T>(path)
export const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
export const patch = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) })
export const put = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) })
export const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })
