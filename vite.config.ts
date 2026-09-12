import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
// 已接入真实后端（ArkEngine 仓库，Flask + SQLite，http://localhost:5000），
// 开发期请求 /api 代理到后端；如需回到内置 Mock，恢复 mockPlugin()。
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': { target: process.env.ARK_API_TARGET || 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
})
