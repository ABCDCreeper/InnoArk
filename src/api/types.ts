export type Role = 'student' | 'teacher'
export type ProjectStatus = 'active' | 'finished'
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done'

export interface User {
  id: string
  username: string
  name: string
  role: Role
}

export interface Topic {
  id: string
  title: string
  summary: string
  subjects: string[]
  tags: string[]
  difficulty: '入门' | '进阶' | '挑战'
}

export interface Project {
  id: string
  topicId: string
  groupId: string | null
  name: string
  status: 'active' | 'finished'
  inviteCode: string
  leaderId: string
  description: string
  createdAt: string
  updatedAt: string
  finishedAt: string | null
  topic: { id: string; title: string; subjects: string[] } | null
  group: { id: string; name: string } | null
  members: User[]
  progress: { done: number; total: number }
}

export interface MindNode {
  id: string
  projectId: string
  parentId: string | null
  label: string
  createdAt: string
  updatedAt: string
}

export interface StickyNote {
  id: string
  projectId: string
  content: string
  color: string
  x: number
  y: number
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  assigneeId: string | null
  status: TaskStatus
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskLog {
  id: string
  projectId: string
  taskId: string
  userId: string
  action: string
  detail: string
  createdAt: string
}

export interface Checkin {
  id: string
  projectId: string
  userId: string
  content: string
  createdAt: string
}

export interface Feedback {
  id: string
  projectId: string
  userId: string
  type: 'milestone' | 'guide'
  content: string
  createdAt: string
}

export interface Resource {
  id: string
  title: string
  category: string
  description: string
  url: string
  tags: string[]
}

export interface Annotation {
  id: string
  projectId: string
  userId: string
  content: string
  createdAt: string
}

export interface FocusSession {
  id: string
  userId: string
  durationMin: number
  type: 'focus' | 'break'
  createdAt: string
}

export interface QuizQuestion {
  id: string
  groupId: string | null
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null
  category: string
  difficulty: number
  question: string
  options: string[]
  answer: number
  explanation: string
}

export type QuizMode = 'group' | 'fallback' | 'mixed'

export interface QuizGroup {
  id: string
  name: string
  description: string
  quizMode: QuizMode
  inviteCode: string
  memberCount: number
  questionCount: number
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface GroupInvite {
  id: string
  groupId: string
  userId: string
  inviterId: string
  status: 'pending' | 'accepted' | 'declined'
  name: string
  username: string
  createdAt: string
}

export interface StudentInvite {
  id: string
  groupId: string
  status: 'pending' | 'accepted' | 'declined'
  groupName: string
  inviterName: string
  createdAt: string
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  role: 'teacher' | 'member'
  name: string
  username: string
  joinedAt: string
}

export interface UserBrief {
  id: string
  username: string
  name: string
  role: string
}

export interface QuizAttempt {
  id: string
  userId: string
  score: number
  total: number
  createdAt: string
}

export interface QuizStats {
  attempts: number
  best: { score: number; total: number; createdAt: string } | null
  last: { score: number; total: number; createdAt: string } | null
}

export interface FocusStats {
  today: { count: number; minutes: number }
  week: Array<{ date: string; count: number; minutes: number }>
}

export interface ArchiveMember {
  user: User
  taskCount: number
  doneCount: number
  checkinCount: number
}

export interface Archive {
  project: Project
  summary: {
    taskTotal: number
    doneTotal: number
    checkinTotal: number
    feedbackTotal: number
    durationDays: number
  }
  members: ArchiveMember[]
  tasks: Task[]
  checkins: Checkin[]
  feedbacks: Feedback[]
  mindNodes: MindNode[]
  annotations: Annotation[]
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
