import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from './auth'

export interface NotifyItem { id: string; text: string; time: string; read: boolean; to?: string }

interface NotifySave { items: NotifyItem[] }

const emptySave = (): NotifySave => ({ items: [] })

export const useNotifyStore = defineStore('notify', () => {
  const auth = useAuthStore()
  const save = ref<NotifySave>(emptySave())
  let loadedUser: string | null = null

  function load() {
    const uid = auth.user?.id ?? 'guest'
    if (loadedUser === uid) return
    loadedUser = uid
    try {
      const parsed = JSON.parse(localStorage.getItem(`innoark_notify_${uid}`) || 'null') as Partial<NotifySave> | null
      save.value = { ...emptySave(), ...(parsed ?? {}) }
    } catch {
      save.value = emptySave()
    }
  }

  function persist() {
    localStorage.setItem(`innoark_notify_${auth.user?.id ?? 'guest'}`, JSON.stringify(save.value))
  }

  function push(text: string, to?: string) {
    load()
    const id = `n${Date.now().toString(36)}${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
    save.value.items.unshift({ id, text, time: new Date().toISOString(), read: false, to })
    if (save.value.items.length > 50) save.value.items.length = 50
    persist()
  }

  const items = computed(() => {
    load()
    return save.value.items
  })

  const unread = computed(() => {
    load()
    return save.value.items.filter((i) => !i.read).length
  })

  function markRead(id: string) {
    load()
    const item = save.value.items.find((i) => i.id === id)
    if (!item || item.read) return
    item.read = true
    persist()
  }

  function markAllRead() {
    load()
    save.value.items.forEach((i) => {
      i.read = true
    })
    persist()
  }

  return { items, unread, push, markRead, markAllRead }
})
