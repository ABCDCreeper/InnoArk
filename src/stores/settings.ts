import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: ThemeMode
}

const STORAGE_KEY = 'innoark_settings'

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { theme: 'system', ...JSON.parse(raw) }
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
