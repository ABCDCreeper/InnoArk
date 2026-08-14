import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/auth'
import type { Role, User } from '../api/types'

const TOKEN_KEY = 'innoark_token'
const USER_KEY = 'innoark_user'

export const ROLE_RANK: Record<Role, number> = { student: 0, teacher: 1, schooladmin: 2, admin: 3, superadmin: 4 }

function loadUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(loadUser())

  const isAuthenticated = computed(() => !!token.value)
  const roleRank = computed(() => (user.value ? ROLE_RANK[user.value.role] : -1))
  const isTeacher = computed(() => roleRank.value >= 1)
  const isManager = computed(() => roleRank.value >= 2)

  async function login(username: string, password: string) {
    const res = await apiLogin(username, password)
    saveSession(res)
  }

  async function register(payload: { username: string; password: string; name: string; role: Role }) {
    const res = await apiRegister(payload)
    saveSession(res)
  }

  function saveSession(res: { token: string; user: User }) {
    token.value = res.token
    user.value = res.user
    localStorage.setItem(TOKEN_KEY, res.token)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
  }

  async function logout() {
    try {
      await apiLogout()
    } catch {
      // 忽略登出接口异常，本地状态照常清理
    }
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return { token, user, isAuthenticated, isTeacher, isManager, roleRank, login, register, logout }
})
