import { get, post } from './request'
import type { QuizAttempt, QuizQuestion, QuizStats } from './types'

export interface QuizFetch {
  items: QuizQuestion[]
  total: number
  group: { id: string; name: string } | null
}

export function fetchQuizQuestions(count = 10, groupId?: string) {
  const params = new URLSearchParams({ count: String(count) })
  if (groupId) params.set('group', groupId)
  return get<QuizFetch>(`/quiz/questions?${params}`)
}

export function submitQuizAttempt(score: number, total: number) {
  return post<{ attempt: QuizAttempt; best: { score: number; total: number; createdAt: string } | null }>(
    '/quiz/attempts',
    { score, total },
  )
}

export function fetchQuizStats() {
  return get<QuizStats>('/quiz/stats')
}
