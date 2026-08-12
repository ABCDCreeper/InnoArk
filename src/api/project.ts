import { get, post, patch } from './request'
import type { Paged, Project, Topic } from './types'

export const fetchTopics = () => get<Paged<Topic>>('/topics')
export const fetchProjects = () => get<Paged<Project>>('/projects')
export const fetchProject = (id: string) => get<Project>(`/projects/${id}`)
export const createProject = (topicId: string, name?: string) => post<Project>('/projects', { topicId, name })
export const joinProject = (inviteCode: string) => post<Project>('/projects/join', { inviteCode })
export const updateProject = (id: string, body: { name?: string; status?: 'finished'; description?: string }) =>
  patch<Project>(`/projects/${id}`, body)
