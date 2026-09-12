import { get, post } from './request'
import type { FocusSession, FocusStats, Paged } from './types'

export const createFocusSession = (durationMin: number, type: 'focus' | 'break', taskId?: string | null) =>
  post<FocusSession>('/focus-sessions', { durationMin, type, ...(taskId ? { taskId } : {}) })
export const fetchFocusSessions = () => get<Paged<FocusSession>>('/focus-sessions')
export const fetchFocusStats = (days = 7) =>
  // 带上客户端时区，否则「今日专注」按 UTC 自然日划分，本地要到早上 8 点才翻页
  get<FocusStats>(`/focus/stats?days=${days}&tzOffset=${-new Date().getTimezoneOffset()}`)
