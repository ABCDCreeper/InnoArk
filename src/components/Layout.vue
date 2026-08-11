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
} from '@vicons/ionicons5'

import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import FloatingPomodoro from './FloatingPomodoro.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const studentMenu = [
  { label: () => h(RouterLink, { to: '/' }, { default: () => '首页' }), key: '/', icon: renderIcon(HomeIcon) },
  { label: () => h(RouterLink, { to: '/projects' }, { default: () => '课题与项目' }), key: '/projects', icon: renderIcon(RocketIcon) },
  { label: () => h(RouterLink, { to: '/resources' }, { default: () => '资源库' }), key: '/resources', icon: renderIcon(CompassIcon) },
  { label: () => h(RouterLink, { to: '/focus' }, { default: () => '专注模式' }), key: '/focus', icon: renderIcon(TimerIcon) },
  { label: () => h(RouterLink, { to: '/settings' }, { default: () => '设置' }), key: '/settings', icon: renderIcon(SettingsIcon) },
  { label: () => h(RouterLink, { to: '/about' }, { default: () => '关于' }), key: '/about', icon: renderIcon(AboutIcon) },
]

const teacherMenu = [
  { label: () => h(RouterLink, { to: '/' }, { default: () => '首页' }), key: '/', icon: renderIcon(HomeIcon) },
  { label: () => h(RouterLink, { to: '/teacher' }, { default: () => '团队总览' }), key: '/teacher', icon: renderIcon(SchoolIcon) },
  { label: () => h(RouterLink, { to: '/projects' }, { default: () => '课题与项目' }), key: '/projects', icon: renderIcon(RocketIcon) },
  { label: () => h(RouterLink, { to: '/settings' }, { default: () => '设置' }), key: '/settings', icon: renderIcon(SettingsIcon) },
  { label: () => h(RouterLink, { to: '/about' }, { default: () => '关于' }), key: '/about', icon: renderIcon(AboutIcon) },
]

const menuOptions = computed(() => (auth.isTeacher ? teacherMenu : studentMenu))

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
const mobileMenuOpen = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

function onResize() { checkMobile() }
onMounted(checkMobile)
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <n-layout style="height: 100vh;">
    <n-layout-header bordered class="app-header">
      <n-button v-if="isMobile" quaternary size="small" @click="mobileMenuOpen = true">
        <template #icon><n-icon size="22"><menu-icon /></n-icon></template>
      </n-button>
      <div class="app-logo">
        <span class="logo-icon">🚀</span>
        <span class="logo-cn">智创方舟</span>
        <span class="logo-en">InnoArk</span>
      </div>

      <div class="header-menu-area">
        <n-menu v-if="!settings.sidebarMode && !isMobile" :value="menuKey" mode="horizontal" :options="menuOptions" />
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
      <n-layout-sider v-if="settings.sidebarMode && !isMobile" bordered collapse-mode="width" :collapsed-width="64" :width="220" show-trigger>
        <n-menu :value="menuKey" :options="menuOptions" />
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
      <n-menu :value="menuKey" :options="menuOptions" @update:value="mobileMenuOpen = false" />
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
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  text-decoration: none;
}

.logo-icon {
  font-size: 22px;
  line-height: 1;
}

.logo-cn {
  font-size: 18px;
  font-weight: 700;
  color: var(--n-text-color);
  letter-spacing: 1px;
}

.logo-en {
  font-size: 14px;
  font-weight: 300;
  color: var(--n-text-color-3);
  letter-spacing: 0.5px;
  margin-left: 2px;
}

.header-menu-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
  height: 100%;
}

.header-menu-area .n-menu {
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
  .logo-cn {
    font-size: 20px;
  }
  .logo-en {
    font-size: 15px;
  }
}

@media (max-width: 768px) {
  .user-name {
    display: none;
  }
  .logo-en {
    display: none;
  }
  .logo-icon {
    font-size: 18px;
  }
}
</style>