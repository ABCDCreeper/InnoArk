<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NGrid, NGi, NTag, NProgress, NIcon, NText, NSpace, NStatistic, NEmpty, NTabs, NTabPane,
} from 'naive-ui'
import {
  StarOutline, TrophyOutline,
} from '@vicons/ionicons5'
import { learnApi } from '../api/learn'
import type { Course, Progress } from '../api/learn'

const router = useRouter()
const courses = ref<Course[]>([])
const progress = ref<Progress>({ xp: 0, points: 0, streak: 0, total_courses: 0 })
const achievements = ref<string[]>([])
const activeCategory = ref('')
const loading = ref(true)

const categories = ['数学', '英语', '科学', '编程', '历史', '地理']

const filteredCourses = computed(() =>
  activeCategory.value ? courses.value.filter(c => c.category === activeCategory.value) : courses.value
)

const level = computed(() => Math.floor(progress.value.xp / 100) + 1)
const nextLevelXp = computed(() => level.value * 100)
const levelProgress = computed(() => progress.value.xp / nextLevelXp.value)

async function load() {
  loading.value = true
  try {
    courses.value = await learnApi.courses()
    progress.value = await learnApi.progress()
    achievements.value = (await learnApi.achievements()).map(a => a.name)
  } finally {
    loading.value = false
  }
}

function goCourse(id: number) {
  router.push(`/learn/${id}`)
}

onMounted(load)
</script>

<template>
  <n-space vertical size="large">
    <n-card>
      <n-space align="center" justify="space-between" wrap>
        <n-space align="center" size="large">
          <n-icon size="44" color="#f0a020"><trophy-outline /></n-icon>
          <div style="min-width: 180px;">
            <n-text style="font-size: 20px; font-weight: 600;">Lv.{{ level }} 学习者</n-text>
            <div style="margin-top: 6px;">
              <n-space align="center">
                <n-text depth="3" style="font-size: 13px;">{{ progress.xp }} / {{ nextLevelXp }} XP</n-text>
                <n-progress :percentage="levelProgress * 100" :height="8" style="width: 120px;" />
              </n-space>
            </div>
          </div>
        </n-space>
        <n-space size="large">
          <n-statistic label="连续学习" :value="progress.streak" suffix="天" />
          <n-statistic label="已完成" :value="progress.total_courses" suffix="课" />
        </n-space>
      </n-space>
    </n-card>

    <n-card v-if="achievements.length" size="small" :bordered="false" embedded>
      <n-space align="center">
        <n-icon size="20" color="#f0a020"><star-outline /></n-icon>
        <n-tag v-for="a in achievements" :key="a" size="small" :bordered="false" type="warning">
          {{ a }}
        </n-tag>
      </n-space>
    </n-card>

    <n-tabs v-model:value="activeCategory" type="line" animated>
      <n-tab-pane name="" tab="全部" />
      <n-tab-pane v-for="cat in categories" :key="cat" :name="cat" :tab="cat" />
    </n-tabs>

    <template v-if="filteredCourses.length">
      <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <n-gi v-for="course in filteredCourses" :key="course.id" span="4 s:2 m:1">
          <n-card hoverable size="small" @click="goCourse(course.id)" style="cursor: pointer;">
            <n-space vertical size="small">
              <div style="font-size: 36px; text-align: center; padding: 12px 0; background: #f5f7fa; border-radius: 8px;">
                {{ course.cover }}
              </div>
              <n-text strong style="font-size: 15px;">{{ course.title }}</n-text>
              <n-text depth="3" style="font-size: 12px; line-height: 1.4;">{{ course.description }}</n-text>
              <n-space align="center" wrap>
                <n-tag size="small" :bordered="false">{{ course.category }}</n-tag>
                <n-text depth="3" style="font-size: 12px;">{{ course.lesson_count }} 课时</n-text>
                <n-text style="font-size: 12px; color: #f0a020; font-weight: bold;">+{{ course.xp_reward }} XP</n-text>
              </n-space>
            </n-space>
          </n-card>
        </n-gi>
      </n-grid>
    </template>
    <n-empty v-else description="暂无课程" style="padding: 48px 0;" />
  </n-space>
</template>