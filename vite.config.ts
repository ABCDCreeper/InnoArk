import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mockPlugin from './mock/index.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), mockPlugin()],
})
