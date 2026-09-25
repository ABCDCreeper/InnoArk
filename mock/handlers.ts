import type { DB, Feedback, GroupInviteRec, GroupMemberRec, Member, Project, QuizAttemptRec, QuizGroup, QuizQuestionRec, Role, Task, TaskStatus, User } from './db.ts'
import { ROLE_RANK, createToken, genId, now, parseToken, pick, rankOf } from './db.ts'

export interface Ctx {
  db: DB
  user: User
  params: Record<string, string>
  query: URLSearchParams
  body: Record<string, any>
}

export class HttpError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type Handler = (ctx: Ctx) => { status: number; body?: any } | void

const badRequest = (message = '请求参数错误') => new HttpError(400, 'VALIDATION_ERROR', message)
const forbidden = (message = '无权限执行此操作') => new HttpError(403, 'FORBIDDEN', message)
const notFound = (message = '资源不存在') => new HttpError(404, 'NOT_FOUND', message)

function userBrief(user: User) {
  const { password, ...brief } = user
  return brief
}

function memberOf(db: DB, projectId: string, userId: string): Member {
  const member = db.members.find((m) => m.projectId === projectId && m.userId === userId)
  if (!member) throw forbidden('仅项目成员可执行此操作')
  return member
}

function getProject(db: DB, id: string): Project {
  const project = db.projects.find((p) => p.id === id)
  if (!project) throw new HttpError(404, 'PROJECT_NOT_FOUND', '项目不存在')
  return project
}

function getTask(db: DB, id: string): Task {
  const task = db.tasks.find((t) => t.id === id)
  if (!task) throw new HttpError(404, 'TASK_NOT_FOUND', '任务不存在')
  return task
}

function projectMembers(db: DB, projectId: string): User[] {
  return db.members.filter((m) => m.projectId === projectId).map((m) => db.users.find((u) => u.id === m.userId)!).filter(Boolean)
}

function projectProgress(db: DB, projectId: string) {
  const tasks = db.tasks.filter((t) => t.projectId === projectId)
  return { done: tasks.filter((t) => t.status === 'done').length, total: tasks.length }
}

function touchProject(project: Project) {
  project.updatedAt = now()
  return project.updatedAt
}

function projectView(db: DB, project: Project) {
  const topic = db.topics.find((t) => t.id === project.topicId)
  const group = project.groupId ? db.quizGroups.find((g) => g.id === project.groupId) : null
  return {
    ...project,
    description: project.description ?? '',
    topic: topic ? { id: topic.id, title: topic.title, subjects: topic.subjects } : null,
    group: group ? { id: group.id, name: group.name } : null,
    members: projectMembers(db, project.id).map(userBrief),
    progress: projectProgress(db, project.id),
  }
}

function getGroup(db: DB, id: string): QuizGroup {
  const group = db.quizGroups.find((g) => g.id === id)
  if (!group) throw notFound('用户组不存在')
  return group
}

function requireGroupLead(db: DB, groupId: string, user: User) {
  if (rankOf(user) < 1) throw forbidden('仅教师可管理用户组')
  if (!db.groupMembers.some((m) => m.groupId === groupId && m.userId === user.id && m.role === 'teacher')) {
    throw forbidden('仅小组负责老师可执行此操作')
  }
}

function groupMemberViews(db: DB, groupId: string) {
  return db.groupMembers
    .filter((m) => m.groupId === groupId)
    .map((m) => {
      const u = db.users.find((x) => x.id === m.userId)
      return { id: m.id, groupId: m.groupId, userId: m.userId, role: m.role, name: u?.name ?? '', username: u?.username ?? '', joinedAt: m.joinedAt }
    })
    .sort((a, b) => (a.role === b.role ? a.joinedAt.localeCompare(b.joinedAt) : a.role === 'teacher' ? -1 : 1))
}

function groupView(db: DB, group: QuizGroup) {
  return {
    ...group,
    memberCount: db.groupMembers.filter((m) => m.groupId === group.id).length,
    questionCount: db.quizQuestions.filter((q) => q.groupId === group.id).length,
    projectCount: db.projects.filter((p) => p.groupId === group.id).length,
  }
}

function inviteView(db: DB, invite: GroupInviteRec) {
  const user = db.users.find((u) => u.id === invite.userId)
  return { ...invite, name: user?.name ?? '', username: user?.username ?? '' }
}

function validateQuestionBody(body: Record<string, any>) {
  const question = String(body.question ?? '').trim()
  if (!question) throw badRequest('题干不能为空')
  if (!Array.isArray(body.options) || body.options.length < 2 || body.options.some((o: any) => !String(o ?? '').trim())) {
    throw badRequest('选项至少 2 个且不能为空')
  }
  const answer = Number(body.answer)
  if (!Number.isInteger(answer) || answer < 0 || answer >= body.options.length) throw badRequest('正确答案下标无效')
  const difficulty = Number(body.difficulty)
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 3) throw badRequest('难度必须是 1-3')
  const category = String(body.category ?? '').trim() || '综合'
  return {
    question,
    options: body.options.map((o: any) => String(o)),
    answer,
    difficulty,
    category,
    explanation: String(body.explanation ?? '').trim(),
  }
}

function addLog(db: DB, projectId: string, taskId: string, user: User, action: string, detail: string) {
  db.taskLogs.push({ id: genId('log'), projectId, taskId, userId: user.id, action, detail, createdAt: now() })
}

