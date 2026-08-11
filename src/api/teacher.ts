import { get, post } from './request'
import type { Annotation, Paged, Project } from './types'

export const fetchTeacherProjects = () => get<Paged<Project>>('/teacher/projects')
export const fetchAnnotations = (projectId: string) => get<Paged<Annotation>>(`/projects/${projectId}/annotations`)
export const createAnnotation = (projectId: string, content: string) =>
  post<Annotation>(`/projects/${projectId}/annotations`, { content })
