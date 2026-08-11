<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { NButton, NSpace, NText, NTag } from 'naive-ui'

const WORK_MIN = 25
const BREAK_MIN = 5

const mode = ref<'focus' | 'break'>('focus')
const running = ref(false)
const remainSec = ref(WORK_MIN * 60)

let timer: ReturnType<typeof setInterval> | null = null

const emit = defineEmits<{
  complete: [mode: 'focus' | 'break', minutes: number]
}>()

const totalSec = computed(() => (mode.value === 'focus' ? WORK_MIN : BREAK_MIN) * 60)
const progress = computed(() => 1 - remainSec.value / totalSec.value)
const display = computed(() => {
  const m = Math.floor(remainSec.value / 60)
  const s = remainSec.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const radius = 84
const circumference = 2 * Math.PI * radius

function tick() {
  remainSec.value -= 1
  if (remainSec.value <= 0) {
    finish()
  }
}

function finish() {
  running.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  emit('complete', mode.value, mode.value === 'focus' ? WORK_MIN : BREAK_MIN)
  mode.value = mode.value === 'focus' ? 'break' : 'focus'
  remainSec.value = (mode.value === 'focus' ? WORK_MIN : BREAK_MIN) * 60
}

function start() {
  if (running.value) return
  running.value = true
  timer = setInterval(tick, 1000)
}

function pause() {
  running.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function reset() {
  pause()
  remainSec.value = totalSec.value
}

function switchMode(target: 'focus' | 'break') {
  pause()
  mode.value = target
  remainSec.value = (target === 'focus' ? WORK_MIN : BREAK_MIN) * 60
}

onBeforeUnmount(pause)
</script>

<template>
  <div class="pomodoro">
    <n-space align="center" justify="center">
      <n-tag :type="mode === 'focus' ? 'success' : 'info'" :bordered="false" size="medium">
        {{ mode === 'focus' ? '专注工作' : '短暂休息' }}
      </n-tag>
    </n-space>

    <div class="ring-wrap" @click="running ? pause() : start()">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" :r="radius" fill="none" stroke="rgba(128,128,128,0.15)" stroke-width="10" />
        <circle
          cx="100" cy="100" :r="radius" fill="none"
          :stroke="mode === 'focus' ? '#18a058' : '#2080f0'"
          stroke-width="10" stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="circumference * (1 - progress)"
          transform="rotate(-90 100 100)"
          style="transition: stroke-dashoffset 1s linear;"
        />
      </svg>
      <div class="ring-center">
        <n-text style="font-size: 40px; font-weight: 700; font-variant-numeric: tabular-nums;">{{ display }}</n-text>
        <n-text depth="3" style="font-size: 13px;">{{ running ? '点击暂停' : remainSec < totalSec ? '点击继续' : '点击开始' }}</n-text>
      </div>
    </div>

    <n-space justify="center">
      <n-button size="small" @click="start" :disabled="running">开始</n-button>
      <n-button size="small" @click="pause" :disabled="!running">暂停</n-button>
      <n-button size="small" @click="reset">重置</n-button>
      <n-button size="small" @click="switchMode('focus')">切换专注</n-button>
      <n-button size="small" @click="switchMode('break')">切换休息</n-button>
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
