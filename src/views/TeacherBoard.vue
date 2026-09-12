<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NGrid, NGridItem, NButton, NTag, NSpace, NText, NProgress, NEmpty, NAvatar, NIcon,
  NRadioGroup, NRadioButton, NTable, useMessage,
} from 'naive-ui'
import { ChevronForwardOutline } from '@vicons/ionicons5'
import { fetchTeacherProjects } from '../api/teacher'
import { fetchTeacherAnalytics } from '../api/insights'
import { fetchGroups } from '../api/group'
import { useAsyncTask } from '../composables/useAsyncTask'
import { avatarColor, formatTime } from '../utils/format'
import type { Project, TeacherAnalytics } from '../api/types'
import type { QuizGroup } from '../api/types'

const router = useRouter()
const message = useMessage()
const projects = ref<Project[]>([])
const groups = ref<QuizGroup[]>([])
const filter = ref('')

const { loading, run } = useAsyncTask(message, '团队总览加载失败')

// 组筛选连点时只有最后一次的结果会被采纳（useAsyncTask 内做过期响应守卫）
function load() {
  return run(
    async () => {
      const g = await fetchGroups()
      const res = await fetchTeacherProjects(filter.value || undefined)
      return [g.items, res.items] as const
    },
    ([groupItems, projectItems]) => {
      groups.value = groupItems
      projects.value = projectItems
    },
  )
}

// 教学总览：把单项目的过程评价聚合到课堂层面，先看哪些项目需要干预
const analytics = ref<TeacherAnalytics | null>(null)
const showAnalytics = ref(false)

async function loadAnalytics() {
  try {
    analytics.value = await fetchTeacherAnalytics()
  } catch {
    analytics.value = null
  }
}

function openProject(id: string) {
  router.push(`/project/${id}?tab=assessment`)
}

function changeFilter(v: string) {
  filter.value = v
  load()
}

onMounted(() => {
  load()
  void loadAnalytics()
})



const activeCount = () => projects.value.filter((p) => p.status === 'active').length


</script>

<template>
  <n-space vertical size="large">
    <n-card v-if="analytics && analytics.total" title="教学总览">
      <template #header-extra>
        <n-space align="center" size="small">
          <n-tag size="small" :bordered="false" :type="analytics.withRisks ? 'warning' : 'success'">
            {{ analytics.withRisks }} 个项目有需处理的风险
          </n-tag>
          <n-button size="tiny" text type="primary" @click="showAnalytics = !showAnalytics">
            {{ showAnalytics ? '收起' : '展开' }}
          </n-button>
        </n-space>
      </template>
      <n-text depth="3" style="font-size: 12px; display: block; margin-bottom: 12px;">
        按项目汇总过程评价：先看哪些项目需要课堂干预。点击进入该项目的评价页。
      </n-text>
      <n-table v-if="showAnalytics" :bordered="false" size="small">
        <thead>
          <tr><th>项目</th><th>完成</th><th>逾期</th><th>待验收</th><th>活跃成员</th><th>主要风险</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in analytics.items" :key="row.project.id" style="cursor: pointer;" @click="openProject(row.project.id)">
            <td>
              <n-space align="center" size="small">
                <n-text>{{ row.project.name }}</n-text>
                <n-tag v-if="row.warningCount" size="tiny" :bordered="false" type="warning">需处理 {{ row.warningCount }}</n-tag>
              </n-space>
            </td>
            <td>{{ row.summary.done }} / {{ row.summary.total }}</td>
            <td>{{ row.summary.overdue }}</td>
            <td>{{ row.summary.review }}</td>
            <td>{{ row.activeMembers }} / {{ row.memberCount }}</td>
            <td>
              <n-text depth="3" style="font-size: 12px;">
                {{ row.topRisks.map(r => r.title).join('、') || '无' }}
              </n-text>
            </td>
          </tr>
        </tbody>
      </n-table>
    </n-card>

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
      <n-radio-group :value="filter" style="margin-top: 12px;" @update:value="changeFilter">
        <n-radio-button value="">全部</n-radio-button>
        <n-radio-button v-for="g in groups" :key="g.id" :value="g.id">👥 {{ g.name }}</n-radio-button>
      </n-radio-group>
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
            <n-space align="center" size="small">
              <n-tag v-if="p.group" size="small" :bordered="false" type="info">👥 {{ p.group.name }}</n-tag>
              <n-tag v-else size="small" :bordered="false" type="default">公共项目</n-tag>
            </n-space>
            <n-progress type="line" :percentage="p.progress.total === 0 ? 0 : Math.round((p.progress.done / p.progress.total) * 100)" :height="10" />
            <n-space align="center" justify="space-between">
              <div class="member-avatars">
                <n-avatar v-for="m in p.members" :key="m.id" round :size="24" :style="{ backgroundColor: avatarColor(m.name), color: '#fff' }">
                  {{ m.name.charAt(0) }}
                </n-avatar>
              </div>
              <n-text depth="3" style="font-size: 12px;">最近更新 {{ formatTime(p.updatedAt) }}</n-text>
            </n-space>
            <n-space justify="end">
              <n-button size="small" type="primary" ghost @click.stop="router.push(`/project/${p.id}`)">
                查看项目 <n-icon size="14"><chevron-forward-outline /></n-icon>
              </n-button>
            </n-space>
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
