<script setup lang="ts">
import { ref, h } from 'vue'
import type { Component } from 'vue'
import { 
  NLayout, NLayoutHeader, NLayoutSider, NLayoutContent, NLayoutFooter,
  NMenu, NSwitch, NSpace, NText, NIcon
} from 'naive-ui'
import { 
  HomeOutline as HomeIcon,
  BookOutline as BookIcon,
  SettingsOutline as SettingsIcon
} from '@vicons/ionicons5'

import { RouterLink, useRoute } from 'vue-router'

function renderIcon (icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = [
  {
    label: () => h(RouterLink, { to: '/' }, { default: () => '首页' }),
    key: '/',
    icon: renderIcon(HomeIcon)
  },
  {
    label: () => h(RouterLink, { to: '/about' }, { default: () => '关于' }),
    key: '/about',
    icon: renderIcon(BookIcon)
  },
  {
    label: () => h(RouterLink, { to: '/settings' }, { default: () => '设置' }),
    key: '/settings',
    icon: renderIcon(SettingsIcon)
  }
]

const route = useRoute()
const isSidebar = ref(true)
</script>

<template>
  <n-layout style="height: 100vh;">
    <n-layout-header bordered style="height: 64px; padding: 0 24px; display: flex; align-items: center;">
      <n-text strong style="font-size: 18px; width: 200px; white-space: nowrap;">智创方舟 InnoArk</n-text>
      
      <div style="flex: 1; display: flex; justify-content: center;">
        <n-menu v-if="!isSidebar" :value="route.path" mode="horizontal" :options="menuOptions" />
      </div>
      
      <div style="width: 200px;"></div>
    </n-layout-header>

    <n-layout has-sider style="height: calc(100vh - 64px - 50px);">
      <n-layout-sider v-if="isSidebar" bordered collapse-mode="width" :collapsed-width="64" :width="240" show-trigger>
        <n-menu :value="route.path" :options="menuOptions" />
      </n-layout-sider>
      
      <n-layout-content content-style="padding: 24px;">
        <router-view />
      </n-layout-content>
    </n-layout>
    
    <n-layout-footer bordered style="height: 50px; display: flex; align-items: center; justify-content: center;">
      <n-text depth="3">© 2026 智创方舟 InnoArk - 标识保留</n-text>
    </n-layout-footer>
  </n-layout>
</template>
