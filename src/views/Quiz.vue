<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NCard, NButton, NSpace, NText, NProgress, NTag, NStatistic, NIcon, NEmpty, NDivider, NAlert, useMessage } from 'naive-ui'
import { PlayOutline, RefreshOutline } from '@vicons/ionicons5'
import {
  fetchQuizQuestions, fetchQuizStats, submitQuizAttempt, submitQuizAnswer,
  fetchWrongAnswers, reviewWrongAnswer,
} from '../api/quiz'
import { fetchMyGroups } from '../api/group'
import { ApiError } from '../api/request'
import type { QuizQuestion, QuizStats, ReviewResult, WrongAnswer } from '../api/types'

const message = useMessage()

type Phase = 'start' | 'playing' | 'result'

const phase = ref<Phase>('start')
const questions = ref<QuizQuestion[]>([])
const index = ref(0)
const score = ref(0)
const picked = ref<number | null>(null)
const streak = ref(0)
const maxStreak = ref(0)
const praise = ref('')
const encourage = ref('')
const floaters = ref<Array<{ emoji: string; left: number; delay: number; size: number }>>([])
const missed = ref<Array<{ q: QuizQuestion; pick: number }>>([])
const stats = ref<QuizStats | null>(null)
const myGroups = ref<Array<{ id: string; name: string }>>([])
const bankId = ref<string | null>(null)
const oldBest = ref(-1)
const isNewRecord = ref(false)
const starting = ref(false)
const submitting = ref(false)
const finishing = ref(false)
const roundId = ref('')

// ---------------------------------------------------------------- 错题复习
// 错题本存在服务端（不再因刷新丢失），按 3/7/14 天间隔复习
const wrongOpen = ref<WrongAnswer[]>([])
const reviewMode = ref(false)
const reviewIndex = ref(0)
const reviewPicked = ref<number | null>(null)
const reviewResult = ref<ReviewResult | null>(null)
const reviewDone = ref(0)
const reviewingInFlight = ref(false)

async function loadWrong() {
  try {
    const res = await fetchWrongAnswers(false)
    wrongOpen.value = res.items
  } catch {
    // 错题本是附加功能，加载失败不影响正常闯关
  }
}

function startReview() {
  if (!wrongOpen.value.length) return
  reviewMode.value = true
  reviewIndex.value = 0
  reviewPicked.value = null
  reviewResult.value = null
  reviewDone.value = 0
}

const currentWrong = computed(() => wrongOpen.value[reviewIndex.value] ?? null)

async function pickReview(i: number) {
  const item = currentWrong.value
  if (!item || reviewPicked.value !== null || reviewingInFlight.value) return
  reviewingInFlight.value = true
  reviewPicked.value = i
  try {
    const result = await reviewWrongAnswer(item.questionId, i)
    reviewResult.value = result
    if (result.correct) reviewDone.value += 1
  } catch (err) {
    reviewPicked.value = null
    message.error(err instanceof ApiError ? err.message : '提交失败')
  } finally {
    reviewingInFlight.value = false
  }
}

async function nextReview() {
  if (reviewIndex.value < wrongOpen.value.length - 1) {
    reviewIndex.value += 1
    reviewPicked.value = null
    reviewResult.value = null
  } else {
    reviewMode.value = false
    await loadWrong()
    await refreshStats()
    message.success(`本轮复习完成，答对 ${reviewDone.value} 题`)
  }
}

const PRAISES = [
  '答对啦！你就是行走的百科全书！',
  '太强了，知识库又 +1！',
  '漂亮！这波操作满分！',
  '脑子转得真快，继续保持！',
  '哇，连这种冷知识都知道！',
  '完美！再答几题就能通关了！',
]
const ENCOURAGES = [
  '没事，记住这个知识点就是赚到！',
  '错题是进步的阶梯，加油！',
  '这道题有点意思，下次一定对！',
  '涨知识了！这才是闯关的意义！',
  '别灰心，答错的题才是真正学会的题！',
]
const FLOAT_EMOJIS = ['🎉', '⭐', '🚀', '💡', '✨', '🔥']
const CATEGORY_EMOJI: Record<string, string> = { 物理: '⚡', 工程: '🔧', 编程: '💻', 生物: '🧬', 综合: '🧠' }

async function refreshStats() {
  try {
    stats.value = await fetchQuizStats()
  } catch {
    stats.value = null
  }
}

onMounted(async () => {
  try {
    const [s, g] = await Promise.all([fetchQuizStats(), fetchMyGroups()])
    stats.value = s
    myGroups.value = g.items
    if (g.items.length > 0) bankId.value = g.items[0].id
  } catch {
    stats.value = null
  }
  await loadWrong()
})

const bankLabel = computed(() => {
  if (!bankId.value) return '公共题库'
  return myGroups.value.find((x) => x.id === bankId.value)?.name ?? '公共题库'
})

const current = computed(() => questions.value[index.value])
const answered = computed(() => picked.value !== null)
const total = computed(() => questions.value.length * 10)
const accuracy = computed(() => (total.value ? Math.round((score.value / total.value) * 100) : 0))
const bestAccuracy = computed(() => stats.value?.best?.total ? Math.round(stats.value.best.score / stats.value.best.total * 100) : 0)
const progressPct = computed(() =>
  Math.round(((index.value + (answered.value ? 1 : 0)) / questions.value.length) * 100),
)
const catEmoji = computed(() => CATEGORY_EMOJI[current.value?.category ?? ''] ?? '🧠')

function optionClass(i: number) {
  if (!answered.value) return ''
  if (i === current.value.answer) return 'right'
  if (i === picked.value) return 'wrong'
  return 'dim'
}

async function start() {
  starting.value = true
  try {
    const res = await fetchQuizQuestions(10, bankId.value ?? undefined)
    if (res.items.length === 0) {
      message.error('这个题库还是空的，等老师出题吧')
      return
    }
    roundId.value = res.roundId!
    questions.value = res.items.map(q => ({ ...q, answer: -1, explanation: '' }))
    index.value = 0
    score.value = 0
    picked.value = null
    streak.value = 0
    maxStreak.value = 0
    missed.value = []
    floaters.value = []
    oldBest.value = stats.value?.best?.total ? stats.value.best.score / stats.value.best.total : -1
    isNewRecord.value = false
    phase.value = 'playing'
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '加载题目失败')
  } finally {
    starting.value = false
  }
}

async function pick(i: number) {
  if (answered.value || submitting.value) return
  submitting.value = true
  try {
    const result = await submitQuizAnswer(roundId.value, current.value.id, i)
    current.value.answer = result.answer
    current.value.explanation = result.explanation
    score.value = result.score
    picked.value = i
    if (i === current.value.answer) {
      streak.value += 1
      maxStreak.value = Math.max(maxStreak.value, streak.value)
      praise.value = PRAISES[Math.floor(Math.random() * PRAISES.length)]
      floaters.value = Array.from({ length: 7 }, () => ({
        emoji: FLOAT_EMOJIS[Math.floor(Math.random() * FLOAT_EMOJIS.length)],
        left: 8 + Math.random() * 84,
        delay: Math.random() * 0.3,
        size: 20 + Math.random() * 14,
      }))
    } else {
      streak.value = 0
      encourage.value = ENCOURAGES[Math.floor(Math.random() * ENCOURAGES.length)]
      missed.value.push({ q: current.value, pick: i })
    }
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

function next() {
  if (index.value < questions.value.length - 1) {
    index.value += 1
    picked.value = null
    floaters.value = []
  } else {
    finish()
  }
}

async function finish() {
  if (finishing.value) return
  finishing.value = true
  try {
    const result = await submitQuizAttempt(roundId.value)
    score.value = result.attempt.score
    isNewRecord.value = score.value / result.attempt.total > oldBest.value && score.value > 0
    phase.value = 'result'
    stats.value = {
      attempts: (stats.value?.attempts ?? 0) + 1,
      best: result.best,
      last: result.attempt,
      // 本轮答错的题已在服务端入错题本，本地只需刷新待复习数量
      wrong: stats.value?.wrong ?? { open: 0, due: 0 },
    }
    void loadWrong()
    void refreshStats()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '成绩提交失败，请重试')
  } finally {
    finishing.value = false
  }
}

const LETTERS = ['A', 'B', 'C', 'D']
</script>

<template>
  <div class="quiz-wrap">
    <n-space v-if="phase === 'start'" vertical size="large">
      <n-card size="small">
        <div class="start-hero">
          <div class="start-emoji">🧠✨</div>
          <div class="start-title">闯关</div>
          <n-text depth="3" class="start-desc">10 道跨学科选择题，答对 +10 分，连对攒🔥，错题也能涨知识！</n-text>
        </div>

        <div class="start-stats">
          <n-statistic label="最佳纪录" :value="stats?.best ? `${stats.best.score}/${stats.best.total}` : '—'">
            <template #prefix v-if="stats?.best">🏆</template>
          </n-statistic>
          <n-statistic label="已挑战" :value="stats ? `${stats.attempts} 次` : '—'" />
          <n-statistic label="最近一次" :value="stats?.last ? `${stats.last.score}/${stats.last.total}` : '—'" />
        </div>

        <div class="bank-area">
          <n-text depth="3" style="font-size: 13px;">选择题库：</n-text>
          <div class="bank-chips">
            <span
              class="bank-chip"
              :class="{ active: bankId === null }"
              @click="bankId = null"
            >🌐 公共题库</span>
            <span
              v-for="g in myGroups"
              :key="g.id"
              class="bank-chip"
              :class="{ active: bankId === g.id }"
              @click="bankId = g.id"
            >👥 {{ g.name }}</span>
          </div>
        </div>

        <div class="cat-chips">
          <n-tag v-for="c in Object.entries(CATEGORY_EMOJI)" :key="c[0]" size="small" :bordered="false" round>
            {{ c[1] }} {{ c[0] }}
          </n-tag>
        </div>

        <div class="start-actions">
          <n-button type="primary" size="large" :loading="starting" @click="start">
            <template #icon><n-icon><play-outline /></n-icon></template>
            开始挑战（{{ bankLabel }}）
          </n-button>
          <n-button
            v-if="wrongOpen.length"
            size="large"
            :disabled="starting"
            @click="startReview"
          >
            复习错题（{{ wrongOpen.length }}）
          </n-button>
          <n-tag v-if="stats?.wrong?.due" type="warning" size="small" :bordered="false">
            今天该复习 {{ stats.wrong.due }} 题
          </n-tag>
        </div>

      </n-card>

      <!-- 错题复习：答对按 3/7/14 天推进，答错退回第一轮 -->
      <n-card v-if="reviewMode && currentWrong" size="small" title="错题复习">
        <n-space vertical size="medium">
          <n-space align="center" justify="space-between">
            <n-text depth="3" style="font-size: 13px;">
              第 {{ reviewIndex + 1 }} / {{ wrongOpen.length }} 题 · {{ currentWrong.stageLabel }}
            </n-text>
            <n-text depth="3" style="font-size: 13px;">本轮答对 {{ reviewDone }} 题</n-text>
          </n-space>
          <div class="q-title">{{ currentWrong.question }}</div>
          <n-space vertical size="small">
            <n-button
              v-for="(opt, i) in currentWrong.options"
              :key="i"
              block
              :type="reviewPicked === null ? 'default'
                : i === reviewResult?.answer ? 'success'
                : i === reviewPicked ? 'error' : 'default'"
              :disabled="reviewPicked !== null"
              @click="pickReview(i)"
            >{{ LETTERS[i] }}. {{ opt }}</n-button>
          </n-space>
          <n-alert v-if="reviewResult" :type="reviewResult.correct ? 'success' : 'error'" :show-icon="false">
            <n-text strong>{{ reviewResult.correct ? '答对了' : '答错了' }}</n-text>
            <n-text v-if="!reviewResult.correct">，正确答案：{{ currentWrong.options[reviewResult.answer] }}</n-text>
            <br />
            <n-text depth="3" style="font-size: 13px;">
              {{ reviewResult.correct
                ? (reviewResult.resolved ? '已掌握，这题不再出现。' : '下一轮复习时间已顺延。')
                : '本轮进度已退回第一轮。' }}
            </n-text>
            <br />
            <n-text>{{ reviewResult.explanation }}</n-text>
          </n-alert>
          <n-space justify="end">
            <n-button @click="reviewMode = false">退出复习</n-button>
            <n-button type="primary" :disabled="reviewPicked === null" @click="nextReview">
              {{ reviewIndex === wrongOpen.length - 1 ? '完成复习' : '下一题' }}
            </n-button>
          </n-space>
        </n-space>
      </n-card>
    </n-space>

    <n-card v-else-if="phase === 'playing'" size="small">
      <div class="quiz-header">
        <n-text depth="3" style="font-size: 13px;">第 {{ index + 1 }} / {{ questions.length }} 题</n-text>
        <span class="score-num" :key="score" :class="{ pop: answered && picked === current.answer }">⭐ {{ score }}</span>
        <span v-if="streak > 1" class="streak">🔥 连对 x{{ streak }}</span>
      </div>
      <n-progress type="line" :percentage="progressPct" :height="8" :show-indicator="false" />

      <div class="q-title">{{ catEmoji }} {{ current.question }}</div>

      <div class="options-wrap">
        <div
          v-for="(opt, i) in current.options"
          :key="i"
          class="option"
          :class="[answered || submitting ? 'locked' : '', optionClass(i)]"
          @click="pick(i)"
        >
          <span class="option-letter">{{ LETTERS[i] }}</span>
          <span class="option-text">{{ opt }}</span>
          <span v-if="answered && i === current.answer" class="option-mark">✅</span>
          <span v-else-if="answered && i === picked" class="option-mark">❌</span>
        </div>
        <span
          v-for="(f, i) in floaters"
          :key="`f${i}`"
          class="floater"
          :style="{ left: `${f.left}%`, fontSize: `${f.size}px`, animationDelay: `${f.delay}s` }"
        >
          {{ f.emoji }}
        </span>
      </div>

      <div v-if="answered" class="feedback" :class="picked === current.answer ? 'ok' : 'no'">
        <div v-if="picked === current.answer" class="fb-title">🎉 {{ praise }}</div>
        <div v-else class="fb-title">💡 {{ encourage }}</div>
        <div class="fb-expl">
          <span v-if="picked !== current.answer">
            <b>正确答案：{{ current.options[current.answer] }}</b><br />
          </span>
          {{ current.explanation }}
        </div>
      </div>

      <n-space v-if="answered" justify="end" style="margin-top: 16px;">
        <n-button type="primary" :loading="finishing" @click="next">
          {{ index === questions.length - 1 ? '查看结果 🏁' : '下一题 →' }}
        </n-button>
      </n-space>
    </n-card>

    <n-card v-else size="small">
      <div class="result-hero">
        <div class="result-emoji">{{ isNewRecord ? '🏆' : '🧩' }}</div>
        <div class="result-score">{{ score }}<span class="result-total"> / {{ total }}</span></div>
        <div class="result-meta">
          <span>✅ 答对 {{ score / 10 }} 题</span>
          <span>🎯 正确率 {{ accuracy }}%</span>
          <span>🔥 最高连对 x{{ maxStreak }}</span>
        </div>
        <n-tag v-if="isNewRecord" type="success" size="large" :bordered="false" style="margin-bottom: 16px;">
          🎉 打破个人纪录！
        </n-tag>
        <n-text v-else-if="stats?.best && accuracy < bestAccuracy" depth="3" style="display: block; margin-bottom: 16px;">
          历史最佳正确率 {{ bestAccuracy }}%，本次正确率 {{ accuracy }}%。
        </n-text>
        <n-text v-else-if="stats?.best" depth="3" style="display: block; margin-bottom: 16px;">
          追平最佳纪录！下次试试全对 💪
        </n-text>
        <div class="start-actions">
          <n-button type="primary" size="large" :loading="starting" @click="start">
            <template #icon><n-icon><refresh-outline /></n-icon></template>
            再来一局
          </n-button>
        </div>
      </div>

      <n-divider v-if="missed.length > 0" title-placement="left">📚 错题回顾（涨知识时间）</n-divider>
      <n-empty v-if="missed.length === 0" description="全对通关！没有错题，太强了 🎉" style="padding: 24px 0;" />
      <n-card v-for="m in missed" :key="m.q.id" size="small" :bordered="false" class="missed-card">
        <div class="missed-q">{{ CATEGORY_EMOJI[m.q.category] ?? '🧠' }} {{ m.q.question }}</div>
        <div class="missed-line" style="color: #d03050;">你的选择：{{ m.q.options[m.pick] }}</div>
        <div class="missed-line" style="color: #18a058;">正确答案：{{ m.q.options[m.q.answer] }}</div>
        <div class="missed-expl">{{ m.q.explanation }}</div>
      </n-card>
    </n-card>
  </div>
</template>

<style scoped>
.quiz-wrap {
  max-width: 720px;
  margin: 0 auto;
}

.start-hero {
  text-align: center;
  padding: 20px 0 4px;
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

.start-stats {
  display: flex;
  justify-content: center;
  gap: 48px;
  margin: 22px 0;
}

.cat-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.bank-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.bank-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.bank-chip {
  padding: 5px 12px;
  border: 1.5px solid rgba(128, 128, 128, 0.3);
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bank-chip:hover {
  border-color: #18a058;
}

.bank-chip.active {
  border-color: #18a058;
  background: rgba(24, 160, 88, 0.12);
  color: #18a058;
  font-weight: 600;
}

.start-actions {
  display: flex;
  justify-content: center;
  padding-bottom: 8px;
}

.quiz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.score-num {
  display: inline-block;
  font-size: 19px;
  font-weight: 800;
  color: #f0a020;
}

.score-num.pop {
  animation: pop 0.4s ease;
}

.streak {
  color: #f0a020;
  font-weight: 700;
  font-size: 14px;
}

.q-title {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.6;
  margin: 16px 0;
}

.options-wrap {
  position: relative;
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

.option-mark {
  margin-left: auto;
  font-size: 15px;
}

.floater {
  position: absolute;
  top: 20%;
  pointer-events: none;
  animation: float-up 1.2s ease-out forwards;
}

.feedback {
  margin-top: 16px;
  border-radius: 10px;
  padding: 12px 14px;
  animation: fade-in-up 0.3s ease;
}

.feedback.ok {
  background: rgba(24, 160, 88, 0.1);
  border: 1px solid rgba(24, 160, 88, 0.35);
}

.feedback.no {
  background: rgba(208, 48, 80, 0.08);
  border: 1px solid rgba(208, 48, 80, 0.3);
}

.fb-title {
  font-weight: 700;
  margin-bottom: 6px;
}

.fb-expl {
  font-size: 13px;
  line-height: 1.7;
  opacity: 0.85;
}

.result-hero {
  text-align: center;
  padding: 20px 0 8px;
}

.result-emoji {
  font-size: 56px;
  animation: bounce-in 0.5s ease;
}

.result-score {
  font-size: 40px;
  font-weight: 800;
  margin: 6px 0;
}

.result-total {
  font-size: 22px;
  opacity: 0.55;
}

.result-meta {
  display: flex;
  justify-content: center;
  gap: 28px;
  margin: 10px 0 18px;
  font-size: 13px;
  opacity: 0.75;
}

.missed-card {
  margin-bottom: 10px;
}

.missed-q {
  font-weight: 600;
  margin-bottom: 6px;
}

.missed-line {
  font-size: 13px;
  margin-top: 2px;
}

.missed-expl {
  font-size: 13px;
  line-height: 1.7;
  margin-top: 8px;
  opacity: 0.85;
}

@keyframes float-up {
  from {
    opacity: 1;
    transform: translateY(0) scale(0.6);
  }
  to {
    opacity: 0;
    transform: translateY(-90px) scale(1.3);
  }
}

@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(3px); }
  30%, 50%, 70% { transform: translateX(-5px); }
  40%, 60% { transform: translateX(5px); }
}

@keyframes pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.35); }
  100% { transform: scale(1); }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  60% {
    transform: scale(1.12);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
