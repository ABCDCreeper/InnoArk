<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NButton, NCard, NGrid, NGridItem, NProgress, NTag, NText,
} from 'naive-ui'
import { BADGES, COURSES, xpForLevel } from '../data/courses'
import { CARD_SETS, cardsOfSet } from '../data/collection'
import { useLearnStore } from '../stores/learn'
import { useAuthStore } from '../stores/auth'
import { useGrowthStore } from '../stores/growth'
import { fetchQuizStats } from '../api/quiz'
import { fetchFocusStats } from '../api/focus'
import { fetchProjects } from '../api/project'
import type { QuizStats, FocusStats } from '../api/types'
import WeeklyBar from '../components/WeeklyBar.vue'

const learn = useLearnStore()
const auth = useAuthStore()
const growth = useGrowthStore()

const quizStats = ref<QuizStats | null>(null)
const focusStats = ref<FocusStats | null>(null)
const projectCount = ref(0)

onMounted(async () => {
  learn.load()
  growth.refreshTasks()
  try {
    const [q, f, p] = await Promise.all([fetchQuizStats(), fetchFocusStats(), fetchProjects()])
    quizStats.value = q
    focusStats.value = f
    projectCount.value = p.items.length
  } catch {
    quizStats.value = null
  }
})

const xpPct = computed(() => {
  const base = xpForLevel(learn.level)
  const next = xpForLevel(learn.level + 1)
  return Math.min(Math.round(((learn.xp - base) / (next - base)) * 100), 100)
})

const totalCards = CARD_SETS.reduce((sum, s) => sum + cardsOfSet(s.id).length, 0)

// —— 本周学习周报：汇总专注 / 闯关 / 签到 ——
const weekReport = computed(() => {
  const weekAgo = Date.now() - 7 * 86400000
  const recentQuiz = (quizStats.value?.recent ?? []).filter((a) => new Date(a.createdAt).getTime() >= weekAgo)
  const quizBest = recentQuiz.reduce((m, a) => Math.max(m, a.score), 0)
  const signDays = growth.monthSigns.filter((d) => new Date(d + 'T12:00:00').getTime() >= weekAgo).length
  const focusMinutes = focusStats.value?.week.reduce((s, d) => s + d.minutes, 0) ?? 0
  const parts: string[] = []
  parts.push(focusMinutes >= 125 ? '专注习惯非常扎实' : focusMinutes >= 50 ? '专注节奏保持得不错' : '本周专注还可以加把劲')
  if (recentQuiz.length > 0) parts.push(`闯关 ${recentQuiz.length} 次、最佳 ${quizBest} 分`)
  if (signDays >= 6) parts.push('签到近乎全勤')
  return { quizCount: recentQuiz.length, quizBest, signDays, focusMinutes, summary: parts.join('，') + '。' }
})

const AVATARS = ['🐣', '🌱', '🧭', '⚡', '🛠️', '🌟', '🏆', '🚀']
const avatar = computed(() => AVATARS[Math.min(learn.level, AVATARS.length) - 1])

function dateKey(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function generateCard() {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 960
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const grad = ctx.createLinearGradient(0, 0, 720, 960)
  grad.addColorStop(0, '#1e293b')
  grad.addColorStop(1, '#4c1d95')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 720, 960)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(24, 24, 672, 912, 24)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillText('智创方舟 InnoArk · 成长卡片', 360, 100)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 44px system-ui, sans-serif'
  ctx.fillText(auth.user?.name ?? '同学', 360, 180)
  ctx.fillStyle = '#ffd268'
  ctx.font = 'bold 58px system-ui, sans-serif'
  ctx.fillText(`Lv.${learn.level} ${learn.title}`, 360, 264)

  const best = quizStats.value?.best
  const rows = [
    `⭐ XP 总量 ${learn.xp} · 总星数 ${COURSES.reduce((s, c) => s + learn.courseStats(c).stars, 0)}`,
    `⚔️ 闯关 ${quizStats.value?.attempts ?? 0} 次 · 最佳 ${best ? `${best.score}/${best.total}` : '—'}`,
    `🍅 今日专注 ${focusStats.value?.today.minutes ?? 0} 分钟`,
    `🃏 图鉴 ${growth.collection.length}/${totalCards} · 🎖️ 徽章 ${learn.badgeIds.length}/${BADGES.length}`,
    `📅 签到 ${growth.signDays} 天 · 🔥 连续学习 ${learn.streak} 天 · 📁 项目 ${projectCount.value} 个`,
  ]
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.font = '500 24px system-ui, sans-serif'
  rows.forEach((row, i) => ctx.fillText(row, 360, 360 + i * 62))

  const badgeEmojis = BADGES.filter((b) => learn.badgeIds.includes(b.id)).map((b) => b.emoji).join(' ')
  ctx.font = '34px system-ui, sans-serif'
  ctx.fillText(badgeEmojis || '继续解锁你的第一枚徽章吧', 360, 720)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.font = '400 20px system-ui, sans-serif'
  ctx.fillText(`${dateKey()} · 学习天地 · 智创方舟 InnoArk`, 360, 880)

  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `growth-card-${dateKey()}.png`
  link.click()
}
</script>

