<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { NButton, NCard, NIcon, NProgress, NText, useMessage } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import { fetchQuizQuestions } from '../api/quiz'
import { ApiError } from '../api/request'
import type { QuizQuestion } from '../api/types'
import { useGrowthStore } from '../stores/growth'

const growth = useGrowthStore()
const message = useMessage()

type Phase = 'start' | 'fighting' | 'result'

const MAX_HP = 5
const QUESTION_MS = 15000

const phase = ref<Phase>('start')
const questions = ref<QuizQuestion[]>([])
const qIndex = ref(0)
const myHp = ref(MAX_HP)
const foeHp = ref(MAX_HP)
const picked = ref<number | null>(null)
const timeLeft = ref(QUESTION_MS)
const foeActed = ref(false)
const myActed = ref(false)
const meHit = ref(false)
const foeHit = ref(false)
const battleResult = ref<{ win: boolean; xpGained: number } | null>(null)
const loading = ref(false)

const LETTERS = ['A', 'B', 'C', 'D']
const rnd = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

const current = computed(() => questions.value[qIndex.value])
const timePct = computed(() => Math.max(Math.round((timeLeft.value / QUESTION_MS) * 100), 0))
const urgent = computed(() => timeLeft.value <= 5000)

let tickTimer: number | null = null
let foeTimer: number | null = null
let pauseTimer: number | null = null
const hitTimers = new Set<number>()

function stopTimers() {
  if (tickTimer !== null) { clearInterval(tickTimer); tickTimer = null }
  if (foeTimer !== null) { clearTimeout(foeTimer); foeTimer = null }
  if (pauseTimer !== null) { clearTimeout(pauseTimer); pauseTimer = null }
  for (const t of hitTimers) clearTimeout(t)
  hitTimers.clear()
}

onBeforeUnmount(stopTimers)

async function startBattle() {
  loading.value = true
  try {
    const res = await fetchQuizQuestions(5)
    if (res.items.length === 0) {
      message.error('题库是空的，打不了，等老师出题吧')
      return
    }
    questions.value = res.items
    qIndex.value = 0
    myHp.value = MAX_HP
    foeHp.value = MAX_HP
    battleResult.value = null
    phase.value = 'fighting'
    beginQuestion()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '抽题失败')
  } finally {
    loading.value = false
  }
}

function beginQuestion() {
  picked.value = null
  foeActed.value = false
  myActed.value = false
  timeLeft.value = QUESTION_MS
  const foeDelay = 4000 + rnd() * 7000
  const foeCorrect = rnd() < 0.7
  foeTimer = window.setTimeout(() => {
    foeActed.value = true
    if (foeCorrect && !myActed.value) hurtMe()
    settleIfDone()
  }, foeDelay)
  tickTimer = window.setInterval(() => {
    timeLeft.value -= 100
    if (timeLeft.value <= 0) {
      timeLeft.value = 0
      foeActed.value = true
      myActed.value = true // 超时未作答视为放弃本题，直接结算进下一题
      settleIfDone()
    }
  }, 100)
}

function pick(i: number) {
  if (picked.value !== null || !current.value || timeLeft.value <= 0) return
  picked.value = i
  myActed.value = true
  if (i === current.value.answer && !foeActed.value) hurtFoe()
  settleIfDone()
}

function hurtMe() {
  myHp.value = Math.max(myHp.value - 1, 0)
  meHit.value = true
  const t = window.setTimeout(() => { meHit.value = false; hitTimers.delete(t) }, 500)
  hitTimers.add(t)
}

function hurtFoe() {
  foeHp.value = Math.max(foeHp.value - 1, 0)
  foeHit.value = true
  const t = window.setTimeout(() => { foeHit.value = false; hitTimers.delete(t) }, 500)
  hitTimers.add(t)
}

function settleIfDone() {
  if (pauseTimer !== null) return // 已排定结算，避免重复触发 next/finish
  if (myHp.value <= 0 || foeHp.value <= 0) {
    stopTimers()
    pauseTimer = window.setTimeout(() => { pauseTimer = null; finish() }, 900)
    return
  }
  if (myActed.value && foeActed.value) {
    stopTimers()
    pauseTimer = window.setTimeout(() => { pauseTimer = null; next() }, 1000)
  }
}

function next() {
  if (qIndex.value < questions.value.length - 1) {
    qIndex.value += 1
    beginQuestion()
  } else {
    finish()
  }
}

function finish() {
  stopTimers()
  const win = myHp.value > foeHp.value
  const res = growth.recordBattle(win)
  battleResult.value = { win, xpGained: res.xpGained }
  if (res.leveledUp) message.success('升级啦！')
  phase.value = 'result'
}
</script>

