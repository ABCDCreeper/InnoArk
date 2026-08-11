<script setup lang="ts">
import { NCard, NSpace, NText, NSwitch, NTag } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()
</script>

<template>
  <n-card title="设置">
    <n-space vertical size="large">
      <n-card title="导航模式" size="small">
        <n-space align="center" justify="space-between" wrap>
          <n-space vertical>
            <n-text>菜单显示模式</n-text>
            <n-text depth="3" style="font-size: 13px;">切换侧边栏与顶部导航栏</n-text>
          </n-space>
          <n-space align="center">
            <n-tag v-if="settings.sidebarMode" size="small" type="primary" :bordered="false">侧边栏</n-tag>
            <n-tag v-else size="small" type="info" :bordered="false">顶栏</n-tag>
            <n-switch v-model:value="settings.sidebarMode" />
          </n-space>
        </n-space>
      </n-card>
    </n-space>
  </n-card>
</template>