import { get, post } from './request'
import type { Checkin, Feedback, Paged, Resource } from './types'

export const fetchResources = (query?: { category?: string; keyword?: string }) => {
  const params = new URLSearchParams()
  if (query?.category) params.set('category', query.category)
  if (query?.keyword) params.set('keyword', query.keyword)
  const qs = params.toString()
  return get<Paged<Resource>>(`/resources${qs ? `?${qs}` : ''}`)
}

export const fetchCheckins = (projectId: string) => get<Paged<Checkin>>(`/projects/${projectId}/checkins`)
export const createCheckin = (projectId: string, content: string) =>
  post<Checkin>(`/projects/${projectId}/checkins`, { content })
export const fetchFeedbacks = (projectId: string) => get<Paged<Feedback>>(`/projects/${projectId}/feedbacks`)
