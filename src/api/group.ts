import { del, get, patch, post } from './request'
import type { GroupMember, QuizGroup, QuizMode, QuizQuestion, UserBrief } from './types'

export interface QuestionBody {
  question: string
  category: string
  difficulty: number
  options: string[]
  answer: number
  explanation: string
}

export function fetchMyGroups() {
  return get<{ items: Array<{ id: string; name: string }>; total: number }>('/groups/mine')
}

export function fetchGroups() {
  return get<{ items: QuizGroup[]; total: number }>('/groups')
}

export function createGroup(body: { name: string; description?: string; quizMode?: QuizMode }) {
  return post<QuizGroup>('/groups', body)
}

export function updateGroup(id: string, body: { name?: string; description?: string; quizMode?: QuizMode }) {
  return patch<QuizGroup>(`/groups/${id}`, body)
}

export function deleteGroup(id: string) {
  return del<void>(`/groups/${id}`)
}

export function fetchGroupMembers(id: string) {
  return get<{ items: GroupMember[]; total: number }>(`/groups/${id}/members`)
}

export function addGroupMember(id: string, userId: string, role: 'teacher' | 'member') {
  return post<GroupMember>(`/groups/${id}/members`, { userId, role })
}

export function removeGroupMember(id: string, userId: string) {
  return del<void>(`/groups/${id}/members/${userId}`)
}

export function fetchGroupQuestions(id: string) {
  return get<{ items: QuizQuestion[]; total: number }>(`/groups/${id}/questions`)
}

export function createGroupQuestion(id: string, body: QuestionBody) {
  return post<QuizQuestion>(`/groups/${id}/questions`, body)
}

export function updateGroupQuestion(id: string, qid: string, body: QuestionBody) {
  return patch<QuizQuestion>(`/groups/${id}/questions/${qid}`, body)
}

export function deleteGroupQuestion(id: string, qid: string) {
  return del<void>(`/groups/${id}/questions/${qid}`)
}

export function searchUsers(keyword: string) {
  return get<{ items: UserBrief[]; total: number }>(`/users?keyword=${encodeURIComponent(keyword)}`)
}