<template>
  <div class="battle-wrap">
    <n-card v-if="phase === 'start'" size="small">
      <div class="start-hero">
        <div class="start-emoji">⚔️🔥</div>
        <div class="start-title">极速对战</div>
        <n-text depth="3" class="start-desc">
          与神秘对手 1v1 限时答题：5 道题、每题 15 秒，答对就砍对方一刀，血条先空的一方输！
        </n-text>
        <div class="record-line">
          <span>🏆 战绩：{{ growth.battleWins }} 胜 / {{ growth.battleTotal }} 场</span>
          <span>胜 +30 XP · 负 +10 XP</span>
        </div>
        <div class="start-actions">
          <n-button type="primary" size="large" :loading="loading" @click="startBattle">开战！</n-button>
        </div>
      </div>
    </n-card>

    <n-card v-else-if="phase === 'fighting' && current" size="small">
      <div class="hp-row">
        <div class="fighter" :class="{ hit: meHit }">
          <span class="fighter-avatar">🙋</span>
          <div class="hearts">
            <span v-for="i in MAX_HP" :key="i" class="heart" :class="{ lost: i > myHp }">❤️</span>
          </div>
        </div>
        <span class="vs">VS</span>
        <div class="fighter" :class="{ hit: foeHit }">
          <div class="hearts">
            <span v-for="i in MAX_HP" :key="i" class="heart" :class="{ lost: i > foeHp }">❤️</span>
          </div>
          <span class="fighter-avatar">🤖</span>
        </div>
      </div>

      <div class="timer-line">
        <n-progress
          type="line"
          :percentage="timePct"
          :height="10"
          :show-indicator="false"
          :color="urgent ? '#d03050' : '#18a058'"
        />
        <n-text :depth="urgent ? 1 : 3" :type="urgent ? 'error' : 'default'" style="font-size: 13px; white-space: nowrap;">
          ⏱ {{ Math.ceil(timeLeft / 1000) }}s
        </n-text>
      </div>

      <div class="q-count">
        <n-text depth="3" style="font-size: 13px;">第 {{ qIndex + 1 }} / {{ questions.length }} 题</n-text>
      </div>
      <div class="q-title">{{ current.question }}</div>

      <div class="options-wrap">
        <div
          v-for="(opt, i) in current.options"
          :key="i"
          class="option"
          :class="{
            locked: picked !== null,
            right: picked !== null && i === current.answer,
            wrong: picked === i && i !== current.answer,
            dim: picked !== null && picked !== i && i !== current.answer,
          }"
          @click="pick(i)"
        >
          <span class="option-letter">{{ LETTERS[i] }}</span>
          <span class="option-text">{{ opt }}</span>
        </div>
      </div>
    </n-card>

    <n-card v-else-if="phase === 'result' && battleResult" size="small">
      <div class="result-hero">
        <div class="result-emoji">{{ battleResult.win ? '🏆' : '💪' }}</div>
        <div class="result-title">{{ battleResult.win ? '胜利！对手已被你打败' : '惜败，下次一定' }}</div>
        <div class="result-xp">+{{ battleResult.xpGained }} XP</div>
        <n-text depth="3" style="font-size: 13px;">
          战绩：{{ growth.battleWins }} 胜 / {{ growth.battleTotal }} 场
        </n-text>
        <div class="start-actions">
          <n-button type="primary" size="large" @click="startBattle">再来一局</n-button>
        </div>
      </div>
    </n-card>

    <div class="back-line">
      <n-button quaternary size="small" @click="$router.push('/quiz')">
        <template #icon><n-icon><arrow-back-outline /></n-icon></template>
        返回闯关
      </n-button>
    </div>
  </div>
</template>

<style scoped>
.battle-wrap {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.start-hero {
  text-align: center;
  padding: 20px 0 8px;
}

.start-emoji {
  font-size: 44px;
}

.start-title {
  font-size: 28px;
  font-weight: 800;
  margin: 6px 0;
}

.start-desc {
  font-size: 14px;
}

.record-line {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin: 16px 0;
  font-size: 13px;
  opacity: 0.85;
}

.start-actions {
  display: flex;
  justify-content: center;
  padding: 6px 0;
}

.hp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.fighter {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fighter-avatar {
  font-size: 34px;
  display: inline-block;
}

.fighter.hit .fighter-avatar {
  animation: shake 0.45s ease;
}

.hearts {
  display: flex;
  gap: 2px;
  font-size: 16px;
}

.heart {
  transition: all 0.2s ease;
}

.heart.lost {
  filter: grayscale(1);
  opacity: 0.3;
  transform: scale(0.8);
}

.vs {
  font-weight: 900;
  font-size: 18px;
  opacity: 0.6;
}

.timer-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timer-line > :first-child {
  flex: 1;
}

.q-count {
  margin: 12px 0 0;
}

.q-title {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.6;
  margin: 10px 0 16px;
}

.options-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1.5px solid rgba(128, 128, 128, 0.28);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.option:hover:not(.locked) {
  border-color: #18a058;
  transform: translateX(4px);
}

.option.locked {
  cursor: default;
}

.option.right {
  border-color: #18a058;
  background: rgba(24, 160, 88, 0.1);
}

.option.wrong {
  border-color: #d03050;
  background: rgba(208, 48, 80, 0.1);
  animation: shake 0.45s ease;
}

.option.dim {
  opacity: 0.45;
}

.option-letter {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(128, 128, 128, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.option.right .option-letter {
  background: #18a058;
  color: #fff;
}

.option.wrong .option-letter {
  background: #d03050;
  color: #fff;
}

.result-hero {
  text-align: center;
  padding: 16px 0 6px;
}

.result-emoji {
  font-size: 56px;
  animation: bounce-in 0.5s ease;
}

.result-title {
  font-size: 24px;
  font-weight: 800;
  margin: 8px 0;
}

.result-xp {
  font-size: 30px;
  font-weight: 800;
  color: #f0a020;
  margin-bottom: 8px;
}

.back-line {
  display: flex;
  justify-content: center;
}

@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(3px); }
  30%, 50%, 70% { transform: translateX(-5px); }
  40%, 60% { transform: translateX(5px); }
}

@keyframes bounce-in {
  0% { opacity: 0; transform: scale(0.5); }
  60% { transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
}
</style>
