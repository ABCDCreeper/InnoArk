import { get, post, patch, del } from './request'
import type { MindNode, Paged, StickyNote } from './types'

export const fetchMindNodes = (projectId: string) => get<Paged<MindNode>>(`/projects/${projectId}/mind-nodes`)
export const createMindNode = (projectId: string, parentId: string | null, label: string) =>
  post<MindNode>(`/projects/${projectId}/mind-nodes`, { parentId, label })
export const updateMindNode = (id: string, label: string) => patch<MindNode>(`/mind-nodes/${id}`, { label })
export const deleteMindNode = (id: string) => del<void>(`/mind-nodes/${id}`)

export const fetchNotes = (projectId: string) => get<Paged<StickyNote>>(`/projects/${projectId}/notes`)
export const createNote = (projectId: string, body: Partial<StickyNote>) =>
  post<StickyNote>(`/projects/${projectId}/notes`, body)
export const updateNote = (id: string, body: Partial<StickyNote>) => patch<StickyNote>(`/notes/${id}`, body)
export const deleteNote = (id: string) => del<void>(`/notes/${id}`)
