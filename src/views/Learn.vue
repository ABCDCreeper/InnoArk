<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NButton, NCard, NGrid, NGridItem, NPopconfirm, NProgress, NTag, NText, useMessage,
} from 'naive-ui'
import { COURSES, LEADERBOARD_BOTS, BADGES, xpForLevel } from '../data/courses'
import type { LearnCourse } from '../data/courses'
import { CARD_SETS, cardsOfSet } from '../data/collection'
import { useLearnStore } from '../stores/learn'
import { useAuthStore } from '../stores/auth'
import { useGrowthStore } from '../stores/growth'
import CourseMap from './learn/CourseMap.vue'
import LessonPlayer from './learn/LessonPlayer.vue'

const learn = useLearnStore()
const auth = useAuthStore()
const growth = useGrowthStore()
const message = useMessage()

type Phase = 'hub' | 'map' | 'player' | 'collection'
const phase = ref<Phase>('hub')
const activeCourse = ref<LearnCourse>(COURSES[0])
const activeLessonIndex = ref(0)
const flippedCards = ref<Set<string>>(new Set())

onMounted(async () => {
  learn.load()
  const gained = await growth.refreshTasks()
  if (gained > 0) message.success(`每日任务完成，+${gained} XP`)
})

async function onSignIn() {
  const res = growth.signIn()
  if (!res) return
  if (res.leveledUp) message.success(`升级啦！现在 Lv.${learn.level} ${learn.title}`)
  else message.success(`签到成功，+${res.xpGained} XP`)
}

const calendarDays = computed(() => {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const signed = new Set(growth.monthSigns.map((d) => Number(d.slice(8))))
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    signed: signed.has(i + 1),
    isToday: i + 1 === now.getDate(),
  }))
})

const xpPct = computed(() => {
  const base = xpForLevel(learn.level)
  const next = xpForLevel(learn.level + 1)
  return Math.min(Math.round(((learn.xp - base) / (next - base)) * 100), 100)
})

const totalStars = computed(() =>
  COURSES.reduce((sum, c) => sum + learn.courseStats(c).stars, 0),
)
const maxStars = computed(() =>
  COURSES.reduce((sum, c) => sum + learn.courseStats(c).maxStars, 0),
)

const totalCards = CARD_SETS.reduce((sum, s) => sum + cardsOfSet(s.id).length, 0)

