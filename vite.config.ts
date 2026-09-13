import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mockPlugin from './mock/index.ts'

// https://vite.dev/config/
// 已接入真实后端（ArkEngine 仓库，Flask + SQLite，http://localhost:5000），
// 开发期请求 /api 代理到后端；/api/learn 由内置 Mock 处理。
export default defineConfig({
  plugins: [vue(), mockPlugin()],
  server: {
    proxy: {
      '/api': {
        target: process.env.ARK_API_TARGET || 'http://127.0.0.1:5000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.url?.startsWith('/api/learn')) return req.url // 绕过 proxy，让 mock middleware 处理
        },
      },
    },
  },
})
