import { get, post } from './request'
import type { QuizAttempt, QuizQuestion, QuizStats } from './types'

export function fetchQuizQuestions(count = 10) {
  return get<{ items: QuizQuestion[]; total: number }>(`/quiz/questions?count=${count}`)
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
