import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from './auth'
import { useLearnStore } from './learn'
import { useNotifyStore } from './notify'
import { fetchFocusStats } from '../api/focus'
import { COURSES } from '../data/courses'
import { CARDS, cardsOfSet, pickOne } from '../data/collection'
import type { CollectionCard } from '../data/collection'

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
  battleWins: number
  battleTotal: number
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
  battleWins: 0,
  battleTotal: 0,
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
  const notify = useNotifyStore()
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
    notify.push(`📅 签到成功，+${xpGained} XP`, '/learn')
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
    notify.push(`🎯 每日任务完成，+${gained} XP`, '/learn')
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

  const COURSE_SET: Record<string, string> = { 'c-kitchen': 's-kitchen', 'c-body': 's-body', 'c-code': 's-code' }

  function grantFromPool(pool: CollectionCard[]): CollectionCard | null {
    const fresh = pool.filter((c) => !save.value.collection.includes(c.id))
    if (fresh.length === 0) return null
    const card = pickOne(fresh)
    save.value.collection.push(card.id)
    const owned = cardsOfSet(card.set)
    const complete = owned.every((c) => save.value.collection.includes(c.id))
    if (complete) learn.addXp(30)
    persist()
    return card
  }

  function grantLessonDrop(courseId: string): CollectionCard | null {
    load()
    const setId = COURSE_SET[courseId]
    if (!setId) return null
    return grantFromPool(cardsOfSet(setId))
  }

  function grantQuizDrop(correct: number): CollectionCard | null {
    load()
    if (correct < 6) return null
    return grantFromPool(CARDS)
  }

  function setComplete(setId: string) {
    load()
    return cardsOfSet(setId).every((c) => save.value.collection.includes(c.id))
  }

  function setOwnedCount(setId: string) {
    load()
    return cardsOfSet(setId).filter((c) => save.value.collection.includes(c.id)).length
  }

  function recordWrong(item: { question: string; options: string[]; answer: number; explanation: string }) {
    load()
    if (save.value.wrongBook.some((w) => w.question === item.question)) return
    save.value.wrongBook.unshift({ ...item, date: dateKey() })
    if (save.value.wrongBook.length > 50) save.value.wrongBook.length = 50
    persist()
  }

  function removeWrong(question: string) {
    load()
    save.value.wrongBook = save.value.wrongBook.filter((w) => w.question !== question)
    persist()
  }

  function clearWrong() {
    load()
    save.value.wrongBook = []
    persist()
  }

  const dailyQuestion = ref<{ question: string; options: string[]; answer: number; explanation: string } | null>(null)
  const dailyResult = computed(() => {
    load()
    return save.value.daily[dateKey()] ?? null
  })

  function initDailyQuestion(fetcher: () => Promise<{ items: Array<{ question: string; options: string[]; answer: number; explanation: string }> }>) {
    const today = dateKey()
    const hash = [...today].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9973, 7)
    fetcher()
      .then((res) => {
        if (res.items.length === 0) return
        const sorted = [...res.items].sort((a, b) => a.question.localeCompare(b.question))
        const q = sorted[hash % sorted.length]
        dailyQuestion.value = { question: q.question, options: q.options, answer: q.answer, explanation: q.explanation }
      })
      .catch(() => {
        const pool = COURSES.flatMap((c) => c.lessons.flatMap((l) => l.questions))
        const q = pool[hash % pool.length]
        dailyQuestion.value = { ...q }
      })
  }

  function answerDaily(correct: boolean) {
    load()
    const today = dateKey()
    if (save.value.daily[today] !== undefined) return null
    save.value.daily[today] = correct
    if (!correct) {
      save.value.dailyStreak = 0
      save.value.dailyLastDate = today
      persist()
      return { xpGained: 0, leveledUp: false }
    }
    save.value.dailyStreak = save.value.dailyLastDate === dateKey(1) ? save.value.dailyStreak + 1 : 1
    save.value.dailyLastDate = today
    const xpGained = 5 + 2 * Math.min(Math.max(save.value.dailyStreak - 1, 0), 5)
    const res = learn.addXp(xpGained)
    notify.push(`🌟 每日一题答对，+${xpGained} XP`, '/quiz')
    persist()
    return { xpGained, ...res }
  }

  function recordBattle(win: boolean) {
    load()
    save.value.battleTotal += 1
    if (win) save.value.battleWins += 1
    const xpGained = win ? 30 : 10
    const res = learn.addXp(xpGained)
    notify.push(win ? '⚔️ 对战胜利，+30 XP' : '⚔️ 对战惜败，+10 XP', '/battle')
    persist()
    return { xpGained, ...res }
  }

  const battleWins = computed(() => {
    load()
    return save.value.battleWins
  })
  const battleTotal = computed(() => {
    load()
    return save.value.battleTotal
  })

  // 用 computed 跟随 save.value：切换用户 load() 替换整个 save 后，signs 仍指向当前用户的数据
  const signs = computed(() => save.value.signs)
  return { signedToday, signDays, signStreak, monthSigns, signs, tasks, wrongBook, collection, signIn, refreshTasks, markQuizPlayed, grantLessonDrop, grantQuizDrop, setComplete, setOwnedCount, recordWrong, removeWrong, clearWrong, dailyQuestion, dailyResult, initDailyQuestion, answerDaily, recordBattle, battleWins, battleTotal }
})
