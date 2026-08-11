import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

interface SettingsState {
  sidebarMode: boolean
  theme: ThemeMode
}

const STORAGE_KEY = 'innoark_settings'

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { sidebarMode: true, theme: 'system', ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { sidebarMode: true, theme: 'system' }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadSettings()
  const sidebarMode = ref<boolean>(saved.sidebarMode)
  const theme = ref<ThemeMode>(saved.theme)

  watch([sidebarMode, theme], ([sm, th]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarMode: sm, theme: th }))
  })

  return { sidebarMode, theme }
})
