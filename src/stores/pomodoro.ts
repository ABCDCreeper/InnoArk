import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const WORK_MIN = 25
const BREAK_MIN = 5

export const usePomodoroStore = defineStore('pomodoro', () => {
  const mode = ref<'focus' | 'break'>('focus')
  const running = ref(false)
  const remainSec = ref(WORK_MIN * 60)
  const sessionCompleted = ref<{ mode: 'focus' | 'break'; minutes: number } | null>(null)

  const totalSec = computed(() => (mode.value === 'focus' ? WORK_MIN : BREAK_MIN) * 60)
  const progress = computed(() => 1 - remainSec.value / totalSec.value)
  const display = computed(() => {
    const m = Math.floor(remainSec.value / 60)
    const s = remainSec.value % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })
  const isActive = computed(() => remainSec.value < (mode.value === 'focus' ? WORK_MIN : BREAK_MIN) * 60 || running.value)

  let timer: ReturnType<typeof setInterval> | null = null

  function tick() {
    remainSec.value -= 1
    if (remainSec.value <= 0) {
      finish()
    }
  }

  function finish() {
    stopTimer()
    running.value = false
    sessionCompleted.value = { mode: mode.value, minutes: mode.value === 'focus' ? WORK_MIN : BREAK_MIN }
    mode.value = mode.value === 'focus' ? 'break' : 'focus'
    remainSec.value = (mode.value === 'focus' ? WORK_MIN : BREAK_MIN) * 60
    start()
  }

  function start() {
    if (running.value) return
    running.value = true
    timer = setInterval(tick, 1000)
  }

  function pause() {
    running.value = false
    stopTimer()
  }

  function reset() {
    pause()
    remainSec.value = totalSec.value
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function switchMode(target: 'focus' | 'break') {
    pause()
    mode.value = target
    remainSec.value = (target === 'focus' ? WORK_MIN : BREAK_MIN) * 60
    start()
  }

  return {
    mode, running, remainSec, totalSec, progress, display, isActive,
    sessionCompleted, start, pause, reset, switchMode, stopTimer,
  }
})