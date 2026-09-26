import { get, post } from './request'
import type { Annotation, Paged, Project, TeacherStatsItem } from './types'

export interface TeacherActivity { type: string; name: string; username: string; text: string; createdAt: string }

export const fetchTeacherProjects = (groupId?: string) =>
  get<Paged<Project>>(`/teacher/projects${groupId ? `?group=${groupId}` : ''}`)
export const fetchTeacherActivity = () => get<Paged<TeacherActivity>>('/teacher/activity')
export const fetchTeacherStats = () => get<Paged<TeacherStatsItem>>('/teacher/stats')
export const fetchAnnotations = (projectId: string) => get<Paged<Annotation>>(`/projects/${projectId}/annotations`)
export const createAnnotation = (projectId: string, content: string) =>
  post<Annotation>(`/projects/${projectId}/annotations`, { content })
