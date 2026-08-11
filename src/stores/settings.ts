import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'innoark_settings'

function loadSettings(): { sidebarMode: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { sidebarMode: true }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadSettings()
  const sidebarMode = ref<boolean>(saved.sidebarMode)

  watch(sidebarMode, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarMode: val }))
  })

  return { sidebarMode }
})