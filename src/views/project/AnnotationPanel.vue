<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NCard, NInput, NButton, NSpace, NText, NTimeline, NTimelineItem, NEmpty, NIcon, useMessage,
} from 'naive-ui'
import { SendOutline } from '@vicons/ionicons5'
import { fetchAnnotations, createAnnotation } from '../../api/teacher'
import { ApiError } from '../../api/request'
import type { Annotation } from '../../api/types'

const props = defineProps<{
  projectId: string
  isTeacher: boolean
}>()

const message = useMessage()
const annotations = ref<Annotation[]>([])
const content = ref('')
const submitting = ref(false)

async function load() {
  const res = await fetchAnnotations(props.projectId)
  annotations.value = res.items
}

onMounted(load)

async function submit() {
  const text = content.value.trim()
  if (!text) return
  submitting.value = true
  try {
    await createAnnotation(props.projectId, text)
    content.value = ''
    await load()
    message.success('批注已添加')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '添加失败')
  } finally {
    submitting.value = false
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <n-card size="small">
    <template #header>
      <n-space align="center">
        <n-text strong>教师批注与点拨</n-text>
        <n-text depth="3" style="font-size: 12px;">{{ isTeacher ? '在线批注，实时同步给学生' : '教师批注实时同步，请注意查看' }}</n-text>
      </n-space>
    </template>

    <n-space v-if="isTeacher" style="margin-bottom: 16px;">
      <n-input
        v-model:value="content"
        type="textarea"
        :rows="2"
        placeholder="输入批注，为学生提供点拨…"
        @keydown.enter.exact.prevent="submit"
      />
      <n-button type="primary" :loading="submitting" :disabled="!content.trim()" @click="submit">
        <template #icon><n-icon><send-outline /></n-icon></template>
        发送批注
      </n-button>
    </n-space>

    <n-empty v-if="annotations.length === 0" description="暂无批注" />
    <n-timeline v-else>
      <n-timeline-item
        v-for="a in annotations"
        :key="a.id"
        title="王老师"
        :content="a.content"
        :time="formatTime(a.createdAt)"
        type="warning"
      />
    </n-timeline>
  </n-card>
</template>
