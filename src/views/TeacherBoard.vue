<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NGrid, NGridItem, NButton, NTag, NSpace, NText, NProgress, NEmpty, NAvatarGroup, NIcon,
} from 'naive-ui'
import { ChevronForwardOutline } from '@vicons/ionicons5'
import { fetchTeacherProjects } from '../api/teacher'
import type { Project } from '../api/types'

const router = useRouter()
const projects = ref<Project[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetchTeacherProjects()
    projects.value = res.items
  } finally {
    loading.value = false
  }
})

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const activeCount = () => projects.value.filter((p) => p.status === 'active').length
</script>

<template>
  <n-space vertical size="large">
    <n-card>
      <n-space align="center" justify="space-between" wrap>
        <div>
          <n-text style="font-size: 20px; font-weight: 600;">团队总览</n-text>
          <div style="margin-top: 4px;"><n-text depth="3">实时查看各组进度与最新动态，点击进入项目进行在线批注与点拨。</n-text></div>
        </div>
        <n-space>
          <n-tag size="large" :bordered="false" type="success">进行中 {{ activeCount() }}</n-tag>
          <n-tag size="large" :bordered="false" type="default">已结题 {{ projects.length - activeCount() }}</n-tag>
        </n-space>
      </n-space>
    </n-card>

    <n-empty v-if="!loading && projects.length === 0" description="暂无项目" />

    <n-grid :cols="3" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
      <n-grid-item v-for="p in projects" :key="p.id" span="3 m:1">
        <n-card size="small" hoverable @click="router.push(`/project/${p.id}`)" style="cursor: pointer; height: 100%;">
          <n-space vertical>
            <n-space align="center" justify="space-between">
              <n-text strong>{{ p.name }}</n-text>
              <n-tag size="small" :type="p.status === 'finished' ? 'default' : 'success'" :bordered="false">
                {{ p.status === 'finished' ? '已结题' : '进行中' }}
              </n-tag>
            </n-space>
            <n-text depth="3" style="font-size: 12px;">{{ p.topic?.title }}</n-text>
            <n-progress type="line" :percentage="p.progress.total === 0 ? 0 : Math.round((p.progress.done / p.progress.total) * 100)" :height="10" />
            <n-space align="center" justify="space-between">
              <n-avatar-group :options="p.members.map((m) => ({ name: m.name, src: '' }))" :size="24" />
              <n-text depth="3" style="font-size: 12px;">最近更新 {{ formatTime(p.updatedAt) }}</n-text>
            </n-space>
            <n-button size="small" type="primary" ghost block @click.stop="router.push(`/project/${p.id}`)" style="display: flex; justify-content: space-between; align-items: center;">
              查看项目 <n-icon size="14"><chevron-forward-outline /></n-icon>
            </n-button>
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
