import { get, post } from './request'
import type { QuizAttempt, QuizQuestion, QuizStats, ReviewResult, WrongAnswer } from './types'

export interface QuizFetch {
  items: Array<Omit<QuizQuestion, 'answer' | 'explanation'>>
  roundId: string | null
  total: number
  group: { id: string; name: string } | null
}

export function fetchQuizQuestions(count = 10, groupId?: string) {
  const params = new URLSearchParams({ count: String(count) })
  if (groupId) params.set('group', groupId)
  return get<QuizFetch>(`/quiz/questions?${params}`)
}

export function submitQuizAttempt(roundId: string) {
  return post<{ attempt: QuizAttempt; best: { score: number; total: number; createdAt: string } | null }>(
    '/quiz/attempts',
    { roundId },
  )
}

export function submitQuizAnswer(roundId: string, questionId: string, choice: number) {
  return post<{ answer: number; explanation: string; correct: boolean; score: number }>(
    `/quiz/rounds/${roundId}/answers`, { questionId, choice },
  )
}

export function fetchQuizStats() {
  return get<QuizStats>('/quiz/stats')
}

/** 错题本；due 为真时只取今天该复习的 */
export function fetchWrongAnswers(due = false) {
  return get<{ items: WrongAnswer[]; total: number }>(`/quiz/wrong-answers${due ? '?due=1' : ''}`)
}

/** 复习一道错题：答对推进一轮（3/7/14 天），答错退回第一轮 */
export function reviewWrongAnswer(questionId: string, choice: number) {
  return post<ReviewResult>(`/quiz/wrong-answers/${questionId}/review`, { choice })
}
