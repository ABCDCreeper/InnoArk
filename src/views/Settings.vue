<script setup lang="ts">
import { NCard, NSpace, NText, NRadioGroup, NRadioButton } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()
</script>

<template>
  <n-card title="设置">
    <n-space vertical size="large">
      <n-card title="主题" size="small">
        <n-space vertical size="small">
          <n-text>界面主题</n-text>
          <n-text depth="3" style="font-size: 13px;">选择明亮、黑暗或跟随系统</n-text>
          <n-radio-group v-model:value="settings.theme" style="margin-top: 4px;">
            <n-radio-button value="light">明亮</n-radio-button>
            <n-radio-button value="dark">黑暗</n-radio-button>
            <n-radio-button value="system">跟随系统</n-radio-button>
          </n-radio-group>
        </n-space>
      </n-card>
    </n-space>
  </n-card>
</template>
