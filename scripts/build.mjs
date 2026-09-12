import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
for (const args of [
  // 未导入的 naive-ui 组件在生产构建里会静默渲染成未知元素，先拦一道
  ['scripts/check-naive-imports.mjs'],
  ['node_modules/vue-tsc/bin/vue-tsc.js', '-b'],
  ['node_modules/vite/bin/vite.js', 'build'],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
