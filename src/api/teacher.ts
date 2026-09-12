import { get, post } from './request'
import type { Annotation, Paged, Project, Task } from './types'

export const fetchTeacherProjects = (groupId?: string) =>
  get<Paged<Project>>(`/teacher/projects${groupId ? `?group=${groupId}` : ''}`)
export const fetchAnnotations = (projectId: string) => get<Paged<Annotation>>(`/projects/${projectId}/annotations`)
export const createAnnotation = (projectId: string, content: string) =>
  post<Annotation>(`/projects/${projectId}/annotations`, { content })
/** 把教师批注转成任务：形成「批注 → 任务 → 验收 → 档案」的可追溯链路 */
export const createTaskFromAnnotation = (
  annotationId: string,
  body: { title?: string; description?: string; dueDate?: string | null; assigneeId?: string | null },
) => post<Task>(`/annotations/${annotationId}/tasks`, body)
