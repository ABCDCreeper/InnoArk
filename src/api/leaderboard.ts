import { get } from './request'
import type { LeaderboardItem } from './types'

export function fetchLeaderboard(scope: 'total' | 'week' = 'total') {
  return get<{ scope: string; items: LeaderboardItem[] }>(`/leaderboard?scope=${scope}`)
}
