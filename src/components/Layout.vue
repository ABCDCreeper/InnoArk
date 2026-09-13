<script setup lang="ts">
import { computed, h, ref, onMounted, onBeforeUnmount } from 'vue'
import type { Component } from 'vue'
import {
  NLayout, NLayoutHeader, NLayoutSider, NLayoutContent, NLayoutFooter,
  NMenu, NText, NIcon, NButton, NTag, NAvatar, NSpace, NPopover, NDrawer, NDrawerContent,
  NBadge, NEmpty,
} from 'naive-ui'
import {
  HomeOutline as HomeIcon,
  RocketOutline as RocketIcon,
  CompassOutline as CompassIcon,
  TimerOutline as TimerIcon,
  SchoolOutline as SchoolIcon,
  SchoolOutline as LearnIcon,
  SettingsOutline as SettingsIcon,
  InformationCircleOutline as AboutIcon,
  PersonCircleOutline as PersonIcon,
  LogOutOutline as LogOutIcon,
  MenuOutline as MenuIcon,
  NotificationsOutline as NotificationsIcon,
  TrophyOutline as TrophyIcon,
  AlbumsOutline as AlbumsIcon,
  PeopleOutline as PeopleIcon,
} from '@vicons/ionicons5'

import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import FloatingPomodoro from './FloatingPomodoro.vue'
import { fetchNotifications, markNotificationsSeen } from '../api/insights'
import { formatTime } from '../utils/format'
import type { AppNotification } from '../api/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

interface MenuDef { key: string; title: string; icon: Component }

const studentMenu: MenuDef[] = [
  { key: '/', title: '首页', icon: HomeIcon },
  { key: '/learn', title: '学习', icon: LearnIcon },
  { key: '/projects', title: '项目', icon: RocketIcon },
  { key: '/resources', title: '资源库', icon: CompassIcon },
  { key: '/quiz', title: '闯关', icon: TrophyIcon },
  { key: '/my-groups', title: '我的分组', icon: PeopleIcon },
  { key: '/focus', title: '专注', icon: TimerIcon },
  { key: '/settings', title: '设置', icon: SettingsIcon },
  { key: '/about', title: '关于', icon: AboutIcon },
]

const teacherMenu: MenuDef[] = [
  { key: '/', title: '首页', icon: HomeIcon },
  { key: '/learn', title: '学习', icon: LearnIcon },
  { key: '/teacher', title: '团队总览', icon: SchoolIcon },
  { key: '/groups', title: '题库管理', icon: AlbumsIcon },
  { key: '/projects', title: '项目', icon: RocketIcon },
  { key: '/settings', title: '设置', icon: SettingsIcon },
  { key: '/about', title: '关于', icon: AboutIcon },
]

const managerMenu: MenuDef[] = [
  { key: '/', title: '首页', icon: HomeIcon },
  { key: '/learn', title: '学习', icon: LearnIcon },
  { key: '/admin/users', title: '用户管理', icon: PeopleIcon },
  { key: '/groups', title: '题库管理', icon: AlbumsIcon },
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
  if (route.path.startsWith('/learn/')) return '/learn'
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

function updateViewport() {
  isMobile.value = window.innerWidth < 768
}

function onResize() { updateViewport() }

// ---------------------------------------------------------------- 通知中心
// 通知由服务端按既有数据派生，这里只负责展示与"看到哪一刻"
const notifications = ref<AppNotification[]>([])
const unread = ref(0)
const markingSeen = ref(false)

async function loadNotifications() {
  try {
    const feed = await fetchNotifications()
    notifications.value = feed.items.slice(0, 20)
    unread.value = feed.unread
  } catch {
    // 通知是辅助信息，取不到时静默，不打断当前页面
  }
}

function openNotifications() {
  void loadNotifications()
}

async function markSeen() {
  markingSeen.value = true
  try {
    await markNotificationsSeen()
    unread.value = 0
    notifications.value = notifications.value.map((n) => ({ ...n, unread: false }))
  } finally {
    markingSeen.value = false
  }
}

function goNotification(item: AppNotification) {
  router.push(item.link)
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', onResize)
  void loadNotifications()
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
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
        <n-popover trigger="click" placement="bottom-end" style="width: 380px; max-width: 92vw;">
          <template #trigger>
            <n-badge :value="unread" :max="99" :show="unread > 0">
              <n-button quaternary size="small" aria-label="通知" @click="openNotifications">
                <template #icon><n-icon size="20"><notifications-icon /></n-icon></template>
              </n-button>
            </n-badge>
          </template>
          <div class="notify-panel">
            <n-space align="center" justify="space-between" style="margin-bottom: 8px;">
              <n-text strong>通知</n-text>
              <n-button v-if="unread > 0" size="tiny" text type="primary" :loading="markingSeen" @click="markSeen">
                全部标为已读
              </n-button>
            </n-space>
            <n-empty v-if="!notifications.length" description="暂无通知" size="small" />
            <div v-else class="notify-list">
              <div
                v-for="(item, i) in notifications"
                :key="`${item.type}-${i}`"
                class="notify-item"
                :class="{ unread: item.unread }"
                @click="goNotification(item)"
              >
                <n-space align="center" size="small" justify="space-between">
                  <n-text :strong="item.unread" style="font-size: 13px;">{{ item.title }}</n-text>
                  <n-text depth="3" style="font-size: 11px;">{{ formatTime(item.createdAt) }}</n-text>
                </n-space>
                <n-text depth="3" style="font-size: 12px;">{{ item.detail }}</n-text>
              </div>
            </div>
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
</template>

<style>
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

.notify-panel {
  min-width: 300px;
}

.notify-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notify-item {
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notify-item:hover {
  background: rgba(128, 128, 128, 0.12);
}

.notify-item.unread {
  background: rgba(32, 128, 240, 0.08);
  border-left: 3px solid #2080f0;
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