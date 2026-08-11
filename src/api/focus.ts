import { get, post } from './request'
import type { FocusSession, FocusStats, Paged } from './types'

export const createFocusSession = (durationMin: number, type: 'focus' | 'break') =>
  post<FocusSession>('/focus-sessions', { durationMin, type })
export const fetchFocusSessions = () => get<Paged<FocusSession>>('/focus-sessions')
export const fetchFocusStats = (days = 7) => get<FocusStats>(`/focus/stats?days=${days}`)