<template>
  <div class="profile-wrap">
    <n-card size="small" class="hero">
      <div class="hero-row">
        <div class="hero-avatar">{{ avatar }}</div>
        <div class="hero-main">
          <div class="hero-name">{{ auth.user?.name ?? '同学' }} 的成长档案</div>
          <div class="hero-meta">
            <n-tag type="primary" size="small" :bordered="false" round>{{ learn.title }}</n-tag>
            <span class="lv">Lv.{{ learn.level }}</span>
            <span class="mini">🔥 连续学习 {{ learn.streak }} 天</span>
            <span class="mini">📅 签到 {{ growth.signDays }} 天</span>
          </div>
          <div class="xp-line">
            <n-progress type="line" :percentage="xpPct" :height="10" :show-indicator="false" />
            <n-text depth="3" style="font-size: 12px; white-space: nowrap;">
              {{ learn.xp }} XP · 距下一级 {{ xpForLevel(learn.level + 1) - learn.xp }}
            </n-text>
          </div>
        </div>
      </div>
    </n-card>

    <n-grid :cols="4" :x-gap="14" :y-gap="14" responsive="screen" item-responsive>
      <n-grid-item span="2 m:1">
        <n-card size="small" class="stat-card">
          <div class="stat-emoji">⚔️</div>
          <div class="stat-num">{{ quizStats?.attempts ?? 0 }}</div>
          <n-text depth="3" style="font-size: 12px;">闯关次数</n-text>
          <n-text depth="3" style="font-size: 12px;">最佳 {{ quizStats?.best ? `${quizStats.best.score}/${quizStats.best.total}` : '—' }}</n-text>
          <n-text depth="3" style="font-size: 12px;">⚔️ 对战 {{ growth.battleWins }} 胜 / {{ growth.battleTotal }} 场</n-text>
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small" class="stat-card">
          <div class="stat-emoji">🍅</div>
          <div class="stat-num">{{ focusStats?.today.minutes ?? 0 }}</div>
          <n-text depth="3" style="font-size: 12px;">今日专注（分钟）</n-text>
          <n-text depth="3" style="font-size: 12px;">本周 {{ focusStats?.week.reduce((s, d) => s + d.minutes, 0) ?? 0 }} 分钟</n-text>
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small" class="stat-card">
          <div class="stat-emoji">🃏</div>
          <div class="stat-num">{{ growth.collection.length }}<span class="stat-sub"> / {{ totalCards }}</span></div>
          <n-text depth="3" style="font-size: 12px;">图鉴收集</n-text>
          <n-text depth="3" style="font-size: 12px;">📝 错题 {{ growth.wrongBook.length }} 道待消灭</n-text>
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 m:1">
        <n-card size="small" class="stat-card">
          <div class="stat-emoji">🎖️</div>
          <div class="stat-num">{{ learn.badgeIds.length }}<span class="stat-sub"> / {{ BADGES.length }}</span></div>
          <n-text depth="3" style="font-size: 12px;">徽章收集</n-text>
          <n-text depth="3" style="font-size: 12px;">📁 参与 {{ projectCount }} 个项目</n-text>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-card size="small" title="📈 本周专注趋势">
      <WeeklyBar v-if="focusStats" :data="focusStats.week" />
      <n-text v-else depth="3" style="font-size: 13px;">加载中…</n-text>
    </n-card>

    <n-card size="small" title="🗓️ 本周学习周报">
      <template #header-extra>
        <n-text depth="3" style="font-size: 12px;">近 7 天汇总</n-text>
      </template>
      <n-grid :cols="3" :x-gap="12" responsive="screen" item-responsive>
        <n-grid-item span="3 m:1">
          <div class="report-item"><span class="report-num">🍅 {{ weekReport.focusMinutes }}</span><n-text depth="3" style="font-size: 12px;">专注分钟</n-text></div>
        </n-grid-item>
        <n-grid-item span="3 m:1">
          <div class="report-item"><span class="report-num">⚔️ {{ weekReport.quizCount }}</span><n-text depth="3" style="font-size: 12px;">闯关次数{{ weekReport.quizCount > 0 ? ` · 最佳 ${weekReport.quizBest} 分` : '' }}</n-text></div>
        </n-grid-item>
        <n-grid-item span="3 m:1">
          <div class="report-item"><span class="report-num">📅 {{ weekReport.signDays }}/7</span><n-text depth="3" style="font-size: 12px;">签到天数</n-text></div>
        </n-grid-item>
      </n-grid>
      <n-text style="font-size: 13px; display: block; margin-top: 10px;">🤖 小智点评：{{ weekReport.summary }}</n-text>
    </n-card>

    <n-card size="small" title="🃏 图鉴收集进度">
      <div class="set-rows">
        <div v-for="set in CARD_SETS" :key="set.id" class="set-row">
          <span class="set-label">{{ set.emoji }} {{ set.name }}</span>
          <n-progress
            type="line"
            :percentage="Math.round((growth.setOwnedCount(set.id) / cardsOfSet(set.id).length) * 100)"
            :height="8"
            :color="set.color"
            :rail-color="`${set.color}22`"
            :show-indicator="false"
            style="flex: 1;"
          />
          <span class="set-num">{{ growth.setOwnedCount(set.id) }}/{{ cardsOfSet(set.id).length }}</span>
          <span v-if="growth.setComplete(set.id)">👑</span>
        </div>
      </div>
    </n-card>

    <n-card size="small" title="🎖️ 我的徽章">
      <div class="badge-strip">
        <span
          v-for="badge in BADGES"
          :key="badge.id"
          class="badge-chip"
          :class="{ locked: !learn.badgeIds.includes(badge.id) }"
          :title="badge.desc"
        >{{ badge.emoji }} {{ badge.name }}</span>
      </div>
    </n-card>

    <n-card size="small">
      <div class="share-row">
        <div>
          <div class="share-title">🎁 生成我的成长卡片</div>
          <n-text depth="3" style="font-size: 12px;">生成一张专属卡片，保存后发给同学或放进汇报里。</n-text>
        </div>
        <n-button type="primary" @click="generateCard">生成并下载 PNG</n-button>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.profile-wrap {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-avatar {
  font-size: 46px;
}

.hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hero-name {
  font-size: 18px;
  font-weight: 800;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.lv {
  font-weight: 800;
  color: #f0a020;
}

.mini {
  font-size: 13px;
  opacity: 0.75;
}

.xp-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.xp-line > :first-child {
  flex: 1;
}

.stat-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.stat-emoji {
  font-size: 26px;
}

.stat-num {
  font-size: 30px;
  font-weight: 800;
}

.stat-sub {
  font-size: 15px;
  opacity: 0.5;
  font-weight: 600;
}

.set-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.set-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.set-label {
  width: 130px;
  font-size: 13px;
  font-weight: 600;
}

.set-num {
  font-size: 12px;
  opacity: 0.7;
  white-space: nowrap;
}

.badge-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(240, 160, 32, 0.4);
  background: rgba(240, 160, 32, 0.1);
  font-size: 13px;
  font-weight: 600;
}

.badge-chip.locked {
  filter: grayscale(1);
  opacity: 0.35;
  border-style: dashed;
}

.share-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.report-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
  padding: 6px 0;
}

.report-num {
  font-size: 24px;
  font-weight: 800;
}

.share-title {
  font-weight: 800;
  font-size: 15px;
  margin-bottom: 2px;
}

@media (max-width: 800px) {
  .share-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
