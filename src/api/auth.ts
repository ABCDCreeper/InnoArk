import { get, post, del } from './request'
import type { Role, User } from './types'

export interface LoginResult {
  token: string
  user: User
}

export const login = (username: string, password: string) => post<LoginResult>('/sessions', { username, password })
export const register = (payload: { username: string; password: string; name: string; role: Role }) => post<LoginResult>('/users', payload)
export const logout = () => del<void>('/sessions/current')
export const fetchMe = () => get<{ user: User }>('/me')
