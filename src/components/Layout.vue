<script setup lang="ts">
import { computed, h, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Component } from 'vue'
import {
  NLayout, NLayoutHeader, NLayoutSider, NLayoutContent, NLayoutFooter,
  NMenu, NText, NIcon, NButton, NTag, NAvatar, NSpace, NPopover, NDrawer, NDrawerContent, NBadge,
  NModal, NInput, useMessage, useNotification,
} from 'naive-ui'
import {
  HomeOutline as HomeIcon,
  RocketOutline as RocketIcon,
  CompassOutline as CompassIcon,
  TimerOutline as TimerIcon,
  SchoolOutline as SchoolIcon,
  SettingsOutline as SettingsIcon,
  InformationCircleOutline as AboutIcon,
  PersonCircleOutline as PersonIcon,
  LogOutOutline as LogOutIcon,
  MenuOutline as MenuIcon,
  TrophyOutline as TrophyIcon,
  AlbumsOutline as AlbumsIcon,
  PeopleOutline as PeopleIcon,
  BulbOutline as LearnIcon,
  StatsChartOutline as StatsIcon,
  NotificationsOutline as BellIcon,
  MedalOutline as MedalIcon,
} from '@vicons/ionicons5'

import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotifyStore } from '../stores/notify'
import { usePomodoroStore } from '../stores/pomodoro'
import { useGrowthStore } from '../stores/growth'
import { useSettingsStore } from '../stores/settings'
import { createFocusSession } from '../api/focus'
import { fetchProjects } from '../api/project'
import { fetchResources } from '../api/resource'
import type { Project, Resource } from '../api/types'
import FloatingPomodoro from './FloatingPomodoro.vue'
import AiAssistant from './AiAssistant.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notify = useNotifyStore()
const message = useMessage()
const notification = useNotification()
const settings = useSettingsStore()

// —— 健康提醒 ——
// 学习是全局体验：连续使用达到设定时长后应弹通知提醒休息，
// 而不是只在专注页有效；开关或间隔变化时重新布防定时器
let healthTimer: number | null = null

function stopHealthTimer() {
  if (healthTimer !== null) {
    window.clearInterval(healthTimer)
    healthTimer = null
  }
}

function armHealthTimer() {
  stopHealthTimer()
  if (!settings.healthReminder) return
  const ms = Math.max(1, settings.healthIntervalMin) * 60000
  healthTimer = window.setInterval(() => {
    notification.warning({
      title: '健康提醒',
      content: `你已经连续学习 ${settings.healthIntervalMin} 分钟啦，起来活动一下、看看远处吧 👀`,
      duration: 8000,
    })
  }, ms)
}

watch(() => [settings.healthReminder, settings.healthIntervalMin], armHealthTimer)

// 番茄钟是全局组件，完成事件必须在这里消费（而不是只在 Focus 页），
// 否则用户切走页面后完成的专注记录会被静默丢弃。
const pomodoro = usePomodoroStore()
const growth = useGrowthStore()

watch(() => pomodoro.sessionCompleted, (completed) => {
  if (!completed) return
  createFocusSession(completed.minutes, completed.mode)
    .then(() => {
      message.success(completed.mode === 'focus' ? '完成一个番茄钟，休息一下吧！' : '休息结束，继续加油！')
      growth.refreshTasks()
    })
    .catch(() => message.error('专注记录上传失败'))
    .finally(() => {
      pomodoro.sessionCompleted = null
    })
}, { immediate: true })

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openNotify(item: { id: string; to?: string }) {
  notify.markRead(item.id)
  if (item.to) router.push(item.to)
}

interface MenuDef { key: string; title: string; icon: Component }

const studentMenu: MenuDef[] = [
  { key: '/', title: '首页', icon: HomeIcon },
  { key: '/projects', title: '项目', icon: RocketIcon },
  { key: '/resources', title: '资源库', icon: CompassIcon },
  { key: '/quiz', title: '闯关', icon: TrophyIcon },
  { key: '/leaderboard', title: '排行榜', icon: MedalIcon },
  { key: '/learn', title: '学习天地', icon: LearnIcon },
  { key: '/profile', title: '成长档案', icon: StatsIcon },
  { key: '/my-groups', title: '我的分组', icon: PeopleIcon },
  { key: '/focus', title: '专注', icon: TimerIcon },
  { key: '/settings', title: '设置', icon: SettingsIcon },
  { key: '/about', title: '关于', icon: AboutIcon },
]

