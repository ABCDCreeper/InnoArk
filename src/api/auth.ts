import { get, post, del } from './request'
import type { User } from './types'

export interface LoginResult {
  token: string
  user: User
}

export const login = (username: string, password: string) => post<LoginResult>('/sessions', { username, password })
export const logout = () => del<void>('/sessions/current')
export const fetchMe = () => get<{ user: User }>('/me')