function toggleFlip(id: string) {
  const next = new Set(flippedCards.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  flippedCards.value = next
}

const board = computed(() => {
  const rows = [
    ...LEADERBOARD_BOTS,
    { name: `${auth.user?.name ?? '我'}（我）`, emoji: '🙋', xp: learn.xp, me: true },
  ]
  return rows.sort((a, b) => b.xp - a.xp)
})
const MEDALS = ['🥇', '🥈', '🥉']

function openCourse(course: LearnCourse) {
  activeCourse.value = course
  phase.value = 'map'
}

function startLesson(index: number) {
  activeLessonIndex.value = index
  phase.value = 'player'
}

function onReset() {
  learn.resetSave()
}
</script>

<template>
  <div class="learn-wrap">
    <template v-if="phase === 'hub'">
      <n-card size="small" class="hero">
        <div class="hero-row">
          <div class="hero-avatar">🎓</div>
          <div class="hero-main">
            <div class="hello">{{ auth.user?.name ?? '同学' }}，欢迎来到学习天地！</div>
            <div class="hero-meta">
              <n-tag type="primary" size="small" :bordered="false" round>{{ learn.title }}</n-tag>
              <span class="lv">Lv.{{ learn.level }}</span>
              <span class="streak" :class="{ cold: learn.streak === 0 }">🔥 x{{ learn.streak }}</span>
              <span class="stars">⭐ {{ totalStars }} / {{ maxStars }}</span>
            </div>
            <div class="xp-line">
              <n-progress type="line" :percentage="xpPct" :height="10" :show-indicator="false" />
              <n-text depth="3" style="font-size: 12px; white-space: nowrap;">
                {{ learn.xp }} XP · 距下一级还差 {{ xpForLevel(learn.level + 1) - learn.xp }}
              </n-text>
            </div>
          </div>
          <n-popconfirm @positive-click="onReset">
            <template #trigger>
              <n-button quaternary size="tiny" type="error">重置存档</n-button>
            </template>
            确定清空学习进度吗？此操作不可恢复。
          </n-popconfirm>
        </div>
      </n-card>

      <div class="growth-row">
        <n-card size="small" title="📅 每日签到">
          <div class="sign-row">
            <div>
              <div class="sign-streak">🔥 连续 {{ growth.signStreak }} 天</div>
              <n-text depth="3" style="font-size: 12px;">累计 {{ growth.signDays }} 天 · 连签最高 +20 XP</n-text>
            </div>
            <n-button type="primary" :disabled="growth.signedToday" @click="onSignIn">
              {{ growth.signedToday ? '今日已签到' : '立即签到' }}
            </n-button>
          </div>
          <div class="calendar">
            <span
              v-for="d in calendarDays"
              :key="d.day"
              class="cal-cell"
              :class="{ signed: d.signed, today: d.isToday }"
            >{{ d.day }}</span>
          </div>
        </n-card>

        <n-card size="small" title="🎯 今日任务">
          <div class="task-list">
            <div v-for="t in growth.tasks" :key="t.id" class="task-row" :class="{ done: t.done }">
              <span class="task-label">{{ t.emoji }} {{ t.label }}</span>
              <span class="task-state">{{ t.done ? '✅ +10 XP' : '⏳ 进行中' }}</span>
            </div>
          </div>
          <n-text depth="3" style="font-size: 12px;">全部完成额外 +5 XP，每天 0 点刷新</n-text>
        </n-card>
      </div>

      <n-card size="small" class="collection-entry" @click="phase = 'collection'">
        <div class="collection-entry-row">
          <span class="entry-title">🃏 知识图鉴</span>
          <n-text depth="3" style="font-size: 13px;">
            已收集 {{ growth.collection.length }} / {{ totalCards }} 张 · 集齐一套 +30 XP
          </n-text>
          <n-button size="tiny" tertiary>去翻卡 →</n-button>
        </div>
      </n-card>

      <div class="section-title">📚 选择一门课程开始冒险</div>
      <n-grid :cols="3" :x-gap="14" :y-gap="14" responsive="screen" item-responsive>
        <n-grid-item v-for="course in COURSES" :key="course.id" span="3 m:1">
          <n-card size="small" hoverable class="course-card" @click="openCourse(course)">
            <div class="course-top">
              <span class="course-emoji" :style="{ background: `${course.color}1c` }">{{ course.emoji }}</span>
              <span v-if="learn.courseStats(course).crowned" class="course-crown">👑</span>
            </div>
            <div class="course-name">{{ course.title }}</div>
            <n-text depth="3" style="font-size: 12px; line-height: 1.6;">{{ course.desc }}</n-text>
            <div class="course-progress">
              <n-progress
                type="line"
                :percentage="Math.round((learn.courseStats(course).done / learn.courseStats(course).total) * 100)"
                :height="8"
                :color="course.color"
                :rail-color="`${course.color}22`"
                :show-indicator="false"
              />
              <n-text depth="3" style="font-size: 12px;">
                ⭐ {{ learn.courseStats(course).stars }} / {{ learn.courseStats(course).maxStars }} ·
                {{ learn.courseStats(course).done }}/{{ learn.courseStats(course).total }} 课时
              </n-text>
            </div>
            <n-button size="tiny" :color="course.color" style="align-self: flex-start;">
              {{ learn.courseStats(course).done > 0 ? '继续冒险' : '开始冒险' }}
            </n-button>
          </n-card>
        </n-grid-item>
      </n-grid>

      <div class="hub-columns">
        <n-card size="small" title="🏆 学习排行榜" class="board-card">
          <div v-for="(row, i) in board" :key="row.name" class="board-row" :class="{ me: 'me' in row && row.me }">
            <span class="rank">{{ MEDALS[i] ?? `${i + 1}` }}</span>
            <span class="board-emoji">{{ row.emoji }}</span>
            <span class="board-name">{{ row.name }}</span>
            <span class="board-xp">{{ row.xp }} XP</span>
          </div>
          <n-text depth="3" style="font-size: 12px;">看视频、答题赚 XP，超越同学们！</n-text>
        </n-card>

        <n-card size="small" title="🎖️ 徽章墙" class="badge-card">
          <div class="badge-grid">
            <div
              v-for="badge in BADGES"
              :key="badge.id"
              class="badge-cell"
              :class="{ locked: !learn.badgeIds.includes(badge.id) }"
              :title="badge.desc"
            >
              <span class="badge-emoji">{{ badge.emoji }}</span>
              <span class="badge-name">{{ badge.name }}</span>
              <span class="badge-desc">{{ badge.desc }}</span>
            </div>
          </div>
        </n-card>
      </div>
    </template>

    <n-card v-else-if="phase === 'collection'" size="small" class="collection-page">
      <div class="player-header">
        <n-button quaternary circle size="small" @click="phase = 'hub'">←</n-button>
        <span class="lesson-title">🃏 知识图鉴</span>
        <n-text depth="3" style="font-size: 13px;">{{ growth.collection.length }} / {{ totalCards }}</n-text>
      </div>
      <n-text depth="3" style="font-size: 12px;">通关课时和闯关答对 6 题以上会掉落新卡，点击卡片翻面看冷知识。</n-text>

      <div v-for="set in CARD_SETS" :key="set.id" class="set-block">
        <div class="set-head">
          <span class="set-name">{{ set.emoji }} {{ set.name }}</span>
          <span class="set-count">
            {{ growth.setOwnedCount(set.id) }} / {{ cardsOfSet(set.id).length }}
            <n-tag v-if="growth.setComplete(set.id)" type="warning" size="tiny" :bordered="false" round>👑 已集齐</n-tag>
          </span>
        </div>
        <div class="card-grid">
          <div
            v-for="card in cardsOfSet(set.id)"
            :key="card.id"
            class="collect-card"
            :class="{ owned: growth.collection.includes(card.id) }"
            @click="toggleFlip(card.id)"
          >
            <template v-if="growth.collection.includes(card.id)">
              <template v-if="flippedCards.has(card.id)">
                <span class="card-fact">{{ card.fact }}</span>
              </template>
              <template v-else>
                <span class="card-emoji">{{ card.emoji }}</span>
                <span class="card-name">{{ card.name }}</span>
              </template>
            </template>
            <template v-else>
              <span class="card-emoji locked">🔒</span>
              <span class="card-name locked">未解锁</span>
            </template>
          </div>
        </div>
      </div>
    </n-card>

    <CourseMap
      v-else-if="phase === 'map'"
      :course="activeCourse"
      @exit="phase = 'hub'"
      @start="startLesson"
    />

    <LessonPlayer
      v-else
      :course="activeCourse"
      :lesson-index="activeLessonIndex"
      @exit="phase = 'map'"
      @next="activeLessonIndex += 1"
    />
  </div>
</template>

<style scoped>
.learn-wrap {
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
  font-size: 42px;
}

.hero-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hello {
  font-size: 17px;
  font-weight: 800;
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lv {
  font-weight: 800;
  color: #f0a020;
}

.streak.cold {
  opacity: 0.4;
}

.stars {
  font-size: 13px;
  opacity: 0.8;
}

.xp-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.xp-line > :first-child {
  flex: 1;
}

.section-title {
  font-size: 16px;
  font-weight: 800;
  margin-top: 4px;
}

.growth-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.sign-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.sign-streak {
  font-weight: 800;
  font-size: 15px;
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.cal-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  border-radius: 50%;
  background: rgba(128, 128, 128, 0.08);
  color: rgba(128, 128, 128, 0.7);
}

.cal-cell.signed {
  background: rgba(24, 160, 88, 0.18);
  color: #18a058;
  font-weight: 700;
}

.cal-cell.today {
  outline: 2px solid #18a058;
  font-weight: 700;
  color: #18a058;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.06);
  font-size: 14px;
}

.task-row.done {
  background: rgba(24, 160, 88, 0.1);
}

.task-state {
  font-size: 13px;
  opacity: 0.85;
}

.collection-entry {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.collection-entry:hover {
  transform: translateY(-2px);
}

.collection-entry-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.entry-title {
  font-weight: 800;
  font-size: 15px;
}

.collection-page {
  max-width: 780px;
  margin: 0 auto;
}

.set-block {
  margin-top: 18px;
}

.set-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.set-name {
  font-weight: 800;
  font-size: 15px;
}

.set-count {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.85;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.collect-card {
  aspect-ratio: 3 / 4;
  border-radius: 10px;
  border: 1.5px solid rgba(128, 128, 128, 0.25);
  background: rgba(128, 128, 128, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
  text-align: center;
}

.collect-card.owned {
  border-color: #f0a020;
  background: rgba(240, 160, 32, 0.08);
}

.collect-card.owned:hover {
  transform: translateY(-3px) rotateY(12deg);
}

.card-emoji {
  font-size: 26px;
}

.card-emoji.locked {
  filter: grayscale(1);
  opacity: 0.4;
}

.card-name {
  font-size: 12px;
  font-weight: 700;
}

.card-name.locked {
  opacity: 0.4;
}

.card-fact {
  font-size: 10.5px;
  line-height: 1.5;
  opacity: 0.9;
}

.course-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
}

.course-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.course-emoji {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.course-crown {
  font-size: 24px;
}

.course-name {
  font-size: 16px;
  font-weight: 800;
}

.course-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: auto;
}

.hub-columns {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 16px;
}

.board-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 14px;
}

.board-row.me {
  background: rgba(24, 160, 88, 0.14);
  border: 1px solid rgba(24, 160, 88, 0.4);
  font-weight: 700;
}

.rank {
  width: 28px;
  text-align: center;
  font-weight: 700;
  flex-shrink: 0;
}

.board-emoji {
  font-size: 18px;
}

.board-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board-xp {
  font-size: 13px;
  opacity: 0.8;
}

.badge-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.badge-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  border-radius: 10px;
  border: 1px dashed rgba(128, 128, 128, 0.35);
  text-align: center;
}

.badge-cell.locked .badge-emoji {
  filter: grayscale(1);
  opacity: 0.35;
}

.badge-emoji {
  font-size: 26px;
}

.badge-name {
  font-size: 12px;
  font-weight: 700;
}

.badge-desc {
  font-size: 10px;
  opacity: 0.6;
  line-height: 1.4;
}

@media (max-width: 800px) {
  .hub-columns {
    grid-template-columns: 1fr;
  }

  .growth-row {
    grid-template-columns: 1fr;
  }

  .badge-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
