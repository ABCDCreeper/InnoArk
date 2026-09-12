import { get, post, patch } from './request'
import type { AssessmentResponse, Paged, Project, Topic, ProjectAssessment } from './types'

export const fetchTopics = () => get<Paged<Topic>>('/topics')
export const fetchProjects = () => get<Paged<Project>>('/projects')
export const fetchProject = (id: string) => get<Project>(`/projects/${id}`)
export const fetchAssessment = (id: string) => get<ProjectAssessment>(`/projects/${id}/assessment`)
export const createProject = (topicId: string, name?: string) => post<Project>('/projects', { topicId, name })
export const joinProject = (inviteCode: string) => post<Project>('/projects/join', { inviteCode })
export const joinProjectDirect = (id: string) => post<Project>(`/projects/${id}/join`)
export const updateProject = (id: string, body: { name?: string; status?: 'finished'; description?: string }) =>
  patch<Project>(`/projects/${id}`, body)
/** 成员对过程评价预警补充说明（回应「与成员核实线下工作」这类建议）；可附本项目内的证据 */
export const createRiskResponse = (
  id: string,
  riskCode: string,
  content: string,
  evidence?: { evidenceType: 'checkin' | 'task'; evidenceId: string } | null,
) => post<AssessmentResponse>(`/projects/${id}/risk-responses`, { riskCode, content, ...(evidence ?? {}) })

/** 项目数据修订号：轮询时先比对这个数字，未变则不必重新拉取 */
export const fetchProjectRevision = (id: string) =>
  get<{ revision: number }>(`/projects/${id}/revision`)