function addFeedback(db: DB, projectId: string, user: User, type: Feedback['type'], content: string) {
  db.feedbacks.push({ id: genId('fb'), projectId, userId: user.id, type, content, createdAt: now() })
}

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '待认领',
  doing: '进行中',
  review: '待验收',
  done: '已完成',
}

const FEEDBACK_POOL = [
  '里程碑达成！你们把一个大目标拆成了可执行的小步，这正是工程师思维。',
  '干得漂亮！这一步的完成意味着整个项目又向前推进了一截。',
  '进度同步得很好，接下来可以尝试把成果整理成可视化材料。',
  '团队协作满分！记得在打卡里记录下这次尝试中的收获与踩坑。',
  '这个节点很关键，完成后建议做一次小复盘，把经验沉淀到档案里。',
  '思路清晰，继续推进！遇到瓶颈时回到星云看板看看最初的想法。',
]

function handleTaskStatusChange(db: DB, task: Task, user: User, oldStatus: TaskStatus) {
  addLog(db, task.projectId, task.id, user, 'status', `状态更新为 ${TASK_STATUS_LABEL[task.status]}`)
  if (task.status === 'done' && oldStatus !== 'done') {
    db.checkins.push({
      id: genId('ck'),
      projectId: task.projectId,
      userId: user.id,
      content: `完成里程碑任务「${task.title}」`,
      createdAt: now(),
    })
    addFeedback(db, task.projectId, user, 'milestone', pick(FEEDBACK_POOL))
  }
}

function shuffled<T>(arr: T[]) {
  const items = arr.slice()
  for (let i = items.length - 1; i > 0; i--) {
    const r = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
    const j = Math.floor(r * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

const routes: Array<{ method: string | string[]; pattern: RegExp; handler: Handler; public?: boolean }> = [
  {
    method: 'POST',
    pattern: /^\/api\/sessions$/,
    public: true,
    handler: (ctx) => {
      const { username, password } = ctx.body
      if (!username || !password) throw badRequest('用户名和密码不能为空')
      const user = ctx.db.users.find((u) => u.username === username && u.password === password)
      if (!user) throw new HttpError(401, 'INVALID_CREDENTIALS', '用户名或密码错误')
      return { status: 201, body: { token: createToken(user.id), user: userBrief(user) } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/users$/,
    public: true,
    handler: (ctx) => {
      const { username, password, name, role } = ctx.body
      if (!username || !password || !name) throw badRequest('用户名、密码和姓名不能为空')
      if (String(username).length < 3) throw badRequest('用户名至少 3 个字符')
      if (String(password).length < 6) throw badRequest('密码至少 6 个字符')
      if (role !== 'student' && role !== 'teacher') throw badRequest('角色只能是 student 或 teacher')
      if (ctx.db.users.some((u) => u.username === username)) throw new HttpError(409, 'USERNAME_TAKEN', '用户名已被占用')
      const user: User = { id: genId('u'), username, password, name, role }
      ctx.db.users.push(user)
      return { status: 201, body: { token: createToken(user.id), user: userBrief(user) } }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/sessions\/current$/,
    handler: () => ({ status: 204 }),
  },
  {
    method: 'GET',
    pattern: /^\/api\/me$/,
    handler: (ctx) => ({ status: 200, body: { user: userBrief(ctx.user) } }),
  },
  {
    method: 'GET',
    pattern: /^\/api\/topics$/,
    handler: (ctx) => {
      const items = ctx.db.topics
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects$/,
    handler: (ctx) => {
      const mine = ctx.db.members.filter((m) => m.userId === ctx.user.id).map((m) => m.projectId)
      const items = ctx.db.projects.filter((p) => mine.includes(p.id)).map((p) => projectView(ctx.db, p))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/projects$/,
    handler: (ctx) => {
      const topicId = ctx.body.topicId
      const topic = ctx.db.topics.find((t) => t.id === topicId)
      if (!topic) throw badRequest('课题不存在')
      const project: Project = {
        id: genId('p'),
        topicId,
        name: ctx.body.name || topic.title,
        status: 'active',
        inviteCode: `P${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        leaderId: ctx.user.id,
        createdAt: now(),
        updatedAt: now(),
        finishedAt: null,
      }
      ctx.db.projects.push(project)
      ctx.db.members.push({ id: genId('m'), projectId: project.id, userId: ctx.user.id, joinedAt: now() })
      ctx.db.mindNodes.push({ id: genId('mn'), projectId: project.id, parentId: null, label: project.name, createdAt: now(), updatedAt: now() })
      return { status: 201, body: projectView(ctx.db, project) }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/projects\/join$/,
    handler: (ctx) => {
      const inviteCode = ctx.body.inviteCode
      const project = ctx.db.projects.find((p) => p.inviteCode.toLowerCase() === String(inviteCode || '').toLowerCase())
      if (!project) throw new HttpError(409, 'INVALID_INVITE', '邀请码无效')
      if (ctx.db.members.some((m) => m.projectId === project.id && m.userId === ctx.user.id)) {
        throw new HttpError(409, 'ALREADY_MEMBER', '你已在该项目中')
      }
      const count = ctx.db.members.filter((m) => m.projectId === project.id).length
      if (count >= 4) throw new HttpError(409, 'TEAM_FULL', '队伍已满（最多 4 人）')
      ctx.db.members.push({ id: genId('m'), projectId: project.id, userId: ctx.user.id, joinedAt: now() })
      return { status: 201, body: projectView(ctx.db, project) }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/projects\/([^/]+)\/join$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (project.status !== 'active') throw new HttpError(409, 'PROJECT_NOT_ACTIVE', '项目已结题，无法加入')
      if (ctx.db.members.some((m) => m.projectId === project.id && m.userId === ctx.user.id)) {
        throw new HttpError(409, 'ALREADY_MEMBER', '你已在该项目中')
      }
      const count = ctx.db.members.filter((m) => m.projectId === project.id).length
      if (count >= 4) throw new HttpError(409, 'TEAM_FULL', '队伍已满（最多 4 人）')
      ctx.db.members.push({ id: genId('m'), projectId: project.id, userId: ctx.user.id, joinedAt: now() })
      return { status: 201, body: projectView(ctx.db, project) }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/([^/]+)$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (rankOf(ctx.user) < 1) memberOf(ctx.db, project.id, ctx.user.id)
      return { status: 200, body: projectView(ctx.db, project) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/projects\/([^/]+)$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      memberOf(ctx.db, project.id, ctx.user.id)
      if (ctx.body.name !== undefined) {
        if (!ctx.body.name) throw badRequest('项目名称不能为空')
        project.name = ctx.body.name
      }
      if (ctx.body.description !== undefined) {
        project.description = ctx.body.description
      }
      if (ctx.body.status === 'finished') {
        project.status = 'finished'
        project.finishedAt = now()
        addFeedback(ctx.db, project.id, ctx.user, 'milestone', '项目已结题！系统已自动整合全部过程记录，生成科创档案。')
      }
      touchProject(project)
      return { status: 200, body: projectView(ctx.db, project) }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/([^/]+)\/mind-nodes$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (rankOf(ctx.user) < 1) memberOf(ctx.db, project.id, ctx.user.id)
      const items = ctx.db.mindNodes.filter((n) => n.projectId === project.id)
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/projects\/([^/]+)\/mind-nodes$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      memberOf(ctx.db, project.id, ctx.user.id)
      const { parentId, label } = ctx.body
      if (!label) throw badRequest('节点内容不能为空')
      if (parentId && !ctx.db.mindNodes.some((n) => n.id === parentId && n.projectId === project.id)) throw badRequest('父节点不存在')
      const node = { id: genId('mn'), projectId: project.id, parentId: parentId ?? null, label, createdAt: now(), updatedAt: now() }
      ctx.db.mindNodes.push(node)
      touchProject(project)
      return { status: 201, body: node }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/mind-nodes\/([^/]+)$/,
    handler: (ctx) => {
      const node = ctx.db.mindNodes.find((n) => n.id === ctx.params[0])
      if (!node) throw notFound('节点不存在')
      const project = getProject(ctx.db, node.projectId)
      memberOf(ctx.db, project.id, ctx.user.id)
      if (ctx.body.label !== undefined) {
        if (!ctx.body.label) throw badRequest('节点内容不能为空')
        node.label = ctx.body.label
      }
      node.updatedAt = now()
      touchProject(project)
      return { status: 200, body: node }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/mind-nodes\/([^/]+)$/,
    handler: (ctx) => {
      const node = ctx.db.mindNodes.find((n) => n.id === ctx.params[0])
      if (!node) throw notFound('节点不存在')
      const project = getProject(ctx.db, node.projectId)
      memberOf(ctx.db, project.id, ctx.user.id)
      const collect = (id: string) => {
        ctx.db.mindNodes = ctx.db.mindNodes.filter((n) => {
          if (n.id === id) return false
          if (n.parentId === id) {
            collect(n.id)
            return false
          }
          return true
        })
      }
      collect(node.id)
      touchProject(project)
      return { status: 204 }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/([^/]+)\/notes$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (rankOf(ctx.user) < 1) memberOf(ctx.db, project.id, ctx.user.id)
      const items = ctx.db.notes.filter((n) => n.projectId === project.id)
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/projects\/([^/]+)\/notes$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      memberOf(ctx.db, project.id, ctx.user.id)
      const note = {
        id: genId('sn'),
        projectId: project.id,
        content: ctx.body.content || '',
        color: ctx.body.color || '#fde68a',
        x: typeof ctx.body.x === 'number' ? ctx.body.x : 20,
        y: typeof ctx.body.y === 'number' ? ctx.body.y : 20,
        createdAt: now(),
        updatedAt: now(),
      }
      ctx.db.notes.push(note)
      touchProject(project)
      return { status: 201, body: note }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/notes\/([^/]+)$/,
    handler: (ctx) => {
      const note = ctx.db.notes.find((n) => n.id === ctx.params[0])
      if (!note) throw notFound('便签不存在')
      const project = getProject(ctx.db, note.projectId)
      memberOf(ctx.db, project.id, ctx.user.id)
      if (ctx.body.content !== undefined) note.content = ctx.body.content
      if (ctx.body.color !== undefined) note.color = ctx.body.color
      if (typeof ctx.body.x === 'number') note.x = ctx.body.x
      if (typeof ctx.body.y === 'number') note.y = ctx.body.y
      note.updatedAt = now()
      touchProject(project)
      return { status: 200, body: note }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/notes\/([^/]+)$/,
    handler: (ctx) => {
      const note = ctx.db.notes.find((n) => n.id === ctx.params[0])
      if (!note) throw notFound('便签不存在')
      const project = getProject(ctx.db, note.projectId)
      memberOf(ctx.db, project.id, ctx.user.id)
      ctx.db.notes = ctx.db.notes.filter((n) => n.id !== note.id)
      touchProject(project)
      return { status: 204 }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/([^/]+)\/tasks$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (rankOf(ctx.user) < 1) memberOf(ctx.db, project.id, ctx.user.id)
      let items = ctx.db.tasks.filter((t) => t.projectId === project.id)
      const status = ctx.query.get('status')
      const assigneeId = ctx.query.get('assigneeId')
      if (status) items = items.filter((t) => t.status === status)
      if (assigneeId) items = items.filter((t) => t.assigneeId === assigneeId)
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/projects\/([^/]+)\/tasks$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      memberOf(ctx.db, project.id, ctx.user.id)
      const { title, description, dueDate } = ctx.body
      if (!title) throw badRequest('任务标题不能为空')
      const task: Task = {
        id: genId('t'),
        projectId: project.id,
        title,
        description: description || '',
        assigneeId: null,
        status: 'todo',
        dueDate: dueDate || null,
        createdAt: now(),
        updatedAt: now(),
      }
      ctx.db.tasks.push(task)
      addLog(ctx.db, project.id, task.id, ctx.user, 'create', '创建任务')
      touchProject(project)
      return { status: 201, body: task }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/tasks\/([^/]+)$/,
    handler: (ctx) => {
      const task = getTask(ctx.db, ctx.params[0])
      const project = getProject(ctx.db, task.projectId)
      memberOf(ctx.db, project.id, ctx.user.id)
      const oldStatus = task.status
      if (ctx.body.title !== undefined) {
        if (!ctx.body.title) throw badRequest('任务标题不能为空')
        task.title = ctx.body.title
        addLog(ctx.db, project.id, task.id, ctx.user, 'edit', '修改任务信息')
      }
      if (ctx.body.description !== undefined) {
        task.description = ctx.body.description
        addLog(ctx.db, project.id, task.id, ctx.user, 'edit', '修改任务描述')
      }
      if (ctx.body.dueDate !== undefined) {
        task.dueDate = ctx.body.dueDate || null
        addLog(ctx.db, project.id, task.id, ctx.user, 'edit', '修改截止日期')
      }
      if (ctx.body.assigneeId !== undefined) {
        if (ctx.body.assigneeId !== null && ctx.body.assigneeId !== ctx.user.id) throw forbidden('只能认领给自己')
        task.assigneeId = ctx.body.assigneeId
        addLog(ctx.db, project.id, task.id, ctx.user, 'claim', ctx.body.assigneeId ? '认领任务' : '取消认领')
      }
      if (ctx.body.status !== undefined) {
        if (!['todo', 'doing', 'review', 'done'].includes(ctx.body.status)) throw badRequest('无效的任务状态')
        task.status = ctx.body.status
        handleTaskStatusChange(ctx.db, task, ctx.user, oldStatus)
      }
      task.updatedAt = now()
      touchProject(project)
      return { status: 200, body: task }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/tasks\/([^/]+)$/,
    handler: (ctx) => {
      const task = getTask(ctx.db, ctx.params[0])
      const project = getProject(ctx.db, task.projectId)
      memberOf(ctx.db, project.id, ctx.user.id)
      ctx.db.tasks = ctx.db.tasks.filter((t) => t.id !== task.id)
      addLog(ctx.db, project.id, task.id, ctx.user, 'delete', `删除任务「${task.title}」`)
      touchProject(project)
      return { status: 204 }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/([^/]+)\/task-logs$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (rankOf(ctx.user) < 1) memberOf(ctx.db, project.id, ctx.user.id)
      const items = ctx.db.taskLogs
        .filter((l) => l.projectId === project.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/([^/]+)\/checkins$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (rankOf(ctx.user) < 1) memberOf(ctx.db, project.id, ctx.user.id)
      const items = ctx.db.checkins.filter((c) => c.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/projects\/([^/]+)\/checkins$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      memberOf(ctx.db, project.id, ctx.user.id)
      const content = String(ctx.body.content || '').trim()
      if (!content) throw badRequest('打卡内容不能为空')
      const checkin = { id: genId('ck'), projectId: project.id, userId: ctx.user.id, content, createdAt: now() }
      ctx.db.checkins.push(checkin)
      addFeedback(ctx.db, project.id, ctx.user, 'guide', pick(FEEDBACK_POOL))
      touchProject(project)
      return { status: 201, body: checkin }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/([^/]+)\/feedbacks$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (rankOf(ctx.user) < 1) memberOf(ctx.db, project.id, ctx.user.id)
      const items = ctx.db.feedbacks.filter((f) => f.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/resources$/,
    handler: (ctx) => {
      let items = ctx.db.resources
      const category = ctx.query.get('category')
      const keyword = ctx.query.get('keyword')
      if (category) items = items.filter((r) => r.category === category)
      if (keyword) {
        const kw = keyword.toLowerCase()
        items = items.filter((r) => r.title.toLowerCase().includes(kw) || r.description.toLowerCase().includes(kw) || r.tags.some((t) => t.toLowerCase().includes(kw)))
      }
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/focus-sessions$/,
    handler: (ctx) => {
      const durationMin = Number(ctx.body.durationMin)
      const type = (ctx.body.type === 'break' ? 'break' : 'focus') as 'focus' | 'break'
      if (!Number.isFinite(durationMin) || durationMin <= 0) throw badRequest('时长必须为正整数')
      const session = { id: genId('fs'), userId: ctx.user.id, durationMin, type, createdAt: now() }
      ctx.db.focusSessions.push(session)
      return { status: 201, body: session }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/focus-sessions$/,
    handler: (ctx) => {
      const items = ctx.db.focusSessions.filter((s) => s.userId === ctx.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/focus\/stats$/,
    handler: (ctx) => {
      const days = Math.min(Math.max(Number(ctx.query.get('days')) || 7, 1), 30)
      const mine = ctx.db.focusSessions.filter((s) => s.userId === ctx.user.id && s.type === 'focus')
      const dateKey = (iso: string) => iso.slice(0, 10)
      const todayKey = dateKey(now())
      const today = mine.filter((s) => dateKey(s.createdAt) === todayKey)
      const week = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = dateKey(d.toISOString())
        const list = mine.filter((s) => dateKey(s.createdAt) === key)
        week.push({ date: key, count: list.length, minutes: list.reduce((sum, s) => sum + s.durationMin, 0) })
      }
      return {
        status: 200,
        body: {
          today: { count: today.length, minutes: today.reduce((sum, s) => sum + s.durationMin, 0) },
          week,
        },
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/teacher\/activity$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 1) throw forbidden('仅教师及以上可访问')
      const nameOf = (uid: string) => {
        const u = ctx.db.users.find((x) => x.id === uid)
        return { name: u?.name ?? '', username: u?.username ?? '' }
      }
      const quiz = ctx.db.quizAttempts.map((a) => ({
        type: 'quiz',
        ...nameOf(a.userId),
        text: `闯关获得 ${a.score}/${a.total}`,
        createdAt: a.createdAt,
      }))
      const focus = ctx.db.focusSessions
        .filter((s) => s.type === 'focus')
        .map((s) => ({
          type: 'focus',
          ...nameOf(s.userId),
          text: `完成 ${s.durationMin} 分钟专注`,
          createdAt: s.createdAt,
        }))
      const items = [...quiz, ...focus].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/teacher\/projects$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 1) throw forbidden('仅教师及以上可访问')
      const groupId = ctx.query.get('group')
      let projects = ctx.db.projects.slice()
      if (groupId) projects = projects.filter((p) => p.groupId === groupId)
      const items = projects
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((p) => projectView(ctx.db, p))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/([^/]+)\/annotations$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (rankOf(ctx.user) < 1) memberOf(ctx.db, project.id, ctx.user.id)
      const items = ctx.db.annotations.filter((a) => a.projectId === project.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/projects\/([^/]+)\/annotations$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 1) throw forbidden('仅教师及以上可添加批注')
      const project = getProject(ctx.db, ctx.params[0])
      const content = String(ctx.body.content || '').trim()
      if (!content) throw badRequest('批注内容不能为空')
      const annotation = { id: genId('a'), projectId: project.id, userId: ctx.user.id, content, createdAt: now() }
      ctx.db.annotations.push(annotation)
      return { status: 201, body: annotation }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/projects\/([^/]+)\/archive$/,
    handler: (ctx) => {
      const project = getProject(ctx.db, ctx.params[0])
      if (rankOf(ctx.user) < 1) memberOf(ctx.db, project.id, ctx.user.id)
      if (project.status !== 'finished') throw new HttpError(409, 'PROJECT_NOT_FINISHED', '项目结题后即可生成科创档案')
      const members = projectMembers(ctx.db, project.id).map((u) => {
        const mine = ctx.db.tasks.filter((t) => t.projectId === project.id && t.assigneeId === u.id)
        const checkins = ctx.db.checkins.filter((c) => c.projectId === project.id && c.userId === u.id)
        return {
          user: userBrief(u),
          taskCount: mine.length,
          doneCount: mine.filter((t) => t.status === 'done').length,
          checkinCount: checkins.length,
        }
      })
      return {
        status: 200,
        body: {
          project: projectView(ctx.db, project),
          summary: {
            taskTotal: ctx.db.tasks.filter((t) => t.projectId === project.id).length,
            doneTotal: ctx.db.tasks.filter((t) => t.projectId === project.id && t.status === 'done').length,
            checkinTotal: ctx.db.checkins.filter((c) => c.projectId === project.id).length,
            feedbackTotal: ctx.db.feedbacks.filter((f) => f.projectId === project.id).length,
            durationDays: Math.round((new Date(project.finishedAt!).getTime() - new Date(project.createdAt).getTime()) / 86400000),
          },
          members,
          tasks: ctx.db.tasks.filter((t) => t.projectId === project.id),
          checkins: ctx.db.checkins.filter((c) => c.projectId === project.id),
          feedbacks: ctx.db.feedbacks.filter((f) => f.projectId === project.id),
          mindNodes: ctx.db.mindNodes.filter((n) => n.projectId === project.id),
          annotations: ctx.db.annotations.filter((a) => a.projectId === project.id),
        },
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/admin\/users$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 2) throw forbidden('仅校管理员及以上可访问')
      let items = ctx.db.users.filter((u) => rankOf(u) < rankOf(ctx.user))
      const keyword = ctx.query.get('keyword')?.toLowerCase()
      const role = ctx.query.get('role')
      if (role) items = items.filter((u) => u.role === role)
      if (keyword) items = items.filter((u) => u.username.toLowerCase().includes(keyword) || u.name.toLowerCase().includes(keyword))
      items = items.slice().sort((a, b) => rankOf(b) - rankOf(a))
      return { status: 200, body: { items: items.map(userBrief), total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/admin\/users$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 2) throw forbidden('仅校管理员及以上可创建账号')
      const { username, password, name, role } = ctx.body
      if (!username || !password || !name) throw badRequest('用户名、密码和姓名不能为空')
      if (String(password).length < 6) throw badRequest('密码至少 6 位')
      if (!(role in ROLE_RANK) || ROLE_RANK[role as Role] >= rankOf(ctx.user)) throw badRequest('角色层级越界')
      if (ctx.db.users.some((u) => u.username === username)) throw new HttpError(409, 'USERNAME_TAKEN', '用户名已被占用')
      const user: User = { id: genId('u'), username, password, name, role }
      ctx.db.users.push(user)
      return { status: 201, body: userBrief(user) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/admin\/users\/([^/]+)$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 2) throw forbidden('仅校管理员及以上可管理账号')
      const target = ctx.db.users.find((u) => u.id === ctx.params[0])
      if (!target) throw notFound('用户不存在')
      if (target.id === ctx.user.id) throw badRequest('不能修改自己')
      if (rankOf(target) >= rankOf(ctx.user)) throw forbidden('只能管理低于自己层级的账号')
      if (ctx.body.name !== undefined) {
        if (!ctx.body.name) throw badRequest('姓名不能为空')
        target.name = ctx.body.name
      }
      if (ctx.body.password !== undefined) {
        if (String(ctx.body.password).length < 6) throw badRequest('密码至少 6 位')
        target.password = ctx.body.password
      }
      if (ctx.body.role !== undefined) {
        if (!(ctx.body.role in ROLE_RANK) || ROLE_RANK[ctx.body.role as Role] >= rankOf(ctx.user)) throw badRequest('角色层级越界')
        target.role = ctx.body.role
      }
      return { status: 200, body: userBrief(target) }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/admin\/users\/([^/]+)$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 2) throw forbidden('仅校管理员及以上可管理账号')
      const target = ctx.db.users.find((u) => u.id === ctx.params[0])
      if (!target) throw notFound('用户不存在')
      if (target.id === ctx.user.id) throw badRequest('不能删除自己')
      if (rankOf(target) >= rankOf(ctx.user)) throw forbidden('只能管理低于自己层级的账号')
      const uid = target.id
      ctx.db.members = ctx.db.members.filter((m) => m.userId !== uid)
      ctx.db.groupMembers = ctx.db.groupMembers.filter((m) => m.userId !== uid)
      ctx.db.groupInvites = ctx.db.groupInvites.filter((i) => i.userId !== uid && i.inviterId !== uid)
      ctx.db.quizAttempts = ctx.db.quizAttempts.filter((a) => a.userId !== uid)
      ctx.db.focusSessions = ctx.db.focusSessions.filter((s) => s.userId !== uid)
      ctx.db.checkins = ctx.db.checkins.filter((c) => c.userId !== uid)
      ctx.db.feedbacks = ctx.db.feedbacks.filter((f) => f.userId !== uid)
      ctx.db.annotations = ctx.db.annotations.filter((a) => a.userId !== uid)
      for (const t of ctx.db.tasks) {
        if (t.assigneeId === uid) t.assigneeId = null
      }
      ctx.db.users = ctx.db.users.filter((u) => u.id !== uid)
      return { status: 204 }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/users$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 1) throw forbidden('仅教师及以上可搜索用户')
      const keyword = (ctx.query.get('keyword') || '').toLowerCase()
      const items = keyword
        ? ctx.db.users.filter((u) => u.username.toLowerCase().includes(keyword) || u.name.toLowerCase().includes(keyword)).slice(0, 20)
        : []
      return { status: 200, body: { items: items.map(userBrief), total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/groups\/mine$/,
    handler: (ctx) => {
      const ids = ctx.db.groupMembers.filter((m) => m.userId === ctx.user.id).map((m) => m.groupId)
      const items = ctx.db.quizGroups.filter((g) => ids.includes(g.id)).map((g) => groupView(ctx.db, g))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/groups\/invites$/,
    handler: (ctx) => {
      const items = ctx.db.groupInvites
        .filter((i) => i.userId === ctx.user.id && i.status === 'pending')
        .map((i) => {
          const group = ctx.db.quizGroups.find((g) => g.id === i.groupId)
          const inviter = ctx.db.users.find((u) => u.id === i.inviterId)
          return {
            id: i.id,
            groupId: i.groupId,
            status: i.status,
            groupName: group?.name ?? '',
            inviterName: inviter?.name ?? '',
            createdAt: i.createdAt,
          }
        })
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/groups\/invites\/([^/]+)\/respond$/,
    handler: (ctx) => {
      const invite = ctx.db.groupInvites.find((i) => i.id === ctx.params[0] && i.userId === ctx.user.id && i.status === 'pending')
      if (!invite) throw notFound('邀请不存在或已处理')
      const accept = ctx.body.accept === true
      invite.status = accept ? 'accepted' : 'declined'
      if (accept && !ctx.db.groupMembers.some((m) => m.groupId === invite.groupId && m.userId === ctx.user.id)) {
        ctx.db.groupMembers.push({ id: genId('gm'), groupId: invite.groupId, userId: ctx.user.id, role: 'member', joinedAt: now() })
      }
      return { status: 200, body: { status: invite.status } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/groups\/join$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) !== 0) throw forbidden('仅学生可通过邀请码加入分组')
      const code = String(ctx.body.inviteCode || '').toLowerCase()
      const group = ctx.db.quizGroups.find((g) => g.inviteCode.toLowerCase() === code)
      if (!group) throw new HttpError(409, 'INVALID_INVITE', '邀请码无效')
      if (ctx.db.groupMembers.some((m) => m.groupId === group.id && m.userId === ctx.user.id)) {
        throw new HttpError(409, 'ALREADY_MEMBER', '你已在该小组中')
      }
      ctx.db.groupMembers.push({ id: genId('gm'), groupId: group.id, userId: ctx.user.id, role: 'member', joinedAt: now() })
      group.updatedAt = now()
      return { status: 201, body: groupView(ctx.db, group) }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/groups$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 1) throw forbidden('仅教师可访问')
      const ids = ctx.db.groupMembers.filter((m) => m.userId === ctx.user.id && m.role === 'teacher').map((m) => m.groupId)
      const items = ctx.db.quizGroups.filter((g) => ids.includes(g.id)).map((g) => groupView(ctx.db, g))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/groups$/,
    handler: (ctx) => {
      if (rankOf(ctx.user) < 1) throw forbidden('仅教师可创建用户组')
      const name = String(ctx.body.name ?? '').trim()
      if (!name) throw badRequest('小组名称不能为空')
      const quizMode = ['group', 'fallback', 'mixed'].includes(ctx.body.quizMode) ? ctx.body.quizMode : 'group'
      const group: QuizGroup = {
        id: genId('g'),
        name,
        description: String(ctx.body.description ?? '').trim(),
        quizMode,
        inviteCode: `G${ctx.db.quizGroups.length + 1}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        createdAt: now(),
        updatedAt: now(),
      }
      ctx.db.quizGroups.push(group)
      ctx.db.groupMembers.push({ id: genId('gm'), groupId: group.id, userId: ctx.user.id, role: 'teacher', joinedAt: now() })
      return { status: 201, body: groupView(ctx.db, group) }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/groups\/([^/]+)$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      if (ctx.body.name !== undefined) {
        if (!String(ctx.body.name).trim()) throw badRequest('小组名称不能为空')
        group.name = String(ctx.body.name).trim()
      }
      if (ctx.body.description !== undefined) group.description = String(ctx.body.description).trim()
      if (ctx.body.quizMode !== undefined) {
        if (!['group', 'fallback', 'mixed'].includes(ctx.body.quizMode)) throw badRequest('无效的抽题机制')
        group.quizMode = ctx.body.quizMode
      }
      group.updatedAt = now()
      return { status: 200, body: groupView(ctx.db, group) }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/groups\/([^/]+)$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      ctx.db.quizGroups = ctx.db.quizGroups.filter((g) => g.id !== group.id)
      ctx.db.groupMembers = ctx.db.groupMembers.filter((m) => m.groupId !== group.id)
      ctx.db.groupInvites = ctx.db.groupInvites.filter((i) => i.groupId !== group.id)
      ctx.db.quizQuestions = ctx.db.quizQuestions.filter((q) => q.groupId !== group.id)
      for (const p of ctx.db.projects) {
        if (p.groupId === group.id) p.groupId = null
      }
      return { status: 204 }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/groups\/([^/]+)\/members$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const items = groupMemberViews(ctx.db, group.id)
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/groups\/([^/]+)\/members$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const role = ctx.body.role === 'teacher' ? 'teacher' : 'member'
      const target = ctx.db.users.find((u) => u.id === ctx.body.userId)
      if (!target) throw notFound('用户不存在')
      if (role === 'teacher' && rankOf(target) < 1) throw badRequest('负责老师必须是教师角色')
      if (ctx.db.groupMembers.some((m) => m.groupId === group.id && m.userId === target.id)) {
        throw new HttpError(409, 'ALREADY_MEMBER', '该用户已在小组中')
      }
      const member: GroupMemberRec = { id: genId('gm'), groupId: group.id, userId: target.id, role, joinedAt: now() }
      ctx.db.groupMembers.push(member)
      group.updatedAt = now()
      return { status: 201, body: groupMemberViews(ctx.db, group.id).find((m) => m.id === member.id) }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/groups\/([^/]+)\/members\/([^/]+)$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const member = ctx.db.groupMembers.find((m) => m.groupId === group.id && m.userId === ctx.params[1])
      if (!member) throw notFound('成员不存在')
      if (member.role === 'teacher' && ctx.db.groupMembers.filter((m) => m.groupId === group.id && m.role === 'teacher').length <= 1) {
        throw badRequest('组内至少保留一名负责老师')
      }
      ctx.db.groupMembers = ctx.db.groupMembers.filter((m) => m.id !== member.id)
      group.updatedAt = now()
      return { status: 204 }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/groups\/([^/]+)\/questions$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const items = ctx.db.quizQuestions
        .filter((q) => q.groupId === group.id)
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/groups\/([^/]+)\/questions$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const data = validateQuestionBody(ctx.body)
      const question: QuizQuestionRec = {
        id: genId('q'),
        groupId: group.id,
        createdBy: ctx.user.id,
        createdAt: now(),
        updatedAt: now(),
        ...data,
      }
      ctx.db.quizQuestions.push(question)
      group.updatedAt = now()
      return { status: 201, body: question }
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/api\/groups\/([^/]+)\/questions\/([^/]+)$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const question = ctx.db.quizQuestions.find((q) => q.id === ctx.params[1] && q.groupId === group.id)
      if (!question) throw notFound('题目不存在')
      const data = validateQuestionBody(ctx.body)
      Object.assign(question, data, { updatedAt: now() })
      group.updatedAt = now()
      return { status: 200, body: question }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/groups\/([^/]+)\/questions\/([^/]+)$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const question = ctx.db.quizQuestions.find((q) => q.id === ctx.params[1] && q.groupId === group.id)
      if (!question) throw notFound('题目不存在')
      ctx.db.quizQuestions = ctx.db.quizQuestions.filter((q) => q.id !== question.id)
      group.updatedAt = now()
      return { status: 204 }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/groups\/([^/]+)\/invites$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const items = ctx.db.groupInvites.filter((i) => i.groupId === group.id && i.status === 'pending').map((i) => inviteView(ctx.db, i))
      return { status: 200, body: { items, total: items.length, page: 1, pageSize: items.length } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/groups\/([^/]+)\/invites$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const target = ctx.db.users.find((u) => u.id === ctx.body.userId)
      if (!target) throw notFound('用户不存在')
      if (rankOf(target) !== 0) throw badRequest('只能邀请学生')
      if (ctx.db.groupMembers.some((m) => m.groupId === group.id && m.userId === target.id)) {
        throw new HttpError(409, 'ALREADY_MEMBER', '该学生已在小组中')
      }
      if (ctx.db.groupInvites.some((i) => i.groupId === group.id && i.userId === target.id && i.status === 'pending')) {
        throw new HttpError(409, 'ALREADY_INVITED', '已有待处理的邀请')
      }
      const invite: GroupInviteRec = { id: genId('gi'), groupId: group.id, userId: target.id, inviterId: ctx.user.id, status: 'pending', createdAt: now() }
      ctx.db.groupInvites.push(invite)
      return { status: 201, body: inviteView(ctx.db, invite) }
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/api\/groups\/([^/]+)\/invites\/([^/]+)$/,
    handler: (ctx) => {
      const group = getGroup(ctx.db, ctx.params[0])
      requireGroupLead(ctx.db, group.id, ctx.user)
      const invite = ctx.db.groupInvites.find((i) => i.id === ctx.params[1] && i.groupId === group.id)
      if (!invite) throw notFound('邀请不存在')
      if (invite.status !== 'pending') throw badRequest('仅待处理的邀请可撤回')
      ctx.db.groupInvites = ctx.db.groupInvites.filter((i) => i.id !== invite.id)
      return { status: 204 }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/quiz\/questions$/,
    handler: (ctx) => {
      const count = Math.min(Math.max(Number(ctx.query.get('count')) || 10, 1), 20)
      const groupId = ctx.query.get('group')
      let pool: QuizQuestionRec[]
      let group: { id: string; name: string } | null = null
      if (groupId) {
        const g = getGroup(ctx.db, groupId)
        if (!ctx.db.groupMembers.some((m) => m.groupId === g.id && m.userId === ctx.user.id) && rankOf(ctx.user) < 1) {
          throw forbidden('只能抽取自己所在小组的题库')
        }
        const mine = ctx.db.quizQuestions.filter((q) => q.groupId === g.id)
        const pub = ctx.db.quizQuestions.filter((q) => q.groupId === null)
        if (g.quizMode === 'group') pool = mine
        else if (g.quizMode === 'fallback') pool = mine.length > 0 ? mine : pub
        else pool = [...mine, ...pub]
        group = { id: g.id, name: g.name }
      } else {
        pool = ctx.db.quizQuestions.filter((q) => q.groupId === null)
      }
      return { status: 200, body: { items: shuffled(pool).slice(0, count), total: pool.length, group } }
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/quiz\/attempts$/,
    handler: (ctx) => {
      const score = Number(ctx.body.score)
      const total = Number(ctx.body.total)
      if (!Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total) {
        throw badRequest('成绩数据无效')
      }
      const attempt: QuizAttemptRec = { id: genId('qa'), userId: ctx.user.id, score, total, createdAt: now() }
      ctx.db.quizAttempts.push(attempt)
      const mine = ctx.db.quizAttempts.filter((a) => a.userId === ctx.user.id)
      const best = mine.reduce<QuizAttemptRec | null>((acc, a) => (!acc || a.score > acc.score ? a : acc), null)
      return {
        status: 201,
        body: { attempt, best: best ? { score: best.score, total: best.total, createdAt: best.createdAt } : null },
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/quiz\/stats$/,
    handler: (ctx) => {
      const mine = ctx.db.quizAttempts.filter((a) => a.userId === ctx.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const best = mine.reduce<QuizAttemptRec | null>((acc, a) => (!acc || a.score > acc.score ? a : acc), null)
      return {
        status: 200,
        body: {
          attempts: mine.length,
          best: best ? { score: best.score, total: best.total, createdAt: best.createdAt } : null,
          last: mine[0] ? { score: mine[0].score, total: mine[0].total, createdAt: mine[0].createdAt } : null,
        },
      }
    },
  },
]

export function dispatch(db: DB, method: string, url: string, query: URLSearchParams, body: Record<string, any>, token?: string) {
  const route = routes.find((r) => (Array.isArray(r.method) ? r.method.includes(method) : r.method === method) && r.pattern.test(url))
  if (!route) throw new HttpError(404, 'NOT_FOUND', `接口不存在: ${method} ${url}`)
  const user = parseToken(token, db)
  if (!route.public && !user) throw new HttpError(401, 'UNAUTHORIZED', '未登录或登录已过期')
  const params: Record<string, string> = {}
  const match = url.match(route.pattern)
  for (let i = 1; i < match!.length; i++) params[i - 1] = decodeURIComponent(match![i])
  const result = route.handler({ db, user: user!, params, query, body })
  return result ?? { status: 204 }
}
