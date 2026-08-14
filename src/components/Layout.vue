<script setup lang="ts">
import { computed, h, ref, onMounted, onBeforeUnmount } from 'vue'
import type { Component } from 'vue'
import {
  NLayout, NLayoutHeader, NLayoutSider, NLayoutContent, NLayoutFooter,
  NMenu, NText, NIcon, NButton, NTag, NAvatar, NSpace, NPopover, NDrawer, NDrawerContent,
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
} from '@vicons/ionicons5'

import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import FloatingPomodoro from './FloatingPomodoro.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()

interface MenuDef { key: string; title: string; icon: Component }

const studentMenu: MenuDef[] = [
  { key: '/', title: '首页', icon: HomeIcon },
  { key: '/projects', title: '项目', icon: RocketIcon },
  { key: '/resources', title: '资源库', icon: CompassIcon },
  { key: '/quiz', title: '闯关', icon: TrophyIcon },
  { key: '/focus', title: '专注', icon: TimerIcon },
  { key: '/settings', title: '设置', icon: SettingsIcon },
  { key: '/about', title: '关于', icon: AboutIcon },
]

const teacherMenu: MenuDef[] = [
  { key: '/', title: '首页', icon: HomeIcon },
  { key: '/teacher', title: '团队总览', icon: SchoolIcon },
  { key: '/groups', title: '题库管理', icon: AlbumsIcon },
  { key: '/projects', title: '项目', icon: RocketIcon },
  { key: '/settings', title: '设置', icon: SettingsIcon },
  { key: '/about', title: '关于', icon: AboutIcon },
]

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

function renderCompactLabel(def: MenuDef) {
  return () =>
    h(
      NPopover,
      { trigger: 'hover', placement: 'bottom' },
      {
        trigger: () => h(RouterLink, { to: def.key }, { default: () => h(NIcon, { size: 18 }, { default: () => h(def.icon) }) }),
        default: () => def.title,
      },
    )
}

const fullOptions = computed(() => {
  const defs = auth.isTeacher ? teacherMenu : studentMenu
  return defs.map((d) => ({ key: d.key, icon: renderIcon(d.icon), label: () => h(RouterLink, { to: d.key }, { default: () => d.title }) }))
})

const headerOptions = computed(() => {
  if (!compactHeader.value) return fullOptions.value
  const defs = auth.isTeacher ? teacherMenu : studentMenu
  return defs.map((d) => ({ key: d.key, label: renderCompactLabel(d) }))
})

const menuKey = computed(() => {
  if (route.path.startsWith('/project/')) return '/projects'
  return route.path
})

const roleLabel = computed(() => (auth.isTeacher ? '教师' : '学生'))
const roleType = computed(() => (auth.isTeacher ? 'warning' : 'success'))

const handleLogout = async () => {
  await auth.logout()
  router.push('/login')
}

const isMobile = ref(false)
const compactHeader = ref(false)
const mobileMenuOpen = ref(false)
const siderCollapsed = ref(false)

function updateViewport() {
  isMobile.value = window.innerWidth < 768
  compactHeader.value = window.innerWidth < 1024
}

function onResize() { updateViewport() }
onMounted(() => {
  updateViewport()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <n-layout style="height: 100vh;">
    <n-layout-header bordered class="app-header">
      <n-button v-if="isMobile" quaternary size="small" @click="mobileMenuOpen = true">
        <template #icon><n-icon size="22"><menu-icon /></n-icon></template>
      </n-button>
      <div class="app-logo">
        <span class="logo-text">InnoArk</span>
      </div>

      <div class="header-menu-area">
        <n-menu v-if="!settings.sidebarMode && !isMobile" :value="menuKey" mode="horizontal" :options="headerOptions" />
      </div>

      <div class="header-user-area">
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

    <n-layout has-sider style="height: calc(100vh - 64px - 50px);">
      <n-layout-sider v-if="settings.sidebarMode && !isMobile" bordered collapse-mode="width" :collapsed-width="64" :width="220" show-trigger v-model:collapsed="siderCollapsed">
        <n-menu :value="menuKey" :options="fullOptions" :collapsed="siderCollapsed" :collapsed-width="64" :collapsed-icon-size="20" />
      </n-layout-sider>

      <n-layout-content content-style="padding: 16px; overflow-y: auto;">
        <router-view />
      </n-layout-content>
    </n-layout>

    <n-layout-footer bordered style="height: 50px; display: flex; align-items: center; justify-content: center;">
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

.header-menu-area {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
  height: 100%;
}

.header-menu-area .n-menu {
  --n-font-size: 13px !important;
  height: 100%;
  display: flex;
  align-items: center;
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
}
</style>