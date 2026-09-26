<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NGrid, NGridItem, NButton, NTag, NSpace, NText, NProgress, NEmpty, NAvatar, NIcon,
  NRadioGroup, NRadioButton, useMessage,
} from 'naive-ui'
import { ChevronForwardOutline } from '@vicons/ionicons5'
import { fetchTeacherProjects, fetchTeacherActivity, fetchTeacherStats } from '../api/teacher'
import { ApiError } from '../api/request'
import type { TeacherActivity } from '../api/teacher'
import type { TeacherStatsItem } from '../api/types'
import { fetchGroups } from '../api/group'
import type { Project } from '../api/types'
import type { QuizGroup } from '../api/types'

const router = useRouter()
const message = useMessage()
const projects = ref<Project[]>([])
const groups = ref<QuizGroup[]>([])
const activities = ref<TeacherActivity[]>([])
const stats = ref<TeacherStatsItem[]>([])
const filter = ref('')
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [g, res, act, st] = await Promise.all([
      fetchGroups(),
      fetchTeacherProjects(filter.value || undefined),
      fetchTeacherActivity(),
      fetchTeacherStats(),
    ])
    groups.value = g.items
    projects.value = res.items
    activities.value = act.items
    stats.value = st.items
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '团队数据加载失败')
  } finally {
    loading.value = false
  }
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

const ACTIVITY_EMOJI: Record<string, string> = { quiz: '⚔️', focus: '🍅' }

function changeFilter(v: string) {
  filter.value = v
  load()
}

onMounted(load)

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const activeCount = () => projects.value.filter((p) => p.status === 'active').length

const AVATAR_COLORS = ['#18a058', '#2080f0', '#f0a020', '#e88080', '#8a7ff0', '#0f9f9f', '#d03050']

function avatarColor(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 997
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
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
      <n-radio-group :value="filter" style="margin-top: 12px;" @update:value="changeFilter">
        <n-radio-button value="">全部</n-radio-button>
        <n-radio-button v-for="g in groups" :key="g.id" :value="g.id">👥 {{ g.name }}</n-radio-button>
      </n-radio-group>
    </n-card>

    <n-empty v-if="!loading && projects.length === 0" description="暂无项目" />

    <n-card size="small" title="📡 最近动态">
      <n-empty v-if="activities.length === 0" description="最近还没有学生动态" style="padding: 16px 0;" />
      <div v-for="(a, i) in activities" :key="i" class="activity-row">
        <span class="activity-emoji">{{ ACTIVITY_EMOJI[a.type] ?? '✨' }}</span>
        <span class="activity-name">{{ a.name }}</span>
        <span class="activity-text">{{ a.text }}</span>
        <span class="activity-time">{{ relativeTime(a.createdAt) }}</span>
      </div>
    </n-card>

    <n-card size="small" title="📊 团队任务分布" :loading="loading">
      <n-empty v-if="!loading && stats.length === 0" description="暂无项目数据" size="small" style="padding: 16px 0;" />
      <div
        v-for="s in stats"
        :key="s.id"
        style="display: flex; align-items: center; gap: 12px; padding: 8px 0; flex-wrap: wrap;"
      >
        <span style="width: 180px; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ s.name }}</span>
        <div style="flex: 1; min-width: 160px; height: 10px; display: flex; border-radius: 5px; overflow: hidden; background: rgba(128,128,128,0.15);">
          <span :style="{ flex: s.todo, background: 'rgba(128,128,128,0.5)' }" :title="`待认领 ${s.todo}`" />
          <span :style="{ flex: s.doing, background: '#f0a020' }" :title="`进行中 ${s.doing}`" />
          <span :style="{ flex: s.review, background: '#2080f0' }" :title="`待验收 ${s.review}`" />
          <span :style="{ flex: s.done, background: '#18a058' }" :title="`已完成 ${s.done}`" />
        </div>
        <span style="font-size: 12px; opacity: 0.75; white-space: nowrap;">
          ✅ {{ s.done }}/{{ s.taskTotal }} · 🍅 {{ s.focusMinutes }}min · 👥 {{ s.memberCount }} · ✍️ {{ s.checkinCount }}
        </span>
      </div>
    </n-card>

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

<style scoped>
.activity-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13px;
}

.activity-row:hover {
  background: rgba(128, 128, 128, 0.08);
}

.activity-emoji {
  font-size: 15px;
}

.activity-name {
  font-weight: 700;
}

.activity-text {
  flex: 1;
  opacity: 0.85;
}

.activity-time {
  font-size: 12px;
  opacity: 0.55;
  white-space: nowrap;
}
</style>
