<script setup lang="ts">
import { NButton, NSpace, NText, NTag } from 'naive-ui'
import { usePomodoroStore } from '../stores/pomodoro'

const store = usePomodoroStore()

const radius = 84
const circumference = 2 * Math.PI * radius
</script>

<template>
  <div class="pomodoro">
    <n-space align="center" justify="center">
      <n-tag :type="store.mode === 'focus' ? 'success' : 'info'" :bordered="false" size="medium">
        {{ store.mode === 'focus' ? '专注工作' : '短暂休息' }}
      </n-tag>
    </n-space>

    <div class="ring-wrap" @click="store.running ? store.pause() : store.start()">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" :r="radius" fill="none" stroke="rgba(128,128,128,0.15)" stroke-width="10" />
        <circle
          cx="100" cy="100" :r="radius" fill="none"
          :stroke="store.mode === 'focus' ? '#18a058' : '#2080f0'"
          stroke-width="10" stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="circumference * (1 - store.progress)"
          transform="rotate(-90 100 100)"
          style="transition: stroke-dashoffset 1s linear;"
        />
      </svg>
      <div class="ring-center">
        <n-text style="font-size: 40px; font-weight: 700; font-variant-numeric: tabular-nums;">{{ store.display }}</n-text>
        <n-text depth="3" style="font-size: 13px;">{{ store.running ? '点击暂停' : store.remainSec < store.totalSec ? '点击继续' : '点击开始' }}</n-text>
      </div>
    </div>

    <n-space justify="center">
      <n-button size="small" @click="store.start" :disabled="store.running">开始</n-button>
      <n-button size="small" @click="store.pause" :disabled="!store.running">暂停</n-button>
      <n-button size="small" @click="store.reset">重置</n-button>
      <n-button size="small" @click="store.switchMode(store.mode === 'focus' ? 'break' : 'focus')">
        {{ store.mode === 'focus' ? '切换休息' : '切换专注' }}
      </n-button>
    </n-space>
  </div>
</template>

<style scoped>
.pomodoro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.ring-wrap {
  position: relative;
  cursor: pointer;
  user-select: none;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
</style>