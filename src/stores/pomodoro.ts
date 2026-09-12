import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createFocusSession } from '../api/focus'

const WORK_MIN = 25
const BREAK_MIN = 5
// 关联任务存在本地：整页刷新（或误关标签）不该让这次专注失去归属
const TASK_KEY = 'innoark_pomodoro_task'

function loadLinkedTask(): { id: string; label: string } | null {
  try {
    const raw = localStorage.getItem(TASK_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed.id === 'string' ? parsed : null
  } catch {
    return null
  }
}

export const usePomodoroStore = defineStore('pomodoro', () => {
  const mode = ref<'focus' | 'break'>('focus')
  const running = ref(false)
  const remainSec = ref(WORK_MIN * 60)
  const sessionCompleted = ref<{ mode: 'focus' | 'break'; minutes: number } | null>(null)
  // 上报失败时置位，由专注页提示：静默丢一次专注会直接让统计少记
  const reportFailed = ref(false)
  // 关联任务：把番茄钟时长记到具体任务上，成为可核对的投入证据
  const linked = loadLinkedTask()
  const taskId = ref<string | null>(linked?.id ?? null)
  const taskLabel = ref<string>(linked?.label ?? '')

  function linkTask(id: string | null, label = '') {
    taskId.value = id
    taskLabel.value = id ? label : ''
    try {
      if (id) localStorage.setItem(TASK_KEY, JSON.stringify({ id, label: taskLabel.value }))
      else localStorage.removeItem(TASK_KEY)
    } catch {
      // 存储不可用时只影响刷新后的归属，不影响本次上报
    }
  }

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

  /**
   * 完成即上报，不依赖任何页面是否挂载。
   * 计时器是常驻的（悬浮窗在任何路由都在跑），若把上报放在专注页的 watch 里，
   * 在别的页面结束的番茄钟就永远不会被记录，专注统计会系统性少记。
   */
  async function report(completed: { mode: 'focus' | 'break'; minutes: number }) {
    try {
      await createFocusSession(completed.minutes, completed.mode, taskId.value)
      reportFailed.value = false
      sessionCompleted.value = completed // 服务端确认后才置位，不谎报未记录的成绩
    } catch {
      // 上报失败不打断计时，但要让用户知道这次没记上
      reportFailed.value = true
    }
  }

  function finish() {
    stopTimer()
    running.value = false
    const completed = { mode: mode.value, minutes: mode.value === 'focus' ? WORK_MIN : BREAK_MIN }
    mode.value = mode.value === 'focus' ? 'break' : 'focus'
    remainSec.value = (mode.value === 'focus' ? WORK_MIN : BREAK_MIN) * 60
    void report(completed)
    // 只自动接着走休息；休息结束后停下等用户开始。
    // 若一直自动循环，无人看管的标签页会持续上报专注记录，
    // 而这些记录会被当作过程证据计入专注时长。
    if (completed.mode === 'focus') start()
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
    sessionCompleted, reportFailed, taskId, taskLabel, linkTask,
    start, pause, reset, switchMode, stopTimer,
  }
})