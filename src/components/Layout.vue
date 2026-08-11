<script setup lang="ts">
import { computed, h, ref } from 'vue'
import type { Component } from 'vue'
import {
  NLayout, NLayoutHeader, NLayoutSider, NLayoutContent, NLayoutFooter,
  NMenu, NText, NIcon, NButton, NTag, NAvatar, NSpace, NPopover,
} from 'naive-ui'
import {
  HomeOutline as HomeIcon,
  RocketOutline as RocketIcon,
  CompassOutline as CompassIcon,
  TimerOutline as TimerIcon,
  SchoolOutline as SchoolIcon,
  SettingsOutline as SettingsIcon,
  InformationCircleOutline as AboutIcon,
  PersonOutline as PersonIcon,
  LogOutOutline as LogOutIcon,
} from '@vicons/ionicons5'

import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

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

const isSidebar = ref(true)

const handleLogout = async () => {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <n-layout style="height: 100vh;">
    <n-layout-header bordered style="height: 64px; padding: 0 24px; display: flex; align-items: center; gap: 16px;">
      <n-text strong style="font-size: 18px; white-space: nowrap;">智创方舟 InnoArk</n-text>
      <n-tag size="small" :bordered="false" type="info" style="white-space: nowrap;">虫洞·星桥</n-tag>

      <div style="flex: 1; display: flex; justify-content: center; min-width: 0;">
        <n-menu v-if="!isSidebar" :value="menuKey" mode="horizontal" :options="menuOptions" style="justify-content: center;" />
      </div>

      <n-space align="center" style="margin-left: auto; white-space: nowrap;">
        <n-popover trigger="click">
          <template #trigger>
            <n-space align="center" style="cursor: pointer;">
              <n-avatar round size="small" :style="{ backgroundColor: auth.isTeacher ? '#f0a020' : '#18a058' }">
                <n-icon><person-icon /></n-icon>
              </n-avatar>
              <n-text>{{ auth.user?.name }}</n-text>
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
      <n-layout-sider v-if="isSidebar" bordered collapse-mode="width" :collapsed-width="64" :width="240" show-trigger>
        <n-menu :value="menuKey" :options="menuOptions" />
      </n-layout-sider>

      <n-layout-content content-style="padding: 24px; overflow-y: auto;">
        <router-view />
      </n-layout-content>
    </n-layout>

    <n-layout-footer bordered style="height: 50px; display: flex; align-items: center; justify-content: center;">
      <n-text depth="3">© 2026 智创方舟 InnoArk · 虫洞·星桥 智能跨学科项目式学习协同平台</n-text>
    </n-layout-footer>
  </n-layout>
</template>
