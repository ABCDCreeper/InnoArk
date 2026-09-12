import { get, post } from './request'
import type { NotificationFeed, TeacherAnalytics } from './types'

/** 通知由既有数据派生：未读按服务端游标计算 */
export const fetchNotifications = () => get<NotificationFeed>('/notifications')

export const markNotificationsSeen = (seenAt?: string) =>
  post<{ seenAt: string }>('/notifications/seen', seenAt ? { seenAt } : {})

/** 教学总览：我可见项目的过程评价聚合 */
export const fetchTeacherAnalytics = () => get<TeacherAnalytics>('/teacher/analytics')
