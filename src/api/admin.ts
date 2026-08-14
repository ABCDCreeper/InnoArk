import { del, get, patch, post } from './request'
import type { UserBrief } from './types'

export const fetchAdminUsers = (keyword?: string) =>
  get<{ items: UserBrief[]; total: number }>(`/admin/users${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`)

export const createAdminUser = (body: { username: string; password: string; name: string; role: string }) =>
  post<UserBrief>('/admin/users', body)

export const updateAdminUser = (id: string, body: { name?: string; password?: string; role?: string }) =>
  patch<UserBrief>(`/admin/users/${id}`, body)

export const deleteAdminUser = (id: string) => del<void>(`/admin/users/${id}`)
