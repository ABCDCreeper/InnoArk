import { del, get, patch, post } from './request'
import type { AuditLog, School, UserBrief } from './types'

export const fetchAdminUsers = (keyword?: string) =>
  get<{ items: UserBrief[]; total: number }>(`/admin/users${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`)

export const createAdminUser = (body: { username: string; password: string; name: string; role: string }) =>
  post<UserBrief>('/admin/users', body)

export const updateAdminUser = (
  id: string,
  body: { name?: string; password?: string; role?: string; schoolId?: string | null },
) => patch<UserBrief>(`/admin/users/${id}`, body)

export const deleteAdminUser = (id: string) => del<void>(`/admin/users/${id}`)

/** 学校列表：用于把账号与分组归入学校 */
export const fetchSchools = () => get<{ items: School[]; total: number }>('/admin/schools')

/** 管理操作审计：谁在何时对什么做了什么 */
export const fetchAuditLogs = (limit = 50) =>
  get<{ items: AuditLog[]; total: number }>(`/admin/audit-logs?limit=${limit}`)

/** 重置为初始演示数据（仅平台管理员）；会清空全部账号，之后需重新登录 */
export const resetDemoData = () => post<{ reset: boolean }>('/admin/demo/reset')
