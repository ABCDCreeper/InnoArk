import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'innoark_settings'

function loadSettings(): { sidebarPlacement: 'left' | 'right' } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { sidebarPlacement: 'left' }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadSettings()
  const sidebarPlacement = ref<'left' | 'right'>(saved.sidebarPlacement)

  watch(sidebarPlacement, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarPlacement: val }))
  })

  return { sidebarPlacement }
})