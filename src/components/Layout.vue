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
    <n-layout-header bordered style="height: 64px; padding: 0 12px; display: flex; align-items: center; gap: 8px;">
      <n-button v-if="isMobile" quaternary size="small" @click="mobileMenuOpen = true">
        <template #icon><n-icon size="22"><menu-icon /></n-icon></template>
      </n-button>
      <n-text strong style="font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">智创方舟 InnoArk</n-text>

      <div style="flex: 1; display: flex; justify-content: center; min-width: 0;">
        <n-menu v-if="!settings.sidebarMode && !isMobile" :value="menuKey" mode="horizontal" :options="menuOptions" style="justify-content: center;" />
      </div>

      <n-space align="center" style="margin-left: auto; white-space: nowrap; flex-shrink: 0;">
        <n-popover trigger="click">
          <template #trigger>
            <n-space align="center" style="cursor: pointer;">
              <n-avatar round size="small" :style="{ backgroundColor: auth.isTeacher ? '#f0a020' : '#18a058' }">
                <n-icon><person-icon /></n-icon>
              </n-avatar>
              <n-text class="user-name">{{ auth.user?.name }}</n-text>
              <n-tag size="small" :type="roleType" :bordered="false">{{ roleLabel }}</n-tag>
            </n-space>
          </template>
          <n-space vertical>
            <n-text depth="3">账号：{{ auth.user?.username }}</n-text>
            <n-button quaternary type="error" size="small" @click="handleLogout">
              <template #icon><n-icon><log-out-icon /></n-icon></template>
              退出登录
            </n-button>
          </n-space>
        </n-popover>
      </n-space>
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
@media (max-width: 768px) {
  .user-name {
    display: none;
  }
}
</style>