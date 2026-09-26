import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: ThemeMode
  healthReminder: boolean
  healthIntervalMin: number
}

const STORAGE_KEY = 'innoark_settings'

const DEFAULTS: SettingsState = { theme: 'system', healthReminder: false, healthIntervalMin: 45 }

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // 合并默认值：旧版本保存的数据缺少新字段时回落到默认
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULTS }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadSettings()
  const theme = ref<ThemeMode>(saved.theme)
  const healthReminder = ref(saved.healthReminder)
  const healthIntervalMin = ref(saved.healthIntervalMin)

  watch([theme, healthReminder, healthIntervalMin], ([th, hr, hi]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: th, healthReminder: hr, healthIntervalMin: hi }))
  })

  return { theme, healthReminder, healthIntervalMin }
})
