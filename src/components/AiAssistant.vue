<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { NButton, NInput, NText } from 'naive-ui'
import { SendOutline } from '@vicons/ionicons5'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { fetchProjects } from '../api/project'
import { fetchFocusStats } from '../api/focus'
import { fetchQuizStats } from '../api/quiz'
import { fetchLeaderboard } from '../api/leaderboard'
import { useGrowthStore } from '../stores/growth'
import { useLearnStore } from '../stores/learn'
import { useAuthStore } from '../stores/auth'

interface Msg { role: 'ai' | 'user'; text: string }

const growth = useGrowthStore()
const learn = useLearnStore()
const auth = useAuthStore()

const open = ref(false)
const draft = ref('')
const busy = ref(false)
const typing = ref(false)
const listRef = ref<HTMLDivElement | null>(null)
const messages = ref<Msg[]>([
  { role: 'ai', text: '你好，我是 AI 助教小智 🤖 我能看到你的项目进度、错题本、专注记录和排行榜名次，尽管问我！' },
])

const QUICK_QUESTIONS = [
  '看看我的项目进度',
  '分析一下我的错题',
  '我的专注报告',
  '我现在排第几名',
  '给我一些学习建议',
  '鼓励鼓励我',
]

let typeTimer: number | null = null

function stopTyping() {
  if (typeTimer !== null) {
    clearInterval(typeTimer)
    typeTimer = null
  }
  typing.value = false
}

onBeforeUnmount(stopTyping)

async function scrollBottom() {
  await nextTick()
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}

const ENCOURAGEMENTS = [
  '每一步都算数！你今天学的东西，正在悄悄变成未来的底气 💪',
  '研究火星的科学家也是从一个番茄钟开始的，加油！🚀',
  '感觉累就对了，说明你正在走出舒适区，这正是成长发生的地方 🌱',
  '别急，慢一点也没关系，坚持来过的人才能看到山顶的风景 ⛰️',
]

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pct(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

// —— 各意图的回答生成（数据来自 mock 接口与本地 store） ——

async function answerProgress(): Promise<string> {
  const res = await fetchProjects()
  const items = res.items
  if (items.length === 0) return '你还没有参与任何项目哦。去「课题与项目」页挑一个感兴趣的课题发起项目，或用邀请码加入同学的小队吧 🚀'
  const lines = items.map((p) => {
    const percent = pct(p.progress.done, p.progress.total)
    const status = p.status === 'finished' ? '已结题 ✅' : percent >= 50 ? '进展顺利 🔥' : '正在推进 💪'
    return `- 《${p.name}》任务进度 ${p.progress.done}/${p.progress.total}（${percent}%），${status}`
  })
  return `你现在共参与 ${items.length} 个项目：\n\n${lines.join('\n')}\n\n建议打开项目详情的任务看板，认领一个「待认领」任务继续推进。`
}

function answerWrong(): string {
  const book = growth.wrongBook
  if (book.length === 0) return '你的错题本是空的，太棒了！保持现在的节奏，去闯关拿更高分吧 🏆'
  const recent = book.slice(0, 2).map((w) => `- 「${w.question.slice(0, 26)}${w.question.length > 26 ? '…' : ''}」`).join('\n')
  return `错题本里目前有 ${book.length} 道题待消灭。最近记下的：\n${recent}\n建议先读一遍解析再回闯关页重做，把同类题一次吃透 📝`
}

async function answerFocus(): Promise<string> {
  const stats = await fetchFocusStats()
  const weekMinutes = stats.week.reduce((s, d) => s + d.minutes, 0)
  const gap = Math.max(25 - stats.today.minutes, 0)
  const head = `今日专注 ${stats.today.count} 次 / ${stats.today.minutes} 分钟，本周累计 ${weekMinutes} 分钟 🍅`
  const tail = stats.today.minutes >= 25
    ? '今天的目标已经达成，记得劳逸结合！'
    : gap > 0
      ? `距离今日 25 分钟小目标还差 ${gap} 分钟，去专注页来一个番茄钟吧！`
      : ''
  return `${head}\n${tail}`
}

async function answerRank(): Promise<string> {
  const res = await fetchLeaderboard('total')
  const myId = auth.user?.id
  const rank = res.items.findIndex((it) => it.userId === myId)
  if (rank === -1) return `排行榜上暂时还没有你，去闯关或专注攒积分，马上就能上榜！当前榜首是「${res.items[0]?.name ?? '—'}」🏆`
  const me = res.items[rank]
  const ahead = rank > 0 ? res.items[rank - 1] : null
  return `你在总榜排第 ${rank + 1} / ${res.items.length} 名，综合积分 ${me.score} 分 🏅${ahead ? `距离上一名「${ahead.name}」只差 ${ahead.score - me.score} 分，冲一波就超越了！` : '你就是当前榜首，稳住！'}`
}

async function answerAdvice(): Promise<string> {
  const [quiz, focus] = await Promise.all([fetchQuizStats(), fetchFocusStats()])
  const tips: string[] = []
  const best = quiz.best?.score ?? 0
  if (growth.wrongBook.length >= 5) tips.push(`错题本已经积累了 ${growth.wrongBook.length} 道题，优先把错题吃透，性价比最高`)
  if (best > 0 && best < 60) tips.push('闯关最佳得分还不到 60，建议先回学习天地把薄弱课时再看一遍')
  if (focus.today.minutes < 25) tips.push('今天还没完成一个完整番茄钟，先专注 25 分钟找找状态')
  if (learn.streak >= 3) tips.push(`你已经连续学习 ${learn.streak} 天了，保持这个节奏非常关键`)
  if (tips.length === 0) tips.push('各科状态都不错！建议挑战一次 10 题满分闯关，或者认领项目里的高难度任务')
  return `根据你的数据，我的建议是：\n${tips.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
}

function answerSign(): string {
  const head = growth.signedToday ? '今天已经打过卡啦，棒！✅' : '今天还没签到，点首页的签到卡片领取今日 XP 📅'
  return `${head}\n你累计签到 ${growth.signDays} 天，本月已签 ${growth.monthSigns.length} 天。`
}

const INTRO = '我是智创方舟的 AI 助教小智 🤖 我接入了平台的学习数据，可以帮你：\n- 查项目进度与任务建议\n- 分析错题本\n- 汇总专注报告\n- 查询排行榜名次\n- 制定学习建议\n\n直接点下方的快捷问题，或随便问我！'

function encourage(): string {
  return pickOne(ENCOURAGEMENTS)
}
function renderMd(text: string): string {
  return DOMPurify.sanitize(marked.parse(text, { async: false }) as string)
}
async function composeAnswer(q: string): Promise<string> {
  if (/(进度|项目)/.test(q)) return answerProgress()
  if (/(错题)/.test(q)) return answerWrong()
  if (/(专注|番茄)/.test(q)) return answerFocus()
  if (/(排名|排行|第几)/.test(q)) return answerRank()
  if (/(签到|打卡)/.test(q)) return answerSign()
  if (/(你是谁|介绍|你好|嗨|hi|hello)/i.test(q)) return INTRO
  if (/(加油|鼓励|累|烦|焦虑|压力)/.test(q)) return encourage()
  if (/(建议|怎么学|复习|提高|提升)/.test(q)) return answerAdvice()
  return `这个问题有点超出我的数据范围啦 😅 我最擅长的是：项目进度、错题分析、专注报告、排行榜和学习建议，试试这些话题？`
}

async function ask(text: string) {
  const q = text.trim()
  if (!q || busy.value) return
  stopTyping()
  messages.value.push({ role: 'user', text: q })
  draft.value = ''
  busy.value = true
  scrollBottom()
  let reply: string
  try {
    reply = await composeAnswer(q)
  } catch {
    reply = '呜，我这边数据同步出了点问题，稍后再问我一次吧 🙏'
  }
  busy.value = false
  const msg: Msg = { role: 'ai', text: '' }
  messages.value.push(msg)
  let i = 0
  typing.value = true
  typeTimer = window.setInterval(() => {
    i += 2
    msg.text = reply.slice(0, i)
    if (i >= reply.length) stopTyping()
    scrollBottom()
  }, 16)
}
</script>

<template>
  <!-- 悬浮球 -->
  <button v-if="!open" class="ai-fab" title="AI 助教小智" @click="open = true">🤖</button>

  <!-- 对话面板 -->
  <transition name="ai-pop">
    <div v-if="open" class="ai-panel">
      <div class="ai-head">
        <span class="ai-avatar">🤖</span>
        <div class="ai-head-text">
          <div class="ai-name">AI 助教 · 小智</div>
          <n-text depth="3" style="font-size: 11px;">数据感知中 · {{ typing ? '正在输入…' : busy ? '思考中…' : '在线' }}</n-text>
        </div>
        <button class="ai-close" @click="open = false">✕</button>
      </div>

      <div ref="listRef" class="ai-list">
        <div v-for="(m, i) in messages" :key="i" class="ai-msg" :class="m.role">
          <div class="ai-bubble" v-html="m.role === 'ai' ? renderMd(m.text) : m.text"></div>
      </div>
        <div v-if="busy" class="ai-msg ai"><div class="ai-bubble typing">…</div></div>
      </div>

      <div class="ai-chips">
        <button v-for="q in QUICK_QUESTIONS" :key="q" class="ai-chip" :disabled="typing" @click="ask(q)">{{ q }}</button>
      </div>

      <div class="ai-input-row">
        <n-input
          v-model:value="draft"
          size="small"
          placeholder="问小智点什么…"
          :disabled="typing || busy"
          @keydown.enter="ask(draft)"
        />
        <n-button size="small" type="primary" :loading="busy" @click="ask(draft)">
          <template #icon><n-icon><send-outline /></n-icon></template>
        </n-button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.ai-fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9998;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid rgba(128, 128, 128, 0.3);
  background: linear-gradient(135deg, #2080f0, #18a058);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(32, 128, 240, 0.35);
  transition: transform 0.15s ease;
}

.ai-fab:hover {
  transform: scale(1.08);
}

.ai-panel {
  position: fixed;
  bottom: 76px;
  right: 20px;
  z-index: 9998;
  width: 380px;
  max-width: calc(100vw - 32px);
  height: 540px;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid rgba(128, 128, 128, 0.3);
  background: var(--n-color, #fff);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  color: var(--n-text-color, #333);
  color: var(--n-text-color, #333);
  --n-text-color: #333;
  --n-placeholder-color: #999;
}

.ai-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.2);
}

.ai-avatar {
  font-size: 24px;
}

.ai-head-text {
  flex: 1;
}

.ai-name {
  font-weight: 800;
  font-size: 14px;
}

.ai-close {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.6;
  padding: 4px 6px;
}

.ai-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-msg {
  display: flex;
}

.ai-msg.user {
  justify-content: flex-end;
}

.ai-bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.65;
  word-break: break-word;
}

/* 用户气泡保持换行 */
.ai-msg.user .ai-bubble {
  white-space: pre-wrap;
}

/* AI 气泡：渲染 Markdown 后去掉多余间距 */
.ai-msg.ai .ai-bubble p {
  margin: 0 0 6px;
}

.ai-msg.ai .ai-bubble p:last-child {
  margin-bottom: 0;
}

.ai-msg.ai .ai-bubble ul,
.ai-msg.ai .ai-bubble ol {
  margin: 4px 0;
  padding-left: 20px;
}

.ai-msg.ai .ai-bubble li {
  margin: 2px 0;
}

.ai-msg.ai .ai-bubble code {
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 12px;
}

.ai-msg.ai .ai-bubble {
  background: rgba(32, 128, 240, 0.1);
  border: 1px solid rgba(32, 128, 240, 0.18);
}

.ai-msg.user .ai-bubble {
  background: rgba(24, 160, 88, 0.14);
  border: 1px solid rgba(24, 160, 88, 0.25);
}

.ai-bubble.typing {
  letter-spacing: 4px;
  animation: blink 1s ease infinite;
}

@keyframes blink {
  50% { opacity: 0.4; }
}

.ai-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid rgba(128, 128, 128, 0.15);
}

.ai-chip {
  border: 1px solid rgba(128, 128, 128, 0.3);
  background: none;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  color: inherit;
}

.ai-chip:hover {
  border-color: #2080f0;
  color: #2080f0;
}
.ai-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ai-input-row {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
}

/* 输入框文字和 placeholder 强制改色 */
.ai-input-row :deep(.n-input__input-el),
.ai-input-row :deep(.n-input__placeholder),
.ai-input-row :deep(.n-input__mirror),
.ai-input-row :deep(input) {
  color: #333 !important;
}

.ai-input-row :deep(.n-input__placeholder) {
  color: #999 !important;
}


.ai-pop-enter-active,
.ai-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.ai-pop-enter-from,
.ai-pop-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
