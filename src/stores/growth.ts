import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from './auth'
import { useLearnStore } from './learn'
import { fetchFocusStats } from '../api/focus'

export interface WrongItem { question: string; options: string[]; answer: number; explanation: string; date: string }

interface GrowthSave {
  signs: string[]
  quizPlayedDate: string
  collection: string[]
  wrongBook: WrongItem[]
  daily: Record<string, boolean>
  dailyStreak: number
  dailyLastDate: string
  claimed: Record<string, string[]>
}

const emptySave = (): GrowthSave => ({
  signs: [],
  quizPlayedDate: '',
  collection: [],
  wrongBook: [],
  daily: {},
  dailyStreak: 0,
  dailyLastDate: '',
  claimed: {},
})

function dateKey(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const TASK_DEFS = [
  { id: 'lesson', emoji: '📖', label: '看 1 节课' },
  { id: 'quiz', emoji: '⚔️', label: '答 1 局闯关' },
  { id: 'focus', emoji: '🍅', label: '专注 25 分钟' },
  { id: 'sign', emoji: '✅', label: '完成签到' },
] as const

export const useGrowthStore = defineStore('growth', () => {
  const auth = useAuthStore()
  const learn = useLearnStore()
  const save = ref<GrowthSave>(emptySave())
  let loadedUser: string | null = null
  const focusMinutesToday = ref(0)

  function load() {
    const uid = auth.user?.id ?? 'guest'
    if (loadedUser === uid) return
    loadedUser = uid
    try {
      const parsed = JSON.parse(localStorage.getItem(`innoark_growth_${uid}`) || 'null') as Partial<GrowthSave> | null
      save.value = { ...emptySave(), ...(parsed ?? {}) }
    } catch {
      save.value = emptySave()
    }
  }

  function persist() {
    localStorage.setItem(`innoark_growth_${auth.user?.id ?? 'guest'}`, JSON.stringify(save.value))
  }

  const signedToday = computed(() => {
    load()
    return save.value.signs.includes(dateKey())
  })
  const signDays = computed(() => {
    load()
    return save.value.signs.length
  })
  const monthSigns = computed(() => {
    load()
    const month = dateKey().slice(0, 7)
    return save.value.signs.filter((d) => d.startsWith(month))
  })
  const signStreak = computed(() => {
    load()
    return currentStreak()
  })
  const wrongBook = computed(() => {
    load()
    return save.value.wrongBook
  })
  const collection = computed(() => {
    load()
    return save.value.collection
  })

  function currentStreak() {
    let streak = 0
    let offset = signedToday.value ? 0 : 1
    while (save.value.signs.includes(dateKey(offset))) {
      streak += 1
      offset += 1
    }
    return streak
  }

  function signIn() {
    load()
    if (signedToday.value) return null
    save.value.signs.push(dateKey())
    const streak = currentStreak()
    const xpGained = [5, 10, 15, 20][Math.min(streak - 1, 3)]
    const res = learn.addXp(xpGained)
    persist()
    grantTaskXp()
    return { xpGained, streak, ...res }
  }

  function taskDoneLocal() {
    const done: string[] = []
    if (learn.todayLearned >= 1) done.push('lesson')
    if (save.value.quizPlayedDate === dateKey()) done.push('quiz')
    if (focusMinutesToday.value >= 25) done.push('focus')
    if (signedToday.value) done.push('sign')
    return done
  }

  function grantTaskXp() {
    load()
    const today = dateKey()
    const done = taskDoneLocal()
    const claimed = save.value.claimed[today] ?? []
    const fresh = done.filter((id) => !claimed.includes(id))
    if (fresh.length === 0) return 0
    save.value.claimed[today] = [...claimed, ...fresh]
    let gained = fresh.length * 10
    if (save.value.claimed[today].length === TASK_DEFS.length && claimed.length < TASK_DEFS.length) gained += 5
    learn.addXp(gained)
    persist()
    return gained
  }

  async function refreshTasks() {
    load()
    learn.load()
    try {
      const stats = await fetchFocusStats()
      focusMinutesToday.value = stats.today.minutes
    } catch {
      focusMinutesToday.value = 0
    }
    return grantTaskXp()
  }

  const tasks = computed(() => {
    load()
    const done = taskDoneLocal()
    const claimed = save.value.claimed[dateKey()] ?? []
    return TASK_DEFS.map((t) => ({ ...t, done: done.includes(t.id), claimed: claimed.includes(t.id) }))
  })

  function markQuizPlayed() {
    load()
    save.value.quizPlayedDate = dateKey()
    persist()
    grantTaskXp()
  }

  return { signedToday, signDays, signStreak, monthSigns, tasks, wrongBook, collection, signIn, refreshTasks, markQuizPlayed }
})
