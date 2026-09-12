import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type Role = 'student' | 'teacher'
export type ProjectStatus = 'active' | 'finished'
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done'

export interface User { id: string; username: string; password: string; name: string; role: Role }
export interface Topic { id: string; title: string; summary: string; subjects: string[]; tags: string[]; difficulty: '入门' | '进阶' | '挑战' }
export interface Project {
  id: string
  topicId: string
  name: string
  status: ProjectStatus
  inviteCode: string
  leaderId: string
  createdAt: string
  updatedAt: string
  finishedAt: string | null
}
export interface Member { id: string; projectId: string; userId: string; joinedAt: string }
export interface MindNode { id: string; projectId: string; parentId: string | null; label: string; createdAt: string; updatedAt: string }
export interface StickyNote { id: string; projectId: string; content: string; color: string; x: number; y: number; createdAt: string; updatedAt: string }
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
export interface TaskLog { id: string; projectId: string; taskId: string; userId: string; action: string; detail: string; createdAt: string }
export interface Checkin { id: string; projectId: string; userId: string; content: string; createdAt: string }
export interface Feedback { id: string; projectId: string; userId: string; type: 'milestone' | 'guide'; content: string; createdAt: string }
export interface Resource { id: string; title: string; category: string; description: string; url: string; tags: string[] }
export interface Annotation { id: string; projectId: string; userId: string; content: string; createdAt: string }
export interface FocusSession { id: string; userId: string; durationMin: number; type: 'focus' | 'break'; createdAt: string }

export interface DB {
  users: User[]
  topics: Topic[]
  projects: Project[]
  members: Member[]
  mindNodes: MindNode[]
  notes: StickyNote[]
  tasks: Task[]
  taskLogs: TaskLog[]
  checkins: Checkin[]
  feedbacks: Feedback[]
  resources: Resource[]
  annotations: Annotation[]
  focusSessions: FocusSession[]
}

const DATA_DIR = join(process.cwd(), '.mock-data')
const DATA_FILE = join(DATA_DIR, 'db.json')

let seq = 0
export function genId(prefix: string) {
  seq += 1
  return `${prefix}${seq}`
}
export function now() {
  return new Date().toISOString()
}
export function daysAgo(days: number, hour = 10, minute = 0) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const FEEDBACK_POOL = [
  '里程碑达成！你们把一个大目标拆成了可执行的小步，这正是工程师思维。',
  '干得漂亮！这一步的完成意味着整个项目又向前推进了一截。',
  '进度同步得很好，接下来可以尝试把成果整理成可视化材料。',
  '团队协作满分！记得在打卡里记录下这次尝试中的收获与踩坑。',
  '这个节点很关键，完成后建议做一次小复盘，把经验沉淀到档案里。',
  '思路清晰，继续推进！遇到瓶颈时回到星云看板看看最初的想法。',
]

