import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: ThemeMode
}

const STORAGE_KEY = 'innoark_settings'
const THEMES: ThemeMode[] = ['light', 'dark', 'system']

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 只接受合法取值：坏的本地数据不能让主题选择器变成"一个都没选中"
      if (THEMES.includes(parsed?.theme)) return { theme: parsed.theme }
    }
  } catch { /* ignore */ }
  return { theme: 'system' }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadSettings()
  const theme = ref<ThemeMode>(saved.theme)

  watch(theme, (th) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: th }))
  })

  return { theme }
})
