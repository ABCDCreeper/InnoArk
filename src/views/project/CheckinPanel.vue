<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NCard, NInput, NButton, NSpace, NText, NTag, NTimeline, NTimelineItem, NGrid, NGridItem,
  NEmpty, NIcon, useMessage,
} from 'naive-ui'
import { SendOutline } from '@vicons/ionicons5'
import { fetchCheckins, createCheckin, fetchFeedbacks } from '../../api/resource'
import { ApiError } from '../../api/request'
import type { Checkin, Feedback } from '../../api/types'

const props = defineProps<{
  projectId: string
  editable: boolean
  members: Array<{ id: string; name: string }>
}>()

const message = useMessage()
const checkins = ref<Checkin[]>([])
const feedbacks = ref<Feedback[]>([])
const content = ref('')
const submitting = ref(false)

async function load() {
  const [c, f] = await Promise.all([fetchCheckins(props.projectId), fetchFeedbacks(props.projectId)])
  checkins.value = c.items
  feedbacks.value = f.items
}

onMounted(load)

const nameOf = (userId: string) => props.members.find((m) => m.id === userId)?.name ?? '成员'

async function submit() {
  const text = content.value.trim()
  if (!text) return
  submitting.value = true
  try {
    await createCheckin(props.projectId, text)
    content.value = ''
    await load()
    message.success('打卡成功，系统反馈已生成')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '打卡失败')
  } finally {
    submitting.value = false
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const feedbackType = (f: Feedback) => (f.type === 'milestone' ? 'success' : 'info') as 'success' | 'info'
const feedbackLabel = (f: Feedback) => (f.type === 'milestone' ? '里程碑' : '思路引导')
</script>

<template>
  <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
    <n-grid-item span="2 m:1">
      <n-card title="每日打卡" size="small">
        <template #header-extra>
          <n-text depth="3" style="font-size: 12px;">共 {{ checkins.length }} 次打卡</n-text>
        </template>
        <n-space v-if="editable" style="margin-bottom: 16px;">
          <n-input
            v-model:value="content"
            type="textarea"
            :rows="2"
            placeholder="今天完成了什么？遇到了什么困难？"
            @keydown.enter.exact.prevent="submit"
          />
          <n-button type="primary" :loading="submitting" :disabled="!content.trim()" @click="submit">
            <template #icon><n-icon><send-outline /></n-icon></template>
            打卡
          </n-button>
        </n-space>
        <n-empty v-if="checkins.length === 0" description="暂无打卡记录" />
        <n-timeline v-else>
          <n-timeline-item
            v-for="c in checkins"
            :key="c.id"
            :title="nameOf(c.userId)"
            :content="c.content"
            :time="formatTime(c.createdAt)"
            type="success"
          />
        </n-timeline>
      </n-card>
    </n-grid-item>

    <n-grid-item span="2 m:1">
      <n-card title="系统动态反馈" size="small">
        <template #header-extra>
          <n-text depth="3" style="font-size: 12px;">完成里程碑自动生成</n-text>
        </template>
        <n-empty v-if="feedbacks.length === 0" description="暂无反馈" />
        <n-space vertical v-else size="small">
          <n-card v-for="f in feedbacks" :key="f.id" size="small" :bordered="false" style="background: rgba(24,160,88,0.06);">
            <n-space align="center" justify="space-between">
              <n-tag size="tiny" :type="feedbackType(f)" :bordered="false">{{ feedbackLabel(f) }}</n-tag>
              <n-text depth="3" style="font-size: 11px;">{{ formatTime(f.createdAt) }}</n-text>
            </n-space>
            <n-text style="font-size: 13px; line-height: 1.7; display: block; margin-top: 6px;">{{ f.content }}</n-text>
          </n-card>
        </n-space>
      </n-card>
    </n-grid-item>
  </n-grid>
</template>
