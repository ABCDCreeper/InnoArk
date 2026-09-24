import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { loadDB, persist } from './db.ts'
import { dispatch, HttpError } from './handlers.ts'

function readBody(req: IncomingMessage): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1e6) req.destroy()
    })
    req.on('end', () => {
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new HttpError(400, 'VALIDATION_ERROR', '请求体不是合法的 JSON'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (status === 204) {
    res.end()
    return
  }
  res.end(JSON.stringify(body).replace(/</g, '\\u003c'))
}

export default function mockPlugin(): Plugin {
  return {
    name: 'innoark-mock-api',
    configureServer(server) {
      const db = loadDB()
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url || !req.url.startsWith('/api')) return next()
        const url = new URL(req.url, 'http://localhost')
        try {
          const body = await readBody(req)
          const result = dispatch(db, req.method!, url.pathname, url.searchParams, body, req.headers.authorization)
          sendJson(res, result.status, result.body)
          persist(db)
        } catch (err) {
          if (err instanceof HttpError) {
            sendJson(res, err.status, { error: { code: err.code, message: err.message } })
          } else {
            sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: '服务端内部错误' } })
          }
        }
      })
    },
  }
}
