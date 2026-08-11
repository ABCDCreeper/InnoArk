import { get, post, patch, del } from './request'
import type { Paged, Task, TaskLog, TaskStatus } from './types'

export const fetchTasks = (projectId: string, query?: { status?: TaskStatus; assigneeId?: string }) => {
  const params = new URLSearchParams()
  if (query?.status) params.set('status', query.status)
  if (query?.assigneeId) params.set('assigneeId', query.assigneeId)
  const qs = params.toString()
  return get<Paged<Task>>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`)
}
export const createTask = (projectId: string, body: { title: string; description?: string; dueDate?: string | null }) =>
  post<Task>(`/projects/${projectId}/tasks`, body)
export const updateTask = (
  id: string,
  body: Partial<Pick<Task, 'title' | 'description' | 'dueDate' | 'assigneeId' | 'status'>>,
) => patch<Task>(`/tasks/${id}`, body)
export const deleteTask = (id: string) => del<void>(`/tasks/${id}`)
export const fetchTaskLogs = (projectId: string) => get<Paged<TaskLog>>(`/projects/${projectId}/task-logs`)
