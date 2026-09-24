<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NButton, NCard, NGrid, NGridItem, NPopconfirm, NProgress, NTag, NText,
} from 'naive-ui'
import { COURSES, LEADERBOARD_BOTS, BADGES, xpForLevel } from '../data/courses'
import type { LearnCourse } from '../data/courses'
import { useLearnStore } from '../stores/learn'
import { useAuthStore } from '../stores/auth'
import CourseMap from './learn/CourseMap.vue'
import LessonPlayer from './learn/LessonPlayer.vue'

const learn = useLearnStore()
const auth = useAuthStore()

type Phase = 'hub' | 'map' | 'player'
const phase = ref<Phase>('hub')
const activeCourse = ref<LearnCourse>(COURSES[0])
const activeLessonIndex = ref(0)

onMounted(() => learn.load())

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

  .badge-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
