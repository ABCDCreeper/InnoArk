<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NButton, NTag, NModal, NProgress, NSpace, NText, NIcon, useMessage,
} from 'naive-ui'
import { ArrowBack, StarOutline, FlashOutline } from '@vicons/ionicons5'
import { learnApi } from '../api/learn'
import type { CourseDetail, Lesson, Quiz, Progress } from '../api/learn'

const route = useRoute()
const router = useRouter()
const msg = useMessage()

const courseId = Number(route.params.id)
const course = ref<CourseDetail | null>(null)
const currentLesson = ref<Lesson | null>(null)
const quizzes = ref<Quiz[]>([])
const progress = ref<Progress>({ xp: 0, points: 0, streak: 0, total_courses: 0 })
const showQuiz = ref(false)
const currentQ = ref(0)
const selectedAnswer = ref<number | null>(null)
const answered = ref(false)
const correctCount = ref(0)
const showResult = ref(false)
const resultCorrect = ref(false)
const achievements = ref<string[]>([])
const showAchievement = ref(false)
const newAchievement = ref('')
const lessonIndex = ref(0)

async function load() {
  course.value = await learnApi.courseDetail(courseId)
  progress.value = await learnApi.progress()
  if (course.value.lessons.length) {
    lessonIndex.value = 0
    selectLesson(0)
  }
}

function selectLesson(idx: number) {
  if (!course.value) return
  lessonIndex.value = idx
  currentLesson.value = course.value.lessons[idx]
  showQuiz.value = false
  currentQ.value = 0
  selectedAnswer.value = null
  answered.value = false
  correctCount.value = 0
  showResult.value = false
  loadQuizzes()
}

async function loadQuizzes() {
  if (!currentLesson.value) return
  quizzes.value = await learnApi.lessonQuizzes(currentLesson.value.id)
}

function startQuiz() {
  showQuiz.value = true
  currentQ.value = 0
  selectedAnswer.value = null
  answered.value = false
  correctCount.value = 0
}

function selectAnswer(idx: number) {
  if (answered.value) return
  selectedAnswer.value = idx
  answered.value = true
  const q = quizzes.value[currentQ.value]
  if (idx === q.correct) {
    correctCount.value++
    msg.success('答对了！')
  } else {
    msg.error(`答错了，正确答案是：${q.options[q.correct]}`)
  }
}

function nextQuestion() {
  if (currentQ.value < quizzes.value.length - 1) {
    currentQ.value++
    selectedAnswer.value = null
    answered.value = false
  } else {
    finishLesson()
  }
}

async function finishLesson() {
  if (!currentLesson.value) return
  showQuiz.value = false
  const result = await learnApi.completeLesson(currentLesson.value.id)
  progress.value = await learnApi.progress()
  resultCorrect.value = correctCount.value >= Math.ceil(quizzes.value.length / 2)
  showResult.value = true

  if (result.achievements?.length) {
    for (const a of result.achievements) {
      newAchievement.value = a
      showAchievement.value = true
      await new Promise(r => setTimeout(r, 2000))
      showAchievement.value = false
    }
    achievements.value.push(...result.achievements)
  }
}

function nextLesson() {
  showResult.value = false
  if (course.value && lessonIndex.value < course.value.lessons.length - 1) {
    selectLesson(lessonIndex.value + 1)
  } else {
    router.push('/learn')
  }
}

function goBack() {
  router.push('/learn')
}

const lessonProgress = computed(() =>
  course.value ? ((lessonIndex.value + 1) / course.value.lessons.length) * 100 : 0
)

onMounted(load)
</script>

