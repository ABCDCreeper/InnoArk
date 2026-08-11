<script setup lang="ts">
import { NCard, NSpace, NText, NRadioGroup, NRadioButton } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()
</script>

<template>
  <n-card title="设置">
    <n-space vertical size="large">
      <n-card title="菜单位置" size="small">
        <n-space vertical>
          <n-text depth="3">选择侧边栏菜单的显示位置</n-text>
          <n-radio-group v-model:value="settings.sidebarPlacement">
            <n-space>
              <n-radio-button value="left">左侧</n-radio-button>
              <n-radio-button value="right">右侧</n-radio-button>
            </n-space>
          </n-radio-group>
        </n-space>
      </n-card>
    </n-space>
  </n-card>
</template>