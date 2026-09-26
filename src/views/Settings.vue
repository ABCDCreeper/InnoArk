<script setup lang="ts">
import { NCard, NSpace, NText, NRadioGroup, NRadioButton, NSwitch } from 'naive-ui'
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()

const INTERVAL_OPTIONS = [
  { value: 1, label: '1 分钟（演示）' },
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 45, label: '45 分钟' },
  { value: 60, label: '60 分钟' },
]
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

      <n-card title="健康提醒" size="small">
        <n-space vertical size="small">
          <n-space align="center" justify="space-between">
            <div>
              <n-text>连续学习提醒</n-text>
              <div><n-text depth="3" style="font-size: 13px;">达到设定时长后弹窗提醒你起来活动，保护视力与腰椎</n-text></div>
            </div>
            <n-switch v-model:value="settings.healthReminder" />
          </n-space>
          <template v-if="settings.healthReminder">
            <n-text depth="3" style="font-size: 13px;">提醒间隔</n-text>
            <n-radio-group v-model:value="settings.healthIntervalMin" size="small">
              <n-radio-button v-for="opt in INTERVAL_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</n-radio-button>
            </n-radio-group>
          </template>
        </n-space>
      </n-card>
    </n-space>
  </n-card>
</template>