const teacherMenu: MenuDef[] = [
  { key: '/', title: '首页', icon: HomeIcon },
  { key: '/teacher', title: '团队总览', icon: SchoolIcon },
  { key: '/groups', title: '题库管理', icon: AlbumsIcon },
  { key: '/leaderboard', title: '排行榜', icon: MedalIcon },
  { key: '/learn', title: '学习天地', icon: LearnIcon },
  { key: '/profile', title: '成长档案', icon: StatsIcon },
  { key: '/projects', title: '项目', icon: RocketIcon },
  { key: '/settings', title: '设置', icon: SettingsIcon },
  { key: '/about', title: '关于', icon: AboutIcon },
]

const managerMenu: MenuDef[] = [
  { key: '/', title: '首页', icon: HomeIcon },
  { key: '/admin/users', title: '用户管理', icon: PeopleIcon },
  { key: '/groups', title: '题库管理', icon: AlbumsIcon },
  { key: '/leaderboard', title: '排行榜', icon: MedalIcon },
  { key: '/learn', title: '学习天地', icon: LearnIcon },
  { key: '/profile', title: '成长档案', icon: StatsIcon },
  { key: '/teacher', title: '团队总览', icon: SchoolIcon },
  { key: '/projects', title: '项目', icon: RocketIcon },
  { key: '/settings', title: '设置', icon: SettingsIcon },
  { key: '/about', title: '关于', icon: AboutIcon },
]

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const fullOptions = computed(() => {
  const defs = auth.isManager ? managerMenu : auth.isTeacher ? teacherMenu : studentMenu
  return defs.map((d) => ({ key: d.key, icon: renderIcon(d.icon), label: () => h(RouterLink, { to: d.key }, { default: () => d.title }) }))
})

const menuKey = computed(() => {
  if (route.path.startsWith('/project/')) return '/projects'
  return route.path
})

const ROLE_LABEL: Record<string, string> = {
  superadmin: '超级管理员',
  admin: '管理员',
  schooladmin: '校管理员',
  teacher: '教师',
  student: '学生',
}
const roleLabel = computed(() => ROLE_LABEL[auth.user?.role ?? ''] ?? '')
const roleType = computed(() => {
  const role = auth.user?.role
  if (role === 'superadmin') return 'error'
  if (role === 'admin') return 'warning'
  if (role === 'schooladmin') return 'info'
  return auth.isTeacher ? 'success' : 'default'
})

const handleLogout = async () => {
  await auth.logout()
  router.push('/login')
}

const isMobile = ref(false)
const mobileMenuOpen = ref(false)
const siderCollapsed = ref(false)

const showCmd = ref(false)
const cmdQuery = ref('')
const cmdProjects = ref<Project[]>([])
const cmdResources = ref<Resource[]>([])

const allPages = computed(() => (auth.isManager ? managerMenu : auth.isTeacher ? teacherMenu : studentMenu))

const cmdPages = computed(() => {
  const q = cmdQuery.value.trim().toLowerCase()
  if (!q) return allPages.value.slice(0, 8)
  return allPages.value.filter((d) => d.title.toLowerCase().includes(q) || d.key.toLowerCase().includes(q))
})

const cmdProjectHits = computed(() => {
  const q = cmdQuery.value.trim().toLowerCase()
  if (!q) return []
  return cmdProjects.value.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5)
})

function openCmd() {
  showCmd.value = true
  if (cmdProjects.value.length === 0) {
    fetchProjects().then((r) => { cmdProjects.value = r.items }).catch(() => { /* 面板里项目组直接为空 */ })
  }
}

function goCmd(to: string) {
  showCmd.value = false
  cmdQuery.value = ''
  router.push(to)
}

function onCmdEnter() {
  if (cmdPages.value[0]) goCmd(cmdPages.value[0].key)
  else if (cmdProjectHits.value[0]) goCmd(`/project/${cmdProjectHits.value[0].id}`)
  else goCmd('/resources')
}

function onCmdKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    openCmd()
  }
}

let cmdDebounce: number | null = null
watch(cmdQuery, (q) => {
  if (cmdDebounce !== null) clearTimeout(cmdDebounce)
  cmdDebounce = window.setTimeout(() => {
    const kw = q.trim()
    if (!kw) {
      cmdResources.value = []
      return
    }
    fetchResources({ keyword: kw }).then((r) => { cmdResources.value = r.items }).catch(() => { cmdResources.value = [] })
  }, 250)
})

function updateViewport() {
  isMobile.value = window.innerWidth < 768
}

function onResize() { updateViewport() }
onMounted(() => {
  updateViewport()
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onCmdKeydown)
  armHealthTimer()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onCmdKeydown)
  if (cmdDebounce !== null) clearTimeout(cmdDebounce)
  stopHealthTimer()
})
</script>

<template>
  <n-layout style="height: 100vh;" content-style="padding: 12px; display: flex; flex-direction: column; gap: 12px;">
    <n-layout-header bordered class="app-header">
      <n-button v-if="isMobile" quaternary size="small" @click="mobileMenuOpen = true">
        <template #icon><n-icon size="22"><menu-icon /></n-icon></template>
      </n-button>
      <div class="app-logo">
        <span class="logo-text">InnoArk</span>
      </div>

      <div class="header-user-area">
        <n-popover trigger="click" :width="330">
          <template #trigger>
            <n-badge :value="notify.unread" :max="99">
              <n-button quaternary circle size="small" aria-label="消息中心">
                <template #icon><n-icon size="20"><bell-icon /></n-icon></template>
              </n-button>
            </n-badge>
          </template>
          <div class="notify-head">
            <span class="notify-title">🔔 消息中心</span>
            <n-button quaternary size="tiny" :disabled="notify.unread === 0" @click="notify.markAllRead()">
              全部已读
            </n-button>
          </div>
          <div v-if="notify.items.length === 0" class="notify-empty">暂无消息，去学习赚点高光时刻吧！</div>
          <div
            v-for="item in notify.items"
            :key="item.id"
            class="notify-item"
            :class="{ unread: !item.read }"
            @click="openNotify(item)"
          >
            <span class="notify-text">{{ item.text }}</span>
            <span class="notify-time">{{ formatTime(item.time) }}</span>
          </div>
        </n-popover>

        <n-popover trigger="click">
          <template #trigger>
            <div class="user-trigger">
              <n-avatar round size="small" :style="{ backgroundColor: auth.isTeacher ? '#f0a020' : '#18a058' }">
                <n-icon><person-icon /></n-icon>
              </n-avatar>
              <span class="user-name">{{ auth.user?.name }}</span>
              <n-tag size="small" :type="roleType" :bordered="false">{{ roleLabel }}</n-tag>
            </div>
          </template>
          <n-space vertical>
            <n-text depth="3">账号：{{ auth.user?.username }}</n-text>
            <n-button quaternary type="error" size="small" @click="handleLogout">
              <template #icon><n-icon><log-out-icon /></n-icon></template>
              退出登录
            </n-button>
          </n-space>
        </n-popover>
      </div>
    </n-layout-header>

    <n-layout has-sider style="flex: 1; min-height: 0; gap: 12px;">
      <n-layout-sider v-if="!isMobile" bordered collapse-mode="width" :collapsed-width="64" :width="220" show-trigger v-model:collapsed="siderCollapsed" class="app-sider">
        <n-menu :value="menuKey" :options="fullOptions" :collapsed="siderCollapsed" :collapsed-width="64" :collapsed-icon-size="20" />
      </n-layout-sider>

      <n-layout-content content-style="padding: 16px; overflow-y: auto;">
        <router-view />
      </n-layout-content>
    </n-layout>

    <n-layout-footer bordered class="app-footer" style="height: 50px; display: flex; align-items: center; justify-content: center;">
      <n-text depth="3" style="font-size: 12px;">© 2026 智创方舟 InnoArk</n-text>
    </n-layout-footer>
  </n-layout>

  <n-drawer v-model:show="mobileMenuOpen" :width="260" placement="left">
    <n-drawer-content :title="'菜单'">
      <n-menu :value="menuKey" :options="fullOptions" @update:value="mobileMenuOpen = false" />
    </n-drawer-content>
  </n-drawer>

  <floating-pomodoro />
  <ai-assistant />

  <!-- Ctrl+K 快速跳转 -->
  <n-modal v-model:show="showCmd" preset="card" title="快速跳转" style="width: 520px; max-width: 92vw;">
    <template #header-extra>
      <n-text depth="3" style="font-size: 12px;">Ctrl + K · Enter 打开第一项</n-text>
    </template>
    <n-input v-model:value="cmdQuery" size="large" placeholder="搜索页面 / 项目 / 资源…" @keydown.enter.prevent="onCmdEnter" />
    <div class="cmd-list">
      <template v-if="cmdPages.length">
        <div class="cmd-group">页面</div>
        <div v-for="p in cmdPages" :key="`pg${p.key}`" class="cmd-item" @click="goCmd(p.key)">
          <n-icon size="16"><component :is="p.icon" /></n-icon>
          <span>{{ p.title }}</span>
        </div>
      </template>
      <template v-if="cmdProjectHits.length">
        <div class="cmd-group">项目</div>
        <div v-for="pr in cmdProjectHits" :key="pr.id" class="cmd-item" @click="goCmd(`/project/${pr.id}`)">
          <span>🚀</span><span>{{ pr.name }}</span>
        </div>
      </template>
      <template v-if="cmdResources.length">
        <div class="cmd-group">资源库</div>
        <div v-for="r in cmdResources.slice(0, 5)" :key="r.id" class="cmd-item" @click="goCmd('/resources')">
          <span>🔗</span><span>{{ r.title }}</span>
        </div>
      </template>
      <div v-if="!cmdPages.length && !cmdProjectHits.length && !cmdResources.length" class="cmd-empty">
        没有匹配结果，试试「项目」「资源」或页面名
      </div>
    </div>
  </n-modal>
</template>

<style>
.notify-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 8px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.2);
  margin-bottom: 6px;
}

.notify-title {
  font-weight: 800;
  font-size: 14px;
}

.notify-empty {
  padding: 18px 0;
  text-align: center;
  font-size: 13px;
  opacity: 0.6;
}

.notify-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.notify-item:hover {
  background: rgba(128, 128, 128, 0.1);
}

.notify-item.unread .notify-text {
  font-weight: 700;
}

.notify-item.unread::before {
  content: '';
}

.notify-text {
  font-size: 13px;
  line-height: 1.5;
}

.notify-time {
  font-size: 11px;
  opacity: 0.55;
}

.app-header {
  height: 64px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  border-radius: 16px;
}

.app-sider {
  border-radius: 16px;
  box-shadow: inset -1px 0 0 var(--n-border-color);
}

.app-sider .n-layout-sider-border {
  display: none;
}

.app-footer {
  border-radius: 16px;
}

.app-logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.logo-text {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #18a058, #2080f0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-user-area {
  margin-left: auto;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

@media (min-width: 769px) {
  .app-header {
    padding: 0 32px;
    gap: 24px;
  }
  .logo-text {
    font-size: 22px;
  }
}

.cmd-list {
  margin-top: 10px;
  max-height: 320px;
  overflow-y: auto;
}

.cmd-group {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.5;
  padding: 8px 6px 4px;
}

.cmd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.cmd-item:hover {
  background: rgba(128, 128, 128, 0.12);
}

.cmd-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  opacity: 0.6;
}

@media (max-width: 768px) {
  .user-name {
    display: none;
  }
  .app-logo {
    flex: 1;
  }
  .app-header,
  .app-sider,
  .app-footer {
    border-radius: 12px;
  }
}
</style>
