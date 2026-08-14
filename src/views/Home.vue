<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NGrid, NGridItem, NButton, NProgress, NTag, NSpace, NText, NStatistic, NIcon, NEmpty, useMessage,
} from 'naive-ui'
import {
  RocketOutline, CompassOutline, TimerOutline, SchoolOutline, ChevronForwardOutline, TrophyOutline, AlbumsOutline,
} from '@vicons/ionicons5'
import { useAuthStore } from '../stores/auth'
import { fetchProjects } from '../api/project'
import { fetchFocusStats } from '../api/focus'
import { fetchMyInvites, respondInvite } from '../api/group'
import { ApiError } from '../api/request'
import type { FocusStats, Project, StudentInvite } from '../api/types'

const router = useRouter()
const message = useMessage()
const auth = useAuthStore()

const projects = ref<Project[]>([])
const stats = ref<FocusStats | null>(null)
const loading = ref(true)

const invites = ref<StudentInvite[]>([])
const respondingId = ref<string | null>(null)

async function loadInvites() {
  try {
    const i = await fetchMyInvites()
    invites.value = i.items
  } catch {
    /* ignore */
  }
}

async function respond(iv: StudentInvite, accept: boolean) {
  respondingId.value = iv.id
  try {
    await respondInvite(iv.id, accept)
    message.success(accept ? `已加入「${iv.groupName}」` : '已拒绝邀请')
    await loadInvites()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '操作失败')
  } finally {
    respondingId.value = null
  }
}

onMounted(async () => {
  try {
    const [proj, focus] = await Promise.all([fetchProjects(), fetchFocusStats(7)])
    projects.value = proj.items
    stats.value = focus
  } finally {
    loading.value = false
  }
  if (!auth.isTeacher) loadInvites()
})

const quickLinks = [
  { label: '课题与项目', desc: '浏览课题、发起项目、组建小队', to: '/projects', icon: RocketOutline },
  { label: '资源库', desc: '跨学科资源导航与动态反馈', to: '/resources', icon: CompassOutline },
  { label: '闯关', desc: '答题闯关，边玩边学涨知识', to: '/quiz', icon: TrophyOutline },
  { label: '专注', desc: '番茄钟 + 白板，沉浸式学习', to: '/focus', icon: TimerOutline },
]

const teacherLinks = [
  { label: '团队总览', desc: '实时查看各组进度与动态', to: '/teacher', icon: SchoolOutline },
  { label: '题库管理', desc: '分组维护闯关题库与成员', to: '/groups', icon: AlbumsOutline },
  { label: '课题与项目', desc: '浏览课题与项目档案', to: '/projects', icon: RocketOutline },
]

const links = auth.isTeacher ? teacherLinks : quickLinks

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}
</script>

<template>
  <n-space vertical size="large">
    <n-card>
      <n-space align="center" justify="space-between" wrap>
        <div>
          <n-text style="font-size: 22px; font-weight: 600;">{{ greeting() }}，{{ auth.user?.name }}</n-text>
          <div style="margin-top: 6px;">
            <n-text depth="3">{{ auth.isTeacher ? '欢迎回到教师工作台，查看学生团队的实时进度。' : '欢迎回到「智创方舟 InnoArk」，今天也一起向星际出发吧。' }}</n-text>
          </div>
        </div>
        <n-space v-if="!auth.isTeacher" size="large">
          <n-statistic label="今日专注" :value="stats?.today.minutes ?? 0" suffix="分钟" />
          <n-statistic label="进行中项目" :value="projects.filter((p) => p.status === 'active').length" suffix="个" />
        </n-space>
      </n-space>
    </n-card>

    <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
      <n-grid-item v-for="link in links" :key="link.to" span="4 s:2 m:1">
        <n-card hoverable size="small" @click="router.push(link.to)" style="cursor: pointer;">
          <n-space align="center" justify="space-between">
            <n-space align="center">
              <n-icon size="28" color="#18a058"><component :is="link.icon" /></n-icon>
              <div>
                <n-text strong>{{ link.label }}</n-text>
                <div><n-text depth="3" style="font-size: 12px;">{{ link.desc }}</n-text></div>
              </div>
            </n-space>
            <n-icon size="16" depth="3"><chevron-forward-outline /></n-icon>
          </n-space>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-card v-if="!auth.isTeacher && invites.length > 0" title="邀请通知">
      <n-space vertical size="small">
        <div v-for="iv in invites" :key="iv.id" class="group-row">
          <n-text style="font-size: 13px;">「{{ iv.inviterName }}」邀请你加入「{{ iv.groupName }}」</n-text>
          <n-button size="small" type="primary" :loading="respondingId === iv.id" @click="respond(iv, true)">通过</n-button>
          <n-button size="small" :disabled="respondingId === iv.id" @click="respond(iv, false)">拒绝</n-button>
        </div>
        <n-button text type="primary" size="small" style="justify-content: flex-start;" @click="router.push('/my-groups')">
          查看我的分组 →
        </n-button>
      </n-space>
    </n-card>

    <n-card title="我的项目" :loading="loading">
      <template #header-extra>
        <n-button text type="primary" @click="router.push('/projects')">全部项目 <n-icon><chevron-forward-outline /></n-icon></n-button>
      </template>
      <n-empty v-if="!loading && projects.length === 0" description="还没有参与的项目，去课题库发起一个吧" style="padding: 24px 0;">
        <template #extra>
          <n-button type="primary" @click="router.push('/projects')">浏览课题</n-button>
        </template>
      </n-empty>
      <n-space v-else vertical size="small">
        <n-card v-for="p in projects" :key="p.id" size="small" hoverable @click="router.push(`/project/${p.id}`)" style="cursor: pointer;">
          <n-space align="center" justify="space-between" wrap>
            <n-space align="center">
              <n-text strong>{{ p.name }}</n-text>
              <n-tag size="small" :type="p.status === 'finished' ? 'default' : 'success'" :bordered="false">
                {{ p.status === 'finished' ? '已结题' : '进行中' }}
              </n-tag>
              <n-text depth="3" style="font-size: 12px;">{{ p.topic?.title }}</n-text>
            </n-space>
            <n-space align="center">
              <n-text depth="3" style="font-size: 12px;">{{ p.members.length }}/4 人</n-text>
              <n-progress type="line" :percentage="p.progress.total === 0 ? 0 : Math.round((p.progress.done / p.progress.total) * 100)" :height="8" style="width: 160px;" />
              <n-tag size="small" :type="p.status === 'finished' ? 'info' : 'primary'" :bordered="false">
                {{ p.progress.done }}/{{ p.progress.total }} 任务
              </n-tag>
            </n-space>
          </n-space>
        </n-card>
      </n-space>
    </n-card>
  </n-space>
</template>

<style scoped>
.group-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
