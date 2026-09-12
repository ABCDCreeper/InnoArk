/**
 * 检查 .vue 里用到的 naive-ui 组件是否都已导入。
 *
 * 生产构建下未导入的组件会被当成未知 HTML 元素渲染：不报错、没有样式、也没有提示，
 * 很容易在浏览器里才发现（本轮就漏过一次 n-tabs）。用法：node scripts/check-naive-imports.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const srcDir = join(root, 'src')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.vue') ? [full] : []
  })
}

const kebab = (name) => name.replace(/(?<!^)(?=[A-Z])/g, '-').toLowerCase()

let failed = 0
for (const file of walk(srcDir)) {
  const source = readFileSync(file, 'utf8')
  if (!source.includes('naive-ui')) continue

  const used = new Set(
    [...source.matchAll(/<(n-[a-z0-9-]+)[\s/>]/g)].map((m) => m[1].toLowerCase()),
  )
  const imported = new Set()
  for (const block of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]naive-ui['"]/gs)) {
    for (const part of block[1].split(',')) {
      const name = part.trim()
      if (/^N[A-Z]/.test(name)) imported.add(kebab(name))
    }
  }
  const missing = [...used].filter((tag) => !imported.has(tag)).sort()
  if (missing.length) {
    failed += 1
    console.error(`${relative(root, file).replace(/\\/g, '/')}: 未导入 ${missing.join(', ')}`)
  }
}

if (failed) {
  console.error(`\n${failed} 个文件使用了未导入的 naive-ui 组件。`)
  process.exit(1)
}
console.log('所有 .vue 使用的 naive-ui 组件都已导入。')