<template>
  <n-space vertical size="large">
    <n-card>
      <n-space align="center" justify="space-between" wrap>
        <n-space align="center">
          <n-button quaternary circle size="small" @click="goBack">
            <template #icon><n-icon><arrow-back /></n-icon></template>
          </n-button>
          <div>
            <n-text strong style="font-size: 16px;">{{ course?.title }} — 第 {{ lessonIndex + 1 }} 课</n-text>
            <div style="margin-top: 4px;">
              <n-progress :percentage="lessonProgress" :height="4" style="width: 200px;" />
            </div>
          </div>
        </n-space>
        <n-space align="center" size="small">
          <n-icon size="18" color="#f0a020"><flash-outline /></n-icon>
          <n-text depth="3">Lv.{{ Math.floor(progress.xp / 100) + 1 }}</n-text>
          <n-text style="color: #f0a020; font-weight: bold;">{{ progress.xp }} XP</n-text>
        </n-space>
      </n-space>
    </n-card>

    <n-card v-if="course" size="small" :bordered="false" embedded>
      <n-space>
        <n-tag v-for="(l, i) in course.lessons" :key="l.id"
          :bordered="false" size="small"
          :type="i === lessonIndex ? 'primary' : 'default'"
          :style="{ cursor: 'pointer' }"
          @click="selectLesson(i)">
          {{ l.title }}
        </n-tag>
      </n-space>
    </n-card>

    <n-card v-if="currentLesson" :bordered="false">
      <video :src="currentLesson.video_url" controls
        style="width: 100%; display: block; max-height: 480px; border-radius: 8px;"
        autoplay>
        您的浏览器不支持视频播放
      </video>
    </n-card>

    <div v-if="quizzes.length && !showQuiz" style="text-align: center; padding: 16px 0;">
      <n-button type="primary" size="large" @click="startQuiz" style="border-radius: 24px;">
        <template #icon><n-icon><star-outline /></n-icon></template>
        开始随堂练 ({{ quizzes.length }} 题)
      </n-button>
    </div>

    <n-modal v-model:show="showQuiz" :mask-closable="false" :closeable="false" transform-origin="center">
      <n-card style="width: 90%; max-width: 500px; border-radius: 16px;" :bordered="false" role="dialog">
        <template v-if="quizzes.length && currentQ < quizzes.length">
          <n-space vertical size="medium">
            <n-space align="center" justify="space-between">
              <n-tag :bordered="false" type="primary" size="small">{{ currentQ + 1 }} / {{ quizzes.length }}</n-tag>
              <n-text depth="3" style="font-size: 13px;">已完成 {{ correctCount }} 题</n-text>
            </n-space>
            <n-progress :percentage="((currentQ + (answered ? 1 : 0)) / quizzes.length) * 100" :height="4" />
            <n-text style="font-size: 17px; font-weight: 600; line-height: 1.5;">
              {{ quizzes[currentQ].question }}
            </n-text>
            <n-space vertical size="small">
              <div v-for="(opt, idx) in quizzes[currentQ].options" :key="idx"
                class="quiz-option"
                :class="{
                  correct: answered && idx === quizzes[currentQ].correct,
                  wrong: answered && idx === selectedAnswer && idx !== quizzes[currentQ].correct,
                  disabled: answered
                }"
                @click="selectAnswer(idx)">
                <span class="option-letter">{{ 'ABCD'[idx] }}</span>
                <span>{{ opt }}</span>
                <span v-if="answered && idx === quizzes[currentQ].correct" class="option-icon">✓</span>
                <span v-if="answered && idx === selectedAnswer && idx !== quizzes[currentQ].correct" class="option-icon">✗</span>
              </div>
            </n-space>
            <div style="text-align: center;">
              <n-button v-if="answered && currentQ < quizzes.length - 1" type="primary" @click="nextQuestion">下一题</n-button>
              <n-button v-if="answered && currentQ >= quizzes.length - 1" type="primary" @click="finishLesson">完成</n-button>
            </div>
          </n-space>
        </template>
      </n-card>
    </n-modal>

    <n-modal v-model:show="showResult" :mask-closable="false" transform-origin="center">
      <n-card style="width: 90%; max-width: 400px; border-radius: 16px; text-align: center;" :bordered="false" role="dialog">
        <n-space vertical size="large">
          <n-text style="font-size: 56px;">{{ resultCorrect ? '🎉' : '💪' }}</n-text>
          <n-text style="font-size: 22px; font-weight: bold;">{{ resultCorrect ? '太棒了！' : '继续加油！' }}</n-text>
          <n-space justify="center" size="large">
            <div style="text-align: center;">
              <n-text style="font-size: 20px; font-weight: bold; color: #18a058;">+10</n-text>
              <div><n-text depth="3" style="font-size: 12px;">XP 获得</n-text></div>
            </div>
            <div style="text-align: center;">
              <n-text style="font-size: 20px; font-weight: bold; color: #2080f0;">{{ correctCount }} / {{ quizzes.length }}</n-text>
              <div><n-text depth="3" style="font-size: 12px;">正确率</n-text></div>
            </div>
            <div style="text-align: center;">
              <n-text style="font-size: 20px; font-weight: bold; color: #f0a020;">{{ progress.streak }} 天</n-text>
              <div><n-text depth="3" style="font-size: 12px;">连续学习</n-text></div>
            </div>
          </n-space>
          <n-button type="primary" size="large" @click="nextLesson" style="border-radius: 24px; width: 100%;">
            {{ lessonIndex < (course?.lessons.length || 1) - 1 ? '下一课 →' : '返回课程列表' }}
          </n-button>
        </n-space>
      </n-card>
    </n-modal>

    <n-modal v-model:show="showAchievement" :mask-closable="false" transform-origin="center">
      <n-card style="width: 90%; max-width: 350px; border-radius: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);" :bordered="false" role="dialog">
        <n-space vertical size="small">
          <n-text style="font-size: 64px;">🏆</n-text>
          <n-text style="font-size: 18px; color: rgba(255,255,255,0.8);">成就解锁！</n-text>
          <n-text style="font-size: 24px; color: #fff; font-weight: bold;">{{ newAchievement }}</n-text>
        </n-space>
      </n-card>
    </n-modal>
  </n-space>
</template>

<style scoped>
.quiz-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.2s;
  font-size: 15px;
}
.quiz-option:hover:not(.disabled) {
  border-color: #2080f0;
  background: #f0f7ff;
}
.quiz-option.correct {
  border-color: #18a058;
  background: #eafff0;
}
.quiz-option.wrong {
  border-color: #d03050;
  background: #fff0f0;
}
.quiz-option.disabled {
  cursor: default;
  opacity: 0.9;
}
.option-letter {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 13px;
  flex-shrink: 0;
}
.quiz-option.correct .option-letter {
  background: #18a058;
  color: #fff;
}
.quiz-option.wrong .option-letter {
  background: #d03050;
  color: #fff;
}
.option-icon {
  margin-left: auto;
  font-weight: bold;
  font-size: 18px;
}
</style>