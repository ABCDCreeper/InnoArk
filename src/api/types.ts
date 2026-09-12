export type Role = 'student' | 'teacher' | 'schooladmin' | 'admin' | 'superadmin'
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
  permissions: { edit: boolean; review: boolean; finish: boolean; annotate: boolean }
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

/** 验收标准：done 表示教师验收时确认达标 */
export interface TaskCriterion {
  text: string
  done: boolean
}

export interface Task {
  statusChangedAt: string
  id: string
  projectId: string
  title: string
  description: string
  assigneeId: string | null
  status: TaskStatus
  dueDate: string | null
  createdAt: string
  updatedAt: string
  /** 由教师批注派生时指向来源批注 */
  sourceAnnotationId: string | null
  /** JSON 字符串数组 [{ text, done }]，为空表示未设验收标准 */
  criteria: string | null
  verifiedBy: string | null
  verifiedAt: string | null
  /** 验收人姓名，由后端 join 给出（教师不在项目成员表里） */
  verifiedByName: string | null
  /** 关联到该任务的专注分钟数（番茄钟记录的真实时长） */
  focusMinutes: number
  /** 该项任务收到的同伴互评条数 */
  peerReviewCount: number
}

/** 同伴互评：成员对队友成果的认可或疑问 */
export interface TaskReview {
  id: string
  taskId: string
  projectId: string
  reviewerId: string
  reviewerName: string | null
  verdict: 'acknowledge' | 'question'
  comment: string
  createdAt: string
}

/** 教师量化评分：四个维度的分值（1~5） */
export interface Evaluation {
  id: string
  projectId: string
  userId: string
  userName: string | null
  evaluatorId: string
  evaluatorName: string | null
  dimensions: Record<string, number>
  total: number
  maxTotal: number
  comment: string
  createdAt: string
  updatedAt: string
}

export interface EvaluationList {
  items: Evaluation[]
  total: number
  dimensions: Array<{ key: string; label: string }>
  min: number
  max: number
}

export interface AppNotification {
  type: 'annotation' | 'returned' | 'due' | 'verify' | 'invite' | 'quiz' | 'peer_review'
  title: string
  detail: string
  createdAt: string
  link: string
  unread: boolean
}

export interface NotificationFeed {
  items: AppNotification[]
  total: number
  unread: number
  seenAt: string
}

/** 教学总览：把单项目的过程评价聚合到课堂层面 */
export interface AnalyticsRow {
  project: { id: string; name: string; groupId: string | null; updatedAt: string }
  summary: ProjectAssessment['summary']
  warningCount: number
  infoCount: number
  topRisks: Array<{ code: string; title: string; level: 'warning' | 'info' }>
  memberCount: number
  activeMembers: number
}

export interface TeacherAnalytics {
  items: AnalyticsRow[]
  total: number
  withRisks: number
  asOf: string
  scopedToSchool: string | null
}

export interface TaskLog {
  userName?: string | null
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
  /** 离线补交的幂等键；同一 clientId 只会入库一次 */
  clientId: string | null
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
  /** 批注作者姓名，由后端 join users 给出（前端不应猜测作者） */
  userName: string | null
  /** 由该批注派生的任务，用于展示「批注 → 任务 → 验收」的闭环 */
  linkedTasks: Array<{ id: string; title: string; status: TaskStatus
    verifiedAt: string | null; verifiedByName: string | null }>
}

export interface AssessmentResponse {
  id: string
  projectId: string
  riskCode: string
  userId: string
  content: string
  createdAt: string
  userName: string | null
  /** 补充说明引用的证据（本项目内的打卡或任务） */
  evidenceType: 'checkin' | 'task' | null
  evidenceId: string | null
  evidenceLabel: string | null
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
  /** 归属学校；为空表示任何管理角色可见 */
  schoolId?: string | null
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
  /** 学校归属；为空表示不受学校约束（平台管理员或未归属账号） */
  schoolId?: string | null
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
  wrong: { open: number; due: number }
}

/** 错题本条目：不含 answer/explanation，答案只在提交复习结果时返回 */
export interface WrongAnswer {
  id: string
  questionId: string
  choice: number
  stage: number
  nextReviewAt: string
  createdAt: string
  resolvedAt: string | null
  category: string
  difficulty: number
  question: string
  options: string[]
  stageLabel: string
}

export interface ReviewResult {
  correct: boolean
  answer: number
  explanation: string
  stage: number
  resolved: boolean
  nextReviewAt: string
  totalStages: number
}

export interface AuditLog {
  id: string
  actorId: string
  actorName: string | null
  action: string
  targetType: string
  targetId: string
  detail: string
  createdAt: string
}

export interface School {
  id: string
  name: string
  createdAt: string
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
  focusMinutes: number
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
  peerReviews: TaskReview[]
  evaluations: Evaluation[]
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ProjectAssessment {
  version: string
  asOf: string
  status: ProjectStatus
  summary: { total: number; done: number; overdue: number; review: number; unassigned: number;
    completionRate: number | null; activeMembers: number; memberCount: number }
  members: Array<{ user: User; assigned: number; completed: number; completionShare: number | null;
    activeDays: number; focusMinutes: number; lastActiveAt: string | null }>
  risks: Array<{ code: string; level: 'warning' | 'info'; title: string; evidence: string; action: string;
    taskIds: string[]; userIds: string[]; responses: AssessmentResponse[] }>
  tasks: Array<{ id: string; title: string }>
  /** 与最近一份历史快照的对比；没有历史快照时为 null（不编造趋势） */
  trend: AssessmentTrend | null
  /** 同伴互评概览 */
  peerReview: { total: number; acknowledge: number; question: number; questionedTaskIds: string[] }
  /** 教师量化评分汇总；count 为 0 表示尚未评分，不当作零分 */
  /** count 为评分条数（可能多于人数），members 为被评分的成员数 */
  evaluation: { count: number; members: number; avgTotal: number | null; dimensions: Record<string, number> }
}

export interface AssessmentTrend {
  baseDate: string
  metrics: Record<string, { now: number; before: number; delta: number }>
  risksAdded: string[]
  risksResolved: string[]
}
