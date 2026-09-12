import { del, get, post, put } from './request'
import type { Evaluation, EvaluationList, TaskReview } from './types'

/** 同伴互评：成员对队友提交的成果给出认可或疑问 */
export const fetchTaskReviews = (taskId: string) =>
  get<{ items: TaskReview[] }>(`/tasks/${taskId}/reviews`)

export const createTaskReview = (
  taskId: string,
  body: { verdict: 'acknowledge' | 'question'; comment?: string },
) => post<TaskReview>(`/tasks/${taskId}/reviews`, body)

/** 教师量化评分（四个固定维度，1~5 分） */
export const fetchEvaluations = (projectId: string) =>
  get<EvaluationList>(`/projects/${projectId}/evaluations`)

export const saveEvaluation = (
  projectId: string,
  userId: string,
  body: { dimensions: Record<string, number>; comment?: string },
) => put<Evaluation>(`/projects/${projectId}/evaluations/${userId}`, body)

export const deleteEvaluation = (projectId: string, userId: string) =>
  del<void>(`/projects/${projectId}/evaluations/${userId}`)