function seed(): DB {
  const users: User[] = [
    { id: 'u1', username: 'student', password: '123456', name: '张三', role: 'student' },
    { id: 'u2', username: 'student2', password: '123456', name: '李四', role: 'student' },
    { id: 'u3', username: 'student3', password: '123456', name: '王五', role: 'student' },
    { id: 'u4', username: 'student4', password: '123456', name: '赵六', role: 'student' },
    { id: 't1', username: 'teacher', password: '123456', name: '王老师', role: 'teacher' },
  ]
  const topics: Topic[] = [
    { id: 'topic1', title: '火星基地能源方案设计', summary: '为火星基地设计可持续能源系统，比较太阳能、核能与风能的组合方案，输出能量平衡计算与架构图。', subjects: ['物理', '工程'], tags: ['能源', '太空'], difficulty: '挑战' },
    { id: 'topic2', title: '校园智能垃圾分类助手', summary: '设计一款面向校园的智能垃圾分类工具，结合图像识别与科普互动，完成原型与演示。', subjects: ['编程', '环保'], tags: ['AI', '物联网'], difficulty: '进阶' },
    { id: 'topic3', title: '星舰生命维持系统', summary: '模拟星舰内生命维持系统：氧气循环、水循环与温控，构建系统模型并评估可靠性。', subjects: ['生物', '工程'], tags: ['生命科学', '系统'], difficulty: '进阶' },
    { id: 'topic4', title: '声波可视化艺术装置', summary: '将声音信号实时转化为可视化图案，结合物理原理与艺术表达，制作交互装置。', subjects: ['物理', '艺术'], tags: ['声学', '交互'], difficulty: '入门' },
  ]
  const projects: Project[] = [
    { id: 'p1', topicId: 'topic1', name: '火星基地能源方案', status: 'active', inviteCode: 'P1-7F3A', leaderId: 'u1', createdAt: daysAgo(12), updatedAt: daysAgo(0, 9), finishedAt: null },
    { id: 'p2', topicId: 'topic2', name: '校园智能垃圾分类助手', status: 'finished', inviteCode: 'P2-9B1C', leaderId: 'u1', createdAt: daysAgo(40), updatedAt: daysAgo(6, 16), finishedAt: daysAgo(6, 17) },
  ]
  const members: Member[] = [
    { id: 'm1', projectId: 'p1', userId: 'u1', joinedAt: daysAgo(12) },
    { id: 'm2', projectId: 'p1', userId: 'u2', joinedAt: daysAgo(11) },
    { id: 'm3', projectId: 'p1', userId: 'u3', joinedAt: daysAgo(10) },
    { id: 'm4', projectId: 'p2', userId: 'u1', joinedAt: daysAgo(40) },
    { id: 'm5', projectId: 'p2', userId: 'u3', joinedAt: daysAgo(38) },
    { id: 'm6', projectId: 'p2', userId: 'u4', joinedAt: daysAgo(35) },
  ]
  const mindNodes: MindNode[] = [
    { id: 'n1', projectId: 'p1', parentId: null, label: '火星基地能源方案', createdAt: daysAgo(12), updatedAt: daysAgo(12) },
    { id: 'n2', projectId: 'p1', parentId: 'n1', label: '需求分析', createdAt: daysAgo(12), updatedAt: daysAgo(11) },
    { id: 'n3', projectId: 'p1', parentId: 'n1', label: '能源方案对比', createdAt: daysAgo(12), updatedAt: daysAgo(9) },
    { id: 'n4', projectId: 'p1', parentId: 'n1', label: '系统集成', createdAt: daysAgo(12), updatedAt: daysAgo(8) },
    { id: 'n5', projectId: 'p1', parentId: 'n2', label: '基地用电需求估算', createdAt: daysAgo(11), updatedAt: daysAgo(11) },
    { id: 'n6', projectId: 'p1', parentId: 'n2', label: '昼夜周期与储能', createdAt: daysAgo(11), updatedAt: daysAgo(10) },
    { id: 'n7', projectId: 'p1', parentId: 'n3', label: '太阳能效率分析', createdAt: daysAgo(10), updatedAt: daysAgo(9) },
    { id: 'n8', projectId: 'p1', parentId: 'n3', label: '核能小型化方案', createdAt: daysAgo(9), updatedAt: daysAgo(9) },
    { id: 'n9', projectId: 'p1', parentId: 'n4', label: '能量平衡计算模型', createdAt: daysAgo(8), updatedAt: daysAgo(7) },
    { id: 'n10', projectId: 'p1', parentId: 'n4', label: '冗余与应急策略', createdAt: daysAgo(8), updatedAt: daysAgo(6) },
    { id: 'n11', projectId: 'p2', parentId: null, label: '智能垃圾分类助手', createdAt: daysAgo(40), updatedAt: daysAgo(30) },
    { id: 'n12', projectId: 'p2', parentId: 'n11', label: '分类标准调研', createdAt: daysAgo(39), updatedAt: daysAgo(30) },
    { id: 'n13', projectId: 'p2', parentId: 'n11', label: '识别模型选型', createdAt: daysAgo(35), updatedAt: daysAgo(20) },
    { id: 'n14', projectId: 'p2', parentId: 'n11', label: '互动科普模块', createdAt: daysAgo(25), updatedAt: daysAgo(12) },
  ]
  const notes: StickyNote[] = [
    { id: 'sn1', projectId: 'p1', content: '灵感：火星沙尘暴期间太阳能失效，需要备用电源', color: '#fde68a', x: 30, y: 40, createdAt: daysAgo(11), updatedAt: daysAgo(11) },
    { id: 'sn2', projectId: 'p1', content: '资料：NASA 好奇号采用 RTG 核电池，寿命超过 14 年', color: '#bbf7d0', x: 260, y: 120, createdAt: daysAgo(10), updatedAt: daysAgo(10) },
    { id: 'sn3', projectId: 'p1', content: '讨论结论：主用太阳能 + 备用核能，储能覆盖 12 小时沙尘期', color: '#bae6fd', x: 500, y: 60, createdAt: daysAgo(9), updatedAt: daysAgo(8) },
    { id: 'sn4', projectId: 'p1', content: '待查：小型核反应堆的审批与安全标准', color: '#fbcfe8', x: 760, y: 180, createdAt: daysAgo(8), updatedAt: daysAgo(8) },
    { id: 'sn5', projectId: 'p2', content: '垃圾分类标准以上海四分类为基础，但食堂场景有特殊要求', color: '#fde68a', x: 40, y: 60, createdAt: daysAgo(30), updatedAt: daysAgo(30) },
  ]
  const tasks: Task[] = [
    { id: 't1', projectId: 'p1', title: '调研火星基地用电需求', description: '收集基地照明、生命维持、通信等设备的功率需求，形成需求清单。', assigneeId: 'u1', status: 'done', dueDate: daysAgo(6), createdAt: daysAgo(10), updatedAt: daysAgo(5, 14) },
    { id: 't2', projectId: 'p1', title: '太阳能板选型与效率计算', description: '基于火星光照强度与沙尘衰减系数，计算光伏阵列规模。', assigneeId: 'u2', status: 'done', dueDate: daysAgo(3), createdAt: daysAgo(9), updatedAt: daysAgo(2, 11) },
    { id: 't3', projectId: 'p1', title: '核能方案可行性分析', description: '调研小型裂变堆与 RTG 的功率密度、寿命与安全性。', assigneeId: 'u3', status: 'review', dueDate: daysAgo(1), createdAt: daysAgo(8), updatedAt: daysAgo(1, 9) },
    { id: 't4', projectId: 'p1', title: '储能系统设计', description: '设计电池储能与氢储能组合，覆盖沙尘期供电。', assigneeId: 'u1', status: 'doing', dueDate: daysAgo(-2), createdAt: daysAgo(6), updatedAt: daysAgo(0, 9) },
    { id: 't5', projectId: 'p1', title: '能量平衡计算模型', description: '用表格模型对比不同方案的年发电量与可靠性。', assigneeId: null, status: 'todo', dueDate: daysAgo(-5), createdAt: daysAgo(5), updatedAt: daysAgo(5) },
    { id: 't6', projectId: 'p1', title: '架构图与汇报材料', description: '绘制能源系统架构图，准备中期汇报。', assigneeId: null, status: 'todo', dueDate: daysAgo(-7), createdAt: daysAgo(4), updatedAt: daysAgo(4) },
    { id: 't7', projectId: 'p2', title: '四分类标准调研', description: '整理上海垃圾分类标准与常见误区。', assigneeId: 'u1', status: 'done', dueDate: daysAgo(30), createdAt: daysAgo(38), updatedAt: daysAgo(30, 15) },
    { id: 't8', projectId: 'p2', title: '图像识别模型测试', description: '对 200 张校园常见垃圾图片进行识别测试，记录准确率。', assigneeId: 'u3', status: 'done', dueDate: daysAgo(15), createdAt: daysAgo(30), updatedAt: daysAgo(14, 10) },
    { id: 't9', projectId: 'p2', title: '科普问答模块开发', description: '开发垃圾分类知识问答与积分激励。', assigneeId: 'u4', status: 'done', dueDate: daysAgo(9), createdAt: daysAgo(20), updatedAt: daysAgo(8, 16) },
    { id: 't10', projectId: 'p2', title: '原型演示与结题报告', description: '整合原型，录制演示视频并撰写结题报告。', assigneeId: 'u1', status: 'done', dueDate: daysAgo(7), createdAt: daysAgo(12), updatedAt: daysAgo(6, 15) },
  ]
  const taskLogs: TaskLog[] = [
    { id: 'l1', projectId: 'p1', taskId: 't1', userId: 'u1', action: 'create', detail: '创建任务', createdAt: daysAgo(10) },
    { id: 'l2', projectId: 'p1', taskId: 't1', userId: 'u1', action: 'claim', detail: '认领任务', createdAt: daysAgo(10, 12) },
    { id: 'l3', projectId: 'p1', taskId: 't1', userId: 'u1', action: 'status', detail: '状态更新为 已完成', createdAt: daysAgo(5, 14) },
    { id: 'l4', projectId: 'p1', taskId: 't3', userId: 'u3', action: 'claim', detail: '认领任务', createdAt: daysAgo(8, 10) },
    { id: 'l5', projectId: 'p1', taskId: 't3', userId: 'u3', action: 'status', detail: '状态更新为 待验收', createdAt: daysAgo(1, 9) },
    { id: 'l6', projectId: 'p1', taskId: 't4', userId: 'u1', action: 'claim', detail: '认领任务', createdAt: daysAgo(6, 9) },
    { id: 'l7', projectId: 'p1', taskId: 't4', userId: 'u1', action: 'status', detail: '状态更新为 进行中', createdAt: daysAgo(6, 10) },
    { id: 'l8', projectId: 'p2', taskId: 't7', userId: 'u1', action: 'create', detail: '创建任务', createdAt: daysAgo(38) },
    { id: 'l9', projectId: 'p2', taskId: 't10', userId: 'u1', action: 'status', detail: '状态更新为 已完成', createdAt: daysAgo(6, 15) },
  ]
  const checkins: Checkin[] = [
    { id: 'c1', projectId: 'p1', userId: 'u1', content: '完成用电需求调研，清单共 23 项设备', createdAt: daysAgo(5, 15) },
    { id: 'c2', projectId: 'p1', userId: 'u2', content: '光伏阵列计算完成，初步规模 400m²', createdAt: daysAgo(2, 14) },
    { id: 'c3', projectId: 'p1', userId: 'u3', content: '核能方案对比表完成，等待组内评审', createdAt: daysAgo(1, 10) },
    { id: 'c4', projectId: 'p1', userId: 'u1', content: '储能方案初稿完成，开始搭建计算模型', createdAt: daysAgo(0, 9) },
    { id: 'c5', projectId: 'p2', userId: 'u1', content: '调研报告初稿完成', createdAt: daysAgo(30, 16) },
    { id: 'c6', projectId: 'p2', userId: 'u3', content: '识别模型准确率达到 92%', createdAt: daysAgo(14, 11) },
    { id: 'c7', projectId: 'p2', userId: 'u4', content: '科普模块上线测试', createdAt: daysAgo(8, 17) },
    { id: 'c8', projectId: 'p2', userId: 'u1', content: '演示视频录制完成，结题报告提交', createdAt: daysAgo(6, 16) },
  ]
  const feedbacks: Feedback[] = [
    { id: 'f1', projectId: 'p1', userId: 'u1', type: 'milestone', content: FEEDBACK_POOL[0], createdAt: daysAgo(5, 15) },
    { id: 'f2', projectId: 'p1', userId: 'u2', type: 'milestone', content: FEEDBACK_POOL[2], createdAt: daysAgo(2, 14) },
    { id: 'f3', projectId: 'p1', userId: 'u3', type: 'milestone', content: FEEDBACK_POOL[3], createdAt: daysAgo(1, 10) },
    { id: 'f4', projectId: 'p2', userId: 'u1', type: 'milestone', content: FEEDBACK_POOL[1], createdAt: daysAgo(30, 16) },
    { id: 'f5', projectId: 'p2', userId: 'u3', type: 'milestone', content: FEEDBACK_POOL[4], createdAt: daysAgo(14, 11) },
    { id: 'f6', projectId: 'p2', userId: 'u1', type: 'milestone', content: FEEDBACK_POOL[5], createdAt: daysAgo(6, 16) },
  ]
  const resources: Resource[] = [
    { id: 'r1', title: '火星基地能源设计公开课', category: '物理', description: '系统讲解火星环境下太阳能与核能的工程设计要点。', url: 'https://example.com/mars-energy', tags: ['能源', '太空'] },
    { id: 'r2', title: 'PhET 电路搭建实验室', category: '物理', description: '在线电路仿真工具，支持太阳能电池与储能电路模拟。', url: 'https://phet.colorado.edu', tags: ['仿真', '电路'] },
    { id: 'r3', title: 'Khan 学院 · 能量守恒', category: '物理', description: '能量守恒与转化率的可视化课程。', url: 'https://www.khanacademy.org', tags: ['课程', '能量'] },
    { id: 'r4', title: 'NASA 开放数据平台', category: '工程', description: '火星探测任务的公开工程数据与设计文档。', url: 'https://nasa.gov', tags: ['太空', '数据'] },
    { id: 'r5', title: 'Tinkercad 3D 设计', category: '工程', description: '浏览器端 3D 建模与电路设计工具，适合原型制作。', url: 'https://www.tinkercad.com', tags: ['3D', '原型'] },
    { id: 'r6', title: 'Scratch 图形化编程', category: '编程', description: '图形化编程入门，适合逻辑训练与交互原型。', url: 'https://scratch.mit.edu', tags: ['入门', '交互'] },
    { id: 'r7', title: 'Teachable Machine', category: '编程', description: '无需代码即可训练图像分类模型，适合垃圾分类识别。', url: 'https://teachablemachine.withgoogle.com', tags: ['AI', '图像识别'] },
    { id: 'r8', title: 'Codecademy Python 课程', category: '编程', description: 'Python 基础与数据处理课程。', url: 'https://www.codecademy.com', tags: ['Python', '课程'] },
    { id: 'r9', title: '艺术与科学 · 生成艺术', category: '艺术', description: '用代码生成视觉艺术的案例集。', url: 'https://generativeart.com', tags: ['生成艺术'] },
    { id: 'r10', title: '声音可视化案例库', category: '艺术', description: '声波可视化的经典交互作品与原理讲解。', url: 'https://example.com/sound-vis', tags: ['声学', '交互'] },
    { id: 'r11', title: '细胞与生命系统模拟', category: '生物', description: '生命维持系统相关的生物循环模拟。', url: 'https://biomanbio.com', tags: ['生命科学', '模拟'] },
    { id: 'r12', title: '上海市科创资源库', category: '综合', description: '虫洞特色科创课程与实验资源总入口。', url: 'https://example.com/kc-resource', tags: ['虫洞', '综合'] },
  ]
  const annotations: Annotation[] = [
    { id: 'a1', projectId: 'p2', userId: 't1', content: '识别准确率的测试样本建议扩充到 500 张，覆盖更多食堂场景。', createdAt: daysAgo(20, 9) },
    { id: 'a2', projectId: 'p2', userId: 't1', content: '科普问答的激励机制做得不错，建议补充误分类的纠错引导。', createdAt: daysAgo(12, 14) },
    { id: 'a3', projectId: 'p2', userId: 't1', content: '结题报告结构完整，注意补充能耗对比的量化结论。', createdAt: daysAgo(7, 10) },
  ]
  const focusSessions: FocusSession[] = []
  for (let d = 6; d >= 1; d--) {
    const count = randInt(2, 4)
    for (let i = 0; i < count; i++) {
      focusSessions.push({ id: genId('fs'), userId: 'u1', durationMin: 25, type: 'focus', createdAt: daysAgo(d, randInt(9, 20), randInt(0, 59)) })
    }
  }
  for (const uid of ['u2', 'u3']) {
    focusSessions.push({ id: genId('fs'), userId: uid, durationMin: 25, type: 'focus', createdAt: daysAgo(randInt(1, 5), randInt(9, 20), randInt(0, 59)) })
  }
  return { users, topics, projects, members, mindNodes, notes, tasks, taskLogs, checkins, feedbacks, resources, annotations, focusSessions }
}

export function loadDB(): DB {
  if (existsSync(DATA_FILE)) {
    try {
      return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as DB
    } catch {
      // fall through to reseed
    }
  }
  const db = seed()
  persist(db)
  return db
}

export function persist(db: DB) {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2))
}

export function createToken(userId: string) {
  return `mock.${userId}.${Math.random().toString(36).slice(2)}`
}

export function parseToken(token: string | undefined, db: DB): User | null {
  if (!token) return null
  const value = token.startsWith('Bearer ') ? token.slice(7) : token
  if (!value.startsWith('mock.')) return null
  const userId = value.split('.')[1]
  return db.users.find((u) => u.id === userId) ?? null
}

export { pick }
