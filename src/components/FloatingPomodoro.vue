<script setup lang="ts">
import { NButton, NSpace, NTag, NIcon } from 'naive-ui'
import { PlayOutline, PauseOutline, RefreshOutline } from '@vicons/ionicons5'
import { usePomodoroStore } from '../stores/pomodoro'

const store = usePomodoroStore()

const radius = 36
const circumference = 2 * Math.PI * radius
</script>

<template>
  <div v-if="store.isActive" class="floating-pomodoro">
    <div class="fp-body">
      <div class="fp-ring" @click="store.running ? store.pause() : store.start()">
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" :r="radius" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="5" />
          <circle
            cx="40" cy="40" :r="radius" fill="none"
            :stroke="store.mode === 'focus' ? '#18a058' : '#2080f0'"
            stroke-width="5" stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="circumference * (1 - store.progress)"
            transform="rotate(-90 40 40)"
            style="transition: stroke-dashoffset 1s linear;"
          />
        </svg>
        <div class="fp-time">{{ store.display }}</div>
      </div>
      <div class="fp-actions">
        <n-tag size="tiny" :type="store.mode === 'focus' ? 'success' : 'info'" :bordered="false" style="margin-bottom: 4px;">
          {{ store.mode === 'focus' ? '专注' : '休息' }}
        </n-tag>
        <n-space justify="center" size="small">
          <n-button v-if="!store.running" size="tiny" circle @click="store.start">
            <template #icon><n-icon size="12"><play-outline /></n-icon></template>
          </n-button>
          <n-button v-else size="tiny" circle @click="store.pause">
            <template #icon><n-icon size="12"><pause-outline /></n-icon></template>
          </n-button>
          <n-button size="tiny" circle @click="store.reset">
            <template #icon><n-icon size="12"><refresh-outline /></n-icon></template>
          </n-button>
        </n-space>
      </div>
    </div>
  </div>
</template>

<style scoped>
.floating-pomodoro {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 9999;
  background: var(--n-card-color, #1a1a2e);
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
}

.fp-body {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fp-ring {
  position: relative;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.fp-time {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.fp-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>