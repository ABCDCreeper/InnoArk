<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NIcon, NProgress, NSpace, NText } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import { bilibiliEmbedOf, videoTypeOf } from '../../data/courses'
import type { LearnCourse } from '../../data/courses'
import type { CollectionCard } from '../../data/collection'
import { useLearnStore } from '../../stores/learn'
import { useGrowthStore } from '../../stores/growth'
import { useNotifyStore } from '../../stores/notify'
import type { LessonResult } from '../../stores/learn'

const props = defineProps<{ course: LearnCourse; lessonIndex: number }>()
const emit = defineEmits<{ exit: []; next: [] }>()

const learn = useLearnStore()
const growth = useGrowthStore()
const notify = useNotifyStore()

type Phase = 'video' | 'quiz' | 'result'

const lesson = computed(() => props.course.lessons[props.lessonIndex])
const videoType = computed(() => videoTypeOf(lesson.value.videoUrl))
const embedUrl = computed(() => (videoType.value === 'bilibili' ? bilibiliEmbedOf(lesson.value.videoUrl) : ''))

const phase = ref<Phase>('video')
const videoFailed = ref(false)
const index = ref(0)
const picked = ref<number | null>(null)
const correctCount = ref(0)
const streak = ref(0)
const result = ref<LessonResult | null>(null)
const cardDrop = ref<CollectionCard | null>(null)
const celebrating = ref(false)

const current = computed(() => lesson.value.questions[index.value])
const answered = computed(() => picked.value !== null)
const total = computed(() => lesson.value.questions.length)
const progressPct = computed(() =>
  Math.round(((index.value + (answered.value ? 1 : 0)) / total.value) * 100),
)
const LETTERS = ['A', 'B', 'C', 'D']

const FLOAT_EMOJIS = ['🎉', '⭐', '🚀', '💡', '✨', '🔥']
const floaters = ref<Array<{ emoji: string; left: number; delay: number; size: number }>>([])
const PRAISES = ['答对啦！知识又 +1！', '太棒了，思路清晰！', '漂亮，就是这答案！', '厉害，一眼看穿！', '哇，这都想得到！']
const ENCOURAGES = ['看完视频再想想？', '别急，答案就藏在视频里', '错题也是收获，继续！', '再试一次，你快想到了！']
const praise = ref('')

function startQuiz() {
  index.value = 0
  picked.value = null
  correctCount.value = 0
  streak.value = 0
  floaters.value = []
  phase.value = 'quiz'
}

function optionClass(i: number) {
  if (!answered.value) return ''
  if (i === current.value.answer) return 'right'
  if (i === picked.value) return 'wrong'
  return 'dim'
}

function pick(i: number) {
  if (answered.value) return
  picked.value = i
  if (i === current.value.answer) {
    streak.value += 1
    correctCount.value += 1
    praise.value = PRAISES[Math.floor(Math.random() * PRAISES.length)]
    floaters.value = Array.from({ length: 7 }, () => ({
      emoji: FLOAT_EMOJIS[Math.floor(Math.random() * FLOAT_EMOJIS.length)],
      left: 8 + Math.random() * 84,
      delay: Math.random() * 0.3,
      size: 20 + Math.random() * 14,
    }))
  } else {
    streak.value = 0
  }
}

function submit() {
  result.value = learn.finishLesson(props.course, props.lessonIndex, correctCount.value, total.value)
  cardDrop.value = result.value.passed ? growth.grantLessonDrop(props.course.id) : null
  result.value.newBadges.forEach((b) => notify.push(`🎖️ 解锁徽章「${b.name}」`, '/profile'))
  if (cardDrop.value) notify.push(`🃏 获得新卡片「${cardDrop.value.name}」`, '/learn')
  phase.value = 'result'
  if (result.value.leveledUp) celebrating.value = true
}

function nextStep() {
  if (index.value < total.value - 1) {
    index.value += 1
    picked.value = null
    floaters.value = []
  } else {
    submit()
  }
}

function replay() {
  result.value = null
  cardDrop.value = null
  celebrating.value = false
  startQuiz()
}

function closeCelebration() {
  celebrating.value = false
}
</script>

<template>
  <div class="player-wrap">
    <n-card size="small">
      <div class="player-header">
        <n-button quaternary circle size="small" @click="emit('exit')">
          <template #icon><n-icon><arrow-back-outline /></n-icon></template>
        </n-button>
        <span class="lesson-title">{{ course.emoji }} {{ lesson.title }}</span>
        <n-text depth="3" style="font-size: 12px;">{{ course.title }}</n-text>
      </div>

      <div v-if="phase === 'video'" class="video-stage">
        <div class="video-box">
          <video
            v-if="videoType === 'mp4' && !videoFailed"
            controls
            playsinline
            :src="lesson.videoUrl"
            @error="videoFailed = true"
          ></video>
          <iframe
            v-else-if="videoType === 'bilibili' && !videoFailed"
            :src="embedUrl"
            scrolling="no"
            frameborder="no"
            allowfullscreen="true"
            @error="videoFailed = true"
          ></iframe>
          <div v-else class="video-fallback">
            <span>📺 视频暂时加载不出来</span>
            <n-text depth="3" style="font-size: 13px;">不影响闯关，直接开始答题吧！</n-text>
          </div>
        </div>
        <div class="video-actions">
          <n-button type="primary" size="large" @click="startQuiz">
            我看完了，开始答题 📝
          </n-button>
        </div>
      </div>

      <div v-else-if="phase === 'quiz'" class="quiz-stage">
        <div class="quiz-header">
          <n-text depth="3" style="font-size: 13px;">第 {{ index + 1 }} / {{ total }} 题</n-text>
          <span v-if="streak > 1" class="streak">🔥 连对 x{{ streak }}</span>
        </div>
        <n-progress type="line" :percentage="progressPct" :height="8" :show-indicator="false" />
        <div class="q-title">{{ current.question }}</div>
        <div class="options-wrap">
          <div
            v-for="(opt, i) in current.options"
            :key="i"
            class="option"
            :class="[answered ? 'locked' : '', optionClass(i)]"
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
          <div class="fb-title">{{ picked === current.answer ? `🎉 ${praise}` : `💡 ${ENCOURAGES[index % ENCOURAGES.length]}` }}</div>
          <div class="fb-expl">
            <span v-if="picked !== current.answer"><b>正确答案：{{ current.options[current.answer] }}</b><br /></span>
            {{ current.explanation }}
          </div>
        </div>
        <n-space v-if="answered" justify="end" style="margin-top: 16px;">
          <n-button type="primary" @click="nextStep">
            {{ index === total - 1 ? '交卷 🏁' : '下一题 →' }}
          </n-button>
        </n-space>
      </div>

      <div v-else-if="result" class="result-stage">
        <div class="result-hero">
          <div class="result-stars">
            <span
              v-for="i in 3"
              :key="i"
              class="star"
              :class="{ lit: i <= result.stars, dim: i > result.stars }"
              :style="{ animationDelay: `${i * 0.18}s` }"
            >⭐</span>
          </div>
          <div class="result-verdict">
            {{ result.passed ? (result.stars === 3 ? '完美通关！' : '通关成功！') : '这次没通关，再看看视频？' }}
          </div>
          <div class="result-xp" :class="{ pop: result.gainedXp > 0 }">
            {{ result.gainedXp > 0 ? `+${result.gainedXp} XP` : '本次没有获得 XP' }}
          </div>
          <n-text depth="3" style="font-size: 13px;">
            答对 {{ correctCount }} / {{ total }} 题 · 当前 {{ learn.title }}（Lv.{{ learn.level }}）
          </n-text>

          <div v-if="result.newBadges.length > 0" class="badge-banner">
            <div v-for="b in result.newBadges" :key="b.id" class="badge-item">
              <span class="badge-emoji">{{ b.emoji }}</span>
              <span>解锁徽章「{{ b.name }}」· {{ b.desc }}</span>
            </div>
          </div>

          <div v-if="cardDrop" class="card-drop">
            <span class="drop-emoji">{{ cardDrop.emoji }}</span>
            <span>🎁 获得新卡片「{{ cardDrop.name }}」，去图鉴看看吧！</span>
          </div>

          <n-space justify="center" style="margin-top: 18px;">
            <n-button @click="replay">再刷一遍 🔁</n-button>
            <n-button
              v-if="result.passed && props.lessonIndex < props.course.lessons.length - 1"
              type="primary"
              size="large"
              @click="emit('next')"
            >下一课 →</n-button>
            <n-button quaternary @click="emit('exit')">返回地图</n-button>
          </n-space>
        </div>
      </div>
    </n-card>

    <div v-if="celebrating" class="celebrate-overlay" @click="closeCelebration">
      <div class="celebrate-body">
        <div class="celebrate-emoji">🎊🎉🚀</div>
        <div class="celebrate-title">升级啦！</div>
        <div class="celebrate-level">Lv.{{ result?.newLevel }} {{ learn.title }}</div>
        <n-text depth="3">点击任意处继续</n-text>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-wrap {
  max-width: 780px;
  margin: 0 auto;
  position: relative;
}

.player-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.lesson-title {
  font-size: 16px;
  font-weight: 700;
  flex: 1;
}

.video-stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.video-box {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
  background: #000;
}

.video-box video,
.video-box iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.video-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.video-actions {
  display: flex;
  justify-content: center;
}

.quiz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
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

.result-stage {
  padding: 12px 0 4px;
}

.result-hero {
  text-align: center;
}

.result-stars {
  display: flex;
  justify-content: center;
  gap: 10px;
  font-size: 44px;
}

.result-stars .star {
  display: inline-block;
  animation: bounce-in 0.5s ease backwards;
}

.result-stars .star.dim {
  filter: grayscale(1);
  opacity: 0.3;
}

.result-verdict {
  font-size: 22px;
  font-weight: 800;
  margin: 10px 0 4px;
}

.result-xp {
  font-size: 30px;
  font-weight: 800;
  color: #f0a020;
  margin-bottom: 6px;
}

.result-xp.pop {
  animation: pop 0.5s ease;
}

.badge-banner {
  margin: 14px auto 0;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.badge-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(240, 160, 32, 0.12);
  border: 1px solid rgba(240, 160, 32, 0.4);
  font-size: 14px;
  animation: fade-in-up 0.4s ease backwards;
}

.badge-emoji {
  font-size: 22px;
}

.card-drop {
  margin: 12px auto 0;
  max-width: 420px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.4);
  font-size: 14px;
  animation: flip-in 0.5s ease;
}

.drop-emoji {
  font-size: 22px;
  animation: bounce-in 0.5s ease 0.15s backwards;
}

@keyframes flip-in {
  from {
    transform: rotateY(90deg);
    opacity: 0;
  }
  to {
    transform: rotateY(0);
    opacity: 1;
  }
}

.celebrate-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.25s ease;
}

.celebrate-body {
  text-align: center;
  color: #fff;
  animation: bounce-in 0.5s ease;
}

.celebrate-emoji {
  font-size: 52px;
}

.celebrate-title {
  font-size: 34px;
  font-weight: 800;
  margin: 8px 0;
}

.celebrate-level {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 10px;
  color: #ffd268;
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

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
