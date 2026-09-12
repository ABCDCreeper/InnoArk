import { get, post, patch, del } from './request'
import type { Paged, Task, TaskCriterion, TaskLog, TaskStatus } from './types'

export const fetchTasks = (projectId: string, query?: { status?: TaskStatus; assigneeId?: string }) => {
  const params = new URLSearchParams()
  if (query?.status) params.set('status', query.status)
  if (query?.assigneeId) params.set('assigneeId', query.assigneeId)
  const qs = params.toString()
  return get<Paged<Task>>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`)
}
export const createTask = (
  projectId: string,
  body: { title: string; description?: string; dueDate?: string | null; criteria?: TaskCriterion[] },
) => post<Task>(`/projects/${projectId}/tasks`, body)
export const updateTask = (
  id: string,
  body: Partial<Pick<Task, 'title' | 'description' | 'dueDate' | 'assigneeId' | 'status'>> & {
    criteria?: TaskCriterion[]
  },
) => patch<Task>(`/tasks/${id}`, body)
export const deleteTask = (id: string) => del<void>(`/tasks/${id}`)
export const fetchTaskLogs = (projectId: string) => get<Paged<TaskLog>>(`/projects/${projectId}/task-logs`)
/** 批量验收：逐项返回结果，某一项状态已变时只跳过该项而不是整体失败 */
export const batchVerifyTasks = (projectId: string, taskIds: string[]) =>
  post<{ results: Array<{ id: string; title?: string; status: string; reason?: string }>; verified: number }>(
    `/projects/${projectId}/tasks/batch-verify`, { taskIds },
  )
