import { get } from './request'
import type { Archive } from './types'

export const fetchArchive = (projectId: string) => get<Archive>(`/projects/${projectId}/archive`)
