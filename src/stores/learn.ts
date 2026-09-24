import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from './auth'
import { BADGES, CLEAR_BONUS_XP, COURSES, FIRST_PASS_XP, REPLAY_XP, levelOf, levelTitle, starsFor } from '../data/courses'
import type { BadgeDef, LearnCourse } from '../data/courses'

export interface LessonRecord { stars: 1 | 2 | 3; bestCorrect: number; bestTotal: number }

interface LearnSave {
  xp: number
  totalCorrect: number
  completed: Record<string, LessonRecord>
  badges: string[]
  streak: number
  lastLearnDate: string
}

export interface LessonResult {
  passed: boolean
  stars: 0 | 1 | 2 | 3
  gainedXp: number
  leveledUp: boolean
  newBadges: BadgeDef[]
  oldLevel: number
  newLevel: number
  record: LessonRecord | null
}

const emptySave = (): LearnSave => ({ xp: 0, totalCorrect: 0, completed: {}, badges: [], streak: 0, lastLearnDate: '' })

function dateKey(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const useLearnStore = defineStore('learn', () => {
  const auth = useAuthStore()
  const save = ref<LearnSave>(emptySave())
  let loadedUser: string | null = null

  function load() {
    const uid = auth.user?.id ?? 'guest'
    if (loadedUser === uid) return
    loadedUser = uid
    try {
      const parsed = JSON.parse(localStorage.getItem(`innoark_learn_${uid}`) || 'null') as Partial<LearnSave> | null
      save.value = { ...emptySave(), ...(parsed ?? {}) }
    } catch {
      save.value = emptySave()
    }
  }

  function persist() {
    localStorage.setItem(`innoark_learn_${auth.user?.id ?? 'guest'}`, JSON.stringify(save.value))
  }

  const xp = computed(() => save.value.xp)
  const level = computed(() => levelOf(save.value.xp))
  const title = computed(() => levelTitle(save.value.xp))
  const streak = computed(() => save.value.streak)
  const badgeIds = computed(() => save.value.badges)
  const allCleared = computed(() => COURSES.every((c) => courseStats(c).crowned))

  function recordOf(lessonId: string) {
    load()
    return save.value.completed[lessonId] ?? null
  }

  function isLessonUnlocked(course: LearnCourse, index: number) {
    load()
    if (index === 0) return true
    return !!save.value.completed[course.lessons[index - 1].id]
  }

  function courseStats(course: LearnCourse) {
    load()
    const done = course.lessons.filter((l) => save.value.completed[l.id]).length
    const stars = course.lessons.reduce((sum, l) => sum + (save.value.completed[l.id]?.stars ?? 0), 0)
    const maxStars = course.lessons.length * 3
    return { done, total: course.lessons.length, stars, maxStars, crowned: done === course.lessons.length && stars === maxStars }
  }

  function evaluateBadges(): BadgeDef[] {
    const earned: string[] = []
    if (Object.keys(save.value.completed).length >= 1) earned.push('first-clear')
    if (Object.values(save.value.completed).some((r) => r.bestCorrect === r.bestTotal)) earned.push('perfect-lesson')
    if (save.value.totalCorrect >= 25) earned.push('brain-25')
    if (save.value.xp >= 500) earned.push('xp-500')
    if (COURSES.some((c) => courseStats(c).crowned)) earned.push('course-crown')
    if (save.value.streak >= 3) earned.push('streak-3')
    if (allCleared.value) earned.push('all-courses')
    if (levelOf(save.value.xp) >= 5) earned.push('level-5')
    const fresh = earned.filter((id) => !save.value.badges.includes(id))
    save.value.badges.push(...fresh)
    return BADGES.filter((b) => fresh.includes(b.id))
  }

  function finishLesson(course: LearnCourse, lessonIndex: number, correct: number, total: number): LessonResult {
    load()
    const lesson = course.lessons[lessonIndex]
    const prev = save.value.completed[lesson.id] ?? null
    const firstPass = !prev
    const stars = starsFor(correct, total)
    const passed = stars >= 1
    let gainedXp = correct * (firstPass ? FIRST_PASS_XP : REPLAY_XP)
    if (passed && firstPass) gainedXp += CLEAR_BONUS_XP
    const oldLevel = levelOf(save.value.xp)
    save.value.xp += gainedXp
    save.value.totalCorrect += correct
    let record: LessonRecord | null = null
    if (passed) {
      record = {
        stars: Math.max(stars, prev?.stars ?? 0) as 1 | 2 | 3,
        bestCorrect: Math.max(correct, prev?.bestCorrect ?? 0),
        bestTotal: total,
      }
      save.value.completed[lesson.id] = record
    }
    const today = dateKey()
    if (save.value.lastLearnDate !== today) {
      save.value.streak = save.value.lastLearnDate === dateKey(1) ? save.value.streak + 1 : 1
      save.value.lastLearnDate = today
    }
    const newLevel = levelOf(save.value.xp)
    const newBadges = evaluateBadges()
    persist()
    return { passed, stars, gainedXp, leveledUp: newLevel > oldLevel, newBadges, oldLevel, newLevel, record }
  }

  function resetSave() {
    save.value = emptySave()
    persist()
  }

  return { xp, level, title, streak, badgeIds, load, recordOf, isLessonUnlocked, courseStats, allCleared, finishLesson, resetSave }
})
