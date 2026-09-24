import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mockPlugin from './mock/index.ts'

// 默认使用内置 Mock（mock/ 目录），无需启动 ArkEngine 后端即可完整演示。
// 如需联调真实后端（ArkEngine，Flask + SQLite，http://localhost:5000），
// 移除 plugins 里的 mockPlugin()，并恢复下方 server.proxy。
export default defineConfig({
  plugins: [vue(), mockPlugin()],
})
