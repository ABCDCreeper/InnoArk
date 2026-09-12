/**
 * 时间与头像样式的公共格式化。
 *
 * 这些逻辑原先在多个视图里各写一份（formatTime 有 5 份、头像配色 3 份），
 * 改动时容易漏掉其中一处，因此收敛到一处。
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO 字符串 → 「9月12日 15:30」；withYear 为真时带上年份（档案用） */
export function formatTime(iso: string, withYear = false): string {
  const d = new Date(iso)
  const prefix = withYear ? `${d.getFullYear()}年` : ''
  return `${prefix}${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** ISO 字符串 → 「9月12日」；用于截止日期这类只有日期的场景 */
export function formatDue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const AVATAR_COLORS = ['#18a058', '#2080f0', '#f0a020', '#e88080', '#8a7ff0', '#0f9f9f', '#d03050']

/** 由姓名稳定地取一个头像底色（同名同色，避免每次渲染跳色） */
export function avatarColor(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 997
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

/** 按成员在列表中的位置取色（项目页的成员头像）；与按姓名散列的 avatarColor 用途不同 */
export const MEMBER_AVATAR_COLORS = ['#18a058', '#2080f0', '#d03050', '#f0a020']
