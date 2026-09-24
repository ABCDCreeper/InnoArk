# 学习天地（Learn）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 纯前端实现"学习天地"：在线视频课时 + 配套答题闯关 + XP/等级/徽章/排行榜，进度存 localStorage。

**Architecture:** 数据硬编码在 `src/data/courses.ts`；进度存档在 `src/stores/learn.ts`（Pinia + localStorage，按 userId 隔离）；`Learn.vue` 内部 phase 切换"选课大厅 → 课程地图 → 课时播放"三阶段（与 Quiz.vue 的 phase 模式一致），地图与播放器拆为 `src/views/learn/` 下两个组件。不改 ArkEngine 后端。

**Tech Stack:** Vue 3 `<script setup>` + Naive UI + Pinia + vue-router；CSS 动效（延续 Quiz.vue 风格）。

## Global Constraints

- 不写解释性注释，只写必要约束注释（用户偏好）。
- 提交遵循 Conventional Commits，小写英文祈使句，每个任务一个提交，不 push。
- 本仓库无单测框架：每任务验证 = `npx vue-tsc -b` 通过 + dev server（已在 localhost:5173 运行，mock 后端）浏览器手测。
- 登录账号（mock）：student/teacher/admin 等，密码均 123456。
- 设计文档：`docs/superpowers/specs/2026-09-24-learn-feature-design.md`（数值以此为准：等级 = `floor(sqrt(xp/25))+1`、8 称号、8 徽章、首通 10 XP/题 + 20 通关、重刷 2 XP/题、3 星=全对、2 星≥60%、1 星=至少 1 对、0 星不通关）。

---

### Task 1: 课程种子数据

**Files:**
- Create: `src/data/courses.ts`

**Interfaces:**
- Produces（后续任务依赖，签名固定）:
  - `interface LearnQuestion { question: string; options: string[]; answer: number; explanation: string }`
  - `interface LearnLesson { id: string; title: string; videoUrl: string; questions: LearnQuestion[] }`
  - `interface LearnCourse { id: string; title: string; emoji: string; color: string; desc: string; lessons: LearnLesson[] }`
  - `const COURSES: LearnCourse[]`（3 门课 × 3 课时 × 3 题）
  - `function videoTypeOf(url: string): 'mp4' | 'bilibili' | 'unknown'`
  - `function starsFor(correct: number, total: number): 0 | 1 | 2 | 3`
  - `const LEVEL_TITLES: string[]`（8 个）、`function levelOf(xp: number): number`、`function levelTitle(xp: number): string`、`function xpForLevel(level: number): number`
  - `const FIRST_PASS_XP = 10, CLEAR_BONUS_XP = 20, REPLAY_XP = 2, XP_PER_LEVEL = 25`
  - `interface BadgeDef { id: string; emoji: string; name: string; desc: string }`、`const BADGES: BadgeDef[]`（8 枚，id: first-clear / perfect-lesson / brain-25 / xp-500 / course-crown / streak-3 / all-courses / level-5）
  - `const LEADERBOARD_BOTS: Array<{ name: string; emoji: string; xp: number }>`（7 人）

- [ ] **Step 1: 写入完整数据文件**

```ts
export interface LearnQuestion { question: string; options: string[]; answer: number; explanation: string }

export interface LearnLesson { id: string; title: string; videoUrl: string; questions: LearnQuestion[] }

export interface LearnCourse { id: string; title: string; emoji: string; color: string; desc: string; lessons: LearnLesson[] }

export const COURSES: LearnCourse[] = [
  {
    id: 'c-kitchen', title: '厨房里的科学', emoji: '🔬', color: '#18a058',
    desc: '水、发酵与热，厨房就是实验室',
    lessons: [
      {
        id: 'l-kitchen-1', title: '水的三态魔法', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        questions: [
          { question: '冬天窗户内侧出现的水雾是哪来的？', options: ['水蒸气遇冷液化成的小水珠', '玻璃里渗出的水', '空气里的小冰渣粘上了', '抹布留下的水汽'], answer: 0, explanation: '室内温暖的水蒸气碰到冰冷的玻璃会液化，变成小水珠附着在玻璃内侧。' },
          { question: '水沸腾后继续加热，水温会怎样？', options: ['一直升高', '保持不变', '先降后升', '忽高忽低'], answer: 1, explanation: '标准大气压下水沸腾后温度稳定在 100℃，继续加热的热量都用来把水变成水蒸气了。' },
          { question: '冬天冰冻的衣服慢慢变干，是因为冰——', options: ['熔化成了水', '直接升华为水蒸气', '被风吹散了', '渗进衣服里了'], answer: 1, explanation: '冰可以不经熔化直接变成水蒸气，这叫升华，寒冷干燥的冬天特别常见。' },
        ],
      },
      {
        id: 'l-kitchen-2', title: '发酵的秘密', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        questions: [
          { question: '面团蒸后变得蓬松多孔，是谁的功劳？', options: ['面粉自己膨胀', '酵母产生的二氧化碳', '揉面揉进的空气', '水蒸气把面吹大了'], answer: 1, explanation: '酵母分解面粉中的糖类产生二氧化碳，小气泡把面团撑出蜂窝状的孔洞。' },
          { question: '牛奶变成酸奶主要靠哪类微生物？', options: ['酵母菌', '霉菌', '乳酸菌', '益生菌都行'], answer: 2, explanation: '乳酸菌把牛奶里的乳糖发酵成乳酸，让蛋白质凝固，牛奶就变成了浓稠的酸奶。' },
          { question: '发面为什么要用约 35℃ 的温水？', options: ['烫死细菌', '这是酵母最活跃的温度', '面粉喜欢温水', '凉水会结冰'], answer: 1, explanation: '酵母在 30~38℃ 活性最高；水太烫会烫死酵母，水太冷它又"睡不醒"，面团发不起来。' },
        ],
      },
      {
        id: 'l-kitchen-3', title: '厨房里的热学', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        questions: [
          { question: '炒锅的锅柄做成木质或中空，主要是为了——', options: ['好看', '导热慢不烫手', '减轻重量', '省材料'], answer: 1, explanation: '木材和空气都是热的不良导体，导热慢，握着才不会烫手。' },
          { question: '蒸馒头比煮更"省火"还熟得快，因为水蒸气——', options: ['温度更高', '液化时会放出大量热', '压力更大', '流动性更强'], answer: 1, explanation: '水蒸气遇到相对冷的馒头会液化，液化过程放出大量热，效率很高。' },
          { question: '油浮在水面上，最主要的原因是——', options: ['油更热', '油的密度比水小', '油有颜色', '水在下面更干净'], answer: 1, explanation: '油的密度约 0.9g/cm³，小于水的 1g/cm³，而且油水互不相溶，所以油总是浮在上面。' },
        ],
      },
    ],
  },
  {
    id: 'c-body', title: '人体奥秘', emoji: '🧬', color: '#2080f0',
    desc: '心脏、大脑与免疫，认识你自己的小宇宙',
    lessons: [
      {
        id: 'l-body-1', title: '不停歇的心脏', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        questions: [
          { question: '心脏每天大约跳动多少次？', options: ['约 1 千次', '约 1 万次', '约 10 万次', '约 100 万次'], answer: 2, explanation: '按每分钟 70 次算，一天约 10 万次，一年超过 3600 万次，心脏是最敬业的"永动机"。' },
          { question: '推动血液全身循环的"动力泵"是——', options: ['肺', '心脏', '大脑', '肝脏'], answer: 1, explanation: '心脏不断收缩舒张，把血液泵向全身；肺负责气体交换，是血液的"加氧站"。' },
          { question: '跑步时心跳加快，是因为肌肉需要——', options: ['更多的氧气和养分', '更多的血液降温', '排出更多血液', '更强的震动'], answer: 0, explanation: '运动时肌肉耗氧量剧增，心脏加快泵血、呼吸加深，都是为了送去更多氧气和养分。' },
        ],
      },
      {
        id: 'l-body-2', title: '大脑与神经', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        questions: [
          { question: '膝盖被敲会不由自主弹腿（膝跳反射），这个信号——', options: ['要先到大脑再回来', '在脊髓就完成了反射', '由心脏指挥', '是骨头自己的反应'], answer: 1, explanation: '膝跳反射的反射弧在脊髓完成，不需要大脑参与，所以快到你想拦都拦不住。' },
          { question: '神经信号传导的最快速度大约是——', options: ['每秒 1 米', '每秒 10 米', '每秒 100 米以上', '每秒 1 万米'], answer: 2, explanation: '粗壮且有髓鞘的神经纤维传导速度可超过每秒 100 米，差不多是高铁的速度。' },
          { question: '睡个好觉对学习最大的帮助是——', options: ['省晚饭', '帮助大脑整理和巩固记忆', '让眼睛休息', '长高'], answer: 1, explanation: '睡眠中大脑会"回放"白天学到的内容，把它从临时缓存转存为长期记忆。' },
        ],
      },
      {
        id: 'l-body-3', title: '免疫小卫士', videoUrl: 'https://www.bilibili.com/video/BV1GJ411x7h7',
        questions: [
          { question: '疫苗预防传染病的原理是——', options: ['直接杀死所有病毒', '训练免疫系统提前认识病原', '给血液消毒', '把病毒关进身体里'], answer: 1, explanation: '疫苗让免疫系统"演习"一次，生成抗体和记忆细胞，等真正的病原来了就能快速应战。' },
          { question: '发烧其实是身体在——', options: ['出故障了', '提升体温帮助免疫细胞作战', '缺少维生素', '散热失败'], answer: 1, explanation: '较高的体温能抑制部分病原繁殖、加速免疫反应，是身体的防御手段之一。' },
          { question: '感冒为什么会反反复复地得？', options: ['上次没好利索', '感冒病毒变异快，抗体不通用', '免疫力永远失效', '被子不够厚'], answer: 1, explanation: '感冒病毒有上百种且不断变异，上次的抗体对"新面孔"无效，所以感冒总能卷土重来。' },
        ],
      },
    ],
  },
  {
    id: 'c-code', title: '编程思维第一课', emoji: '💻', color: '#f0a020',
    desc: '程序、循环与判断，像工程师一样思考',
    lessons: [
      {
        id: 'l-code-1', title: '什么是程序', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        questions: [
          { question: '程序最准确的比喻是——', options: ['一台会思考的机器', '写给计算机的逐步指令清单', '一堆随机的代码', '永远正确的魔法'], answer: 1, explanation: '程序就是把要做的事拆成一步一步的指令，计算机只会严格照着执行，一步都不会"自由发挥"。' },
          { question: '计算机真正能直接读懂的只有——', options: ['中文', '英文', '二进制 0 和 1', '流程图'], answer: 2, explanation: '无论 Python 还是 Scratch，最终都会被翻译成由 0 和 1 组成的机器码才被执行。' },
          { question: '程序员说的"bug"指的是——', options: ['程序里的错误', '一种病毒', '电脑臭虫', '外接设备'], answer: 0, explanation: 'bug 泛指程序缺陷。这词源于 1947 年一只真的卡进继电器、导致计算机故障的飞蛾。' },
        ],
      },
      {
        id: 'l-code-2', title: '循环的魔法', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        questions: [
          { question: '要让计算机画 100 颗星星，聪明的写法是——', options: ['复制粘贴 100 遍', '写一个循环执行 100 次', '让计算机自己想', '换一台更快的电脑'], answer: 1, explanation: '循环让计算机重复执行同一段指令，这正是计算机最擅长的"不喊累"的本领。' },
          { question: '程序陷入"死循环"是因为——', options: ['电脑没电了', '循环的结束条件永远不成立', '代码写得太短', '屏幕卡住了'], answer: 1, explanation: '循环缺少能被满足的退出条件就会永远执行下去，程序看起来就"卡死"了。' },
          { question: '`for i 从 1 到 5` 这样的循环体一共执行几次？', options: ['4 次', '5 次', '6 次', '无限次'], answer: 1, explanation: '从 1 数到 5 是 5 个数，循环体也就执行 5 次——边界值是新手最容易踩的坑。' },
        ],
      },
      {
        id: 'l-code-3', title: '条件判断小侦探', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        questions: [
          { question: '`if` 语句的作用是——', options: ['重复执行代码', '按条件选择不同的做法', '加快运行速度', '自动修错误'], answer: 1, explanation: 'if 让程序学会"看情况办事"：条件成立走 A 路线，不成立走 B 路线。' },
          { question: '"红灯停、绿灯行"的程序最适合用哪种结构？', options: ['循环', '条件判断', '注释', '变量'], answer: 1, explanation: '根据"当前灯的颜色"这个条件选择停或行，是典型的条件判断场景。' },
          { question: 'if / else if / else 依次排列时，程序怎么走？', options: ['全部都执行', '只执行最后一条', '从上到下命中一个就跳过其余', '随机执行一条'], answer: 2, explanation: '条件分支从上往下检查，命中第一个成立的分支后，剩下的分支直接跳过。' },
        ],
      },
    ],
  },
]

export type VideoType = 'mp4' | 'bilibili' | 'unknown'

export function videoTypeOf(url: string): VideoType {
  if (/\.mp4($|\?)/.test(url)) return 'mp4'
  if (/bilibili\.com\/video\/BV/.test(url)) return 'bilibili'
  return 'unknown'
}

export function bilibiliEmbedOf(url: string): string {
  const match = url.match(/bilibili\.com\/video\/(BV\w+)/)
  return match ? `//player.bilibili.com/player.html?bvid=${match[1]}&autoplay=0&high_quality=1` : ''
}

export function starsFor(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0 || correct <= 0) return 0
  const ratio = correct / total
  if (ratio >= 1) return 3
  if (ratio >= 0.6) return 2
  return 1
}

export const XP_PER_LEVEL = 25
export const FIRST_PASS_XP = 10
export const CLEAR_BONUS_XP = 20
export const REPLAY_XP = 2

export const LEVEL_TITLES = ['🌱 见习船员', '🧭 探索者', '🔍 学者', '⚡ 导航员', '🛠️ 工程师', '🌟 智者', '🏆 博士', '🚀 方舟船长']

export function levelOf(xp: number) {
  return Math.floor(Math.sqrt(Math.max(xp, 0) / XP_PER_LEVEL)) + 1
}

export function levelTitle(xp: number) {
  const index = Math.min(levelOf(xp), LEVEL_TITLES.length) - 1
  return LEVEL_TITLES[index]
}

export function xpForLevel(level: number) {
  return (level - 1) ** 2 * XP_PER_LEVEL
}

export interface BadgeDef { id: string; emoji: string; name: string; desc: string }

export const BADGES: BadgeDef[] = [
  { id: 'first-clear', emoji: '🎓', name: '初次启航', desc: '首次通关任意课时' },
  { id: 'perfect-lesson', emoji: '💯', name: '完美学霸', desc: '单课时全对通关' },
  { id: 'brain-25', emoji: '🧠', name: '知识库', desc: '累计答对 25 题（含重刷）' },
  { id: 'xp-500', emoji: '⭐', name: '攒分狂人', desc: 'XP 达到 500' },
  { id: 'course-crown', emoji: '👑', name: '三星大师', desc: '单课程全部课时 3 星' },
  { id: 'streak-3', emoji: '🔥', name: '持之以恒', desc: '连续学习 3 天' },
  { id: 'all-courses', emoji: '🗺️', name: '环球航行', desc: '通关全部门课程' },
  { id: 'level-5', emoji: '🏅', name: '崭露头角', desc: '等级达到 5' },
]

export const LEADERBOARD_BOTS = [
  { name: '小火箭', emoji: '🚀', xp: 1150 },
  { name: '夜猫子', emoji: '🦉', xp: 860 },
  { name: '海带公主', emoji: '🌊', xp: 640 },
  { name: '星球守卫', emoji: '🛸', xp: 430 },
  { name: '麦田圈', emoji: '🌾', xp: 260 },
  { name: '打盹的猫', emoji: '😸', xp: 120 },
  { name: '新来的', emoji: '🐣', xp: 30 },
]
```

- [ ] **Step 2: 验证**

Run: `npx vue-tsc -b`
Expected: exit 0。

- [ ] **Step 3: Commit**

```bash
git add src/data/courses.ts
git commit -m "feat: add learn course seed data"
```

---

### Task 2: 学习进度 Store

**Files:**
- Create: `src/stores/learn.ts`

**Interfaces:**
- Consumes: Task 1 的全部导出；`useAuthStore().user?.id`。
- Produces:
  - `interface LessonRecord { stars: 1 | 2 | 3; bestCorrect: number; bestTotal: number }`
  - `interface LessonResult { passed: boolean; stars: 0|1|2|3; gainedXp: number; leveledUp: boolean; newBadges: BadgeDef[]; oldLevel: number; newLevel: number; record: LessonRecord | null }`
  - `useLearnStore()`：`xp, level, title, streak, badgeIds`（computed）、`load(), recordOf(lessonId), isLessonUnlocked(course, index), courseStats(course) → { done, total, stars, maxStars, crowned }, allCleared, finishLesson(course, lessonIndex, correct, total) → LessonResult, resetSave()`
  - localStorage key：`innoark_learn_<userId>`（未登录用 `innoark_learn_guest`）。

- [ ] **Step 1: 写入 store**

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from './auth'
import { BADGES, CLEAR_BONUS_XP, COURSES, FIRST_PASS_XP, REPLAY_XP, levelOf, levelTitle, starsFor } from '../data/courses'
import type { BadgeDef, LearnCourse } from '../data/courses'

export interface LessonRecord { stars: 1 | 2 | 3; bestCorrect: number; bestTotal: number }

interface LearnSave {
  xp: number
  totalCorrect: number
  completed: Record<string, LessonRecord>
  badges: string[]
  streak: number
  lastLearnDate: string
}

export interface LessonResult {
  passed: boolean
  stars: 0 | 1 | 2 | 3
  gainedXp: number
  leveledUp: boolean
  newBadges: BadgeDef[]
  oldLevel: number
  newLevel: number
  record: LessonRecord | null
}

const emptySave = (): LearnSave => ({ xp: 0, totalCorrect: 0, completed: {}, badges: [], streak: 0, lastLearnDate: '' })

function dateKey(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const useLearnStore = defineStore('learn', () => {
  const auth = useAuthStore()
  const save = ref<LearnSave>(emptySave())
  let loadedUser: string | null = null

  function load() {
    const uid = auth.user?.id ?? 'guest'
    if (loadedUser === uid) return
    loadedUser = uid
    try {
      const parsed = JSON.parse(localStorage.getItem(`innoark_learn_${uid}`) || 'null') as Partial<LearnSave> | null
      save.value = { ...emptySave(), ...(parsed ?? {}) }
    } catch {
      save.value = emptySave()
    }
  }

  function persist() {
    localStorage.setItem(`innoark_learn_${auth.user?.id ?? 'guest'}`, JSON.stringify(save.value))
  }

  const xp = computed(() => save.value.xp)
  const level = computed(() => levelOf(save.value.xp))
  const title = computed(() => levelTitle(save.value.xp))
  const streak = computed(() => save.value.streak)
  const badgeIds = computed(() => save.value.badges)
  const allCleared = computed(() => COURSES.every((c) => courseStats(c).crowned))

  function recordOf(lessonId: string) {
    return save.value.completed[lessonId] ?? null
  }

  function isLessonUnlocked(course: LearnCourse, index: number) {
    load()
    if (index === 0) return true
    return !!save.value.completed[course.lessons[index - 1].id]
  }

  function courseStats(course: LearnCourse) {
    load()
    const done = course.lessons.filter((l) => save.value.completed[l.id]).length
    const stars = course.lessons.reduce((sum, l) => sum + (save.value.completed[l.id]?.stars ?? 0), 0)
    const maxStars = course.lessons.length * 3
    return { done, total: course.lessons.length, stars, maxStars, crowned: done === course.lessons.length && stars === maxStars }
  }

  function evaluateBadges(): BadgeDef[] {
    const earned: string[] = []
    if (Object.keys(save.value.completed).length >= 1) earned.push('first-clear')
    if (Object.values(save.value.completed).some((r) => r.bestCorrect === r.bestTotal)) earned.push('perfect-lesson')
    if (save.value.totalCorrect >= 25) earned.push('brain-25')
    if (save.value.xp >= 500) earned.push('xp-500')
    if (COURSES.some((c) => courseStats(c).crowned)) earned.push('course-crown')
    if (save.value.streak >= 3) earned.push('streak-3')
    if (allCleared.value) earned.push('all-courses')
    if (levelOf(save.value.xp) >= 5) earned.push('level-5')
    const fresh = earned.filter((id) => !save.value.badges.includes(id))
    save.value.badges.push(...fresh)
    return BADGES.filter((b) => fresh.includes(b.id))
  }

  function finishLesson(course: LearnCourse, lessonIndex: number, correct: number, total: number): LessonResult {
    load()
    const lesson = course.lessons[lessonIndex]
    const prev = save.value.completed[lesson.id] ?? null
    const firstPass = !prev
    const stars = starsFor(correct, total)
    const passed = stars >= 1
    let gainedXp = correct * (firstPass ? FIRST_PASS_XP : REPLAY_XP)
    if (passed && firstPass) gainedXp += CLEAR_BONUS_XP
    const oldLevel = levelOf(save.value.xp)
    save.value.xp += gainedXp
    save.value.totalCorrect += correct
    let record: LessonRecord | null = null
    if (passed) {
      record = {
        stars: Math.max(stars, prev?.stars ?? 0) as 1 | 2 | 3,
        bestCorrect: Math.max(correct, prev?.bestCorrect ?? 0),
        bestTotal: total,
      }
      save.value.completed[lesson.id] = record
    }
    const today = dateKey()
    if (save.value.lastLearnDate !== today) {
      save.value.streak = save.value.lastLearnDate === dateKey(1) ? save.value.streak + 1 : 1
      save.value.lastLearnDate = today
    }
    const newLevel = levelOf(save.value.xp)
    const newBadges = evaluateBadges()
    persist()
    return { passed, stars, gainedXp, leveledUp: newLevel > oldLevel, newBadges, oldLevel, newLevel, record }
  }

  function resetSave() {
    save.value = emptySave()
    persist()
  }

  return { xp, level, title, streak, badgeIds, load, recordOf, isLessonUnlocked, courseStats, allCleared, finishLesson, resetSave }
})
```

- [ ] **Step 2: 验证**

Run: `npx vue-tsc -b`
Expected: exit 0。

- [ ] **Step 3: Commit**

```bash
git add src/stores/learn.ts
git commit -m "feat: add learn progress store"
```

---

### Task 3: 课时播放器（视频 + 答题 + 结算）

**Files:**
- Create: `src/views/learn/LessonPlayer.vue`

**Interfaces:**
- Consumes: `LearnCourse`, `videoTypeOf`, `bilibiliEmbedOf`, `useLearnStore().finishLesson`。
- Produces: props `course: LearnCourse`、`lessonIndex: number`；emits `exit`（返回地图）、`next`（有下一课时且已通关，请求继续）。结算页在进入时调用一次 `finishLesson` 并展示：星级、XP 动画、升级全屏庆祝、新徽章横幅。

- [ ] **Step 1: 写入组件**（交互与视觉延续 Quiz.vue：选项锁定、正确✅/错误❌、连对🔥、emoji 漂浮、shake/pop 动画；结算页含错题回顾）

关键实现（完整文件）：

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NButton, NCard, NIcon, NProgress, NSpace, NTag, NText, useMessage } from 'naive-ui'
import { ArrowBackOutline, PlayOutline } from '@vicons/ionicons5'
import { bilibiliEmbedOf, videoTypeOf } from '../../data/courses'
import type { LearnCourse } from '../../data/courses'
import { useLearnStore } from '../../stores/learn'
import type { LessonResult } from '../../stores/learn'

const props = defineProps<{ course: LearnCourse; lessonIndex: number }>()
const emit = defineEmits<{ exit: []; next: [] }>()

const learn = useLearnStore()
const message = useMessage()

const lesson = computed(() => props.course.lessons[props.lessonIndex])

组件状态：`phase: 'video' | 'quiz' | 'result'`、`index`、`picked: number | null`、`streak`、`floaters`、`result: LessonResult | null`、`videoFailed`。

流程：
1. `phase='video'`：按 `videoTypeOf(lesson.videoUrl)` 渲染 `<video controls src>` / `<iframe :src="bilibiliEmbedOf(...)">` / 兜底卡片；底部按钮"我看完了，开始答题 📝"→ `phase='quiz'`。视频加载失败（video error 事件）时显示提示卡片，不阻塞进入答题。
2. `phase='quiz'`：逐题作答（4 选项、锁定、显示解析），最后一题点击"交卷 🏁"→ 调用 `result = learn.finishLesson(props.course, props.lessonIndex, correct, total)` → `phase='result'`。
3. `result`：全屏结算卡 —— 星级 ⭐（1~3，0 星提示"答对 1 题即通关"）、`+XP` 数字弹跳、`leveledUp` 时全屏庆祝遮罩（大 emoji + 新等级称号，2 秒后自动消失或点击关闭）、`newBadges` 横幅逐条弹入；错题列表；按钮：`再刷一遍`（重置 quiz 状态）、有下一课时且 `passed` 时显示 `下一课 →`（emit next）、`返回地图`（emit exit）。

样式要求：沿用 Quiz.vue 的 `float-up / shake / pop / fade-in-up / bounce-in` keyframes；视频容器 16:9、圆角 10px、黑色背景；结算页星星逐个 bounce-in。

- [ ] **Step 2: 验证**

Run: `npx vue-tsc -b`（exit 0）。浏览器（该组件尚未挂到路由，随 Task 5 一起验证视频播放与答题流）。

- [ ] **Step 3: Commit**

```bash
git add src/views/learn/LessonPlayer.vue
git commit -m "feat: add lesson player with video and quiz"
```

---

### Task 4: 课程闯关地图

**Files:**
- Create: `src/views/learn/CourseMap.vue`

**Interfaces:**
- Consumes: `LearnCourse`、`useLearnStore().recordOf / isLessonUnlocked / courseStats`。
- Produces: props `course: LearnCourse`；emits `exit`（回大厅）、`start(index: number)`（进入某课时）。

- [ ] **Step 1: 写入组件**

结构：
- 顶部：返回按钮 + 课程 emoji/标题/描述 + 进度条（`courseStats().done / total`）+ 星数 `⭐ stars/maxStars`；`crowned` 时显示 👑 奖杯 + 彩带 emoji 飘落。
- 中部：垂直蜿蜒的课时节点（奇偶行左右错开，CSS 连接线）：每个节点圆形按钮，三种状态——
  - 已通关：课程主色填充，显示课时序号与历史最佳星数 ⭐；
  - 当前可挑战（第一个未完成的已解锁节点）：脉冲呼吸光圈动画 + "开始"标签；
  - 锁定：灰色 + 🔒，不可点击。
- 点击可挑战/已通关节点 → `emit('start', index)`；解锁瞬间（从 locked 变 available）节点有 `bounce-in` 动画（用 `:class` 绑定节点状态实现）。

- [ ] **Step 2: 验证**

Run: `npx vue-tsc -b`（exit 0）。

- [ ] **Step 3: Commit**

```bash
git add src/views/learn/CourseMap.vue
git commit -m "feat: add course map with lesson unlocking"
```

---

### Task 5: 选课大厅 + 路由

**Files:**
- Create: `src/views/Learn.vue`
- Modify: `src/router/index.ts`（children 中 `{ path: '', ... }` 后新增 `{ path: 'learn', name: 'Learn', component: () => import('../views/Learn.vue') }`）

**Interfaces:**
- Consumes: `COURSES / LEADERBOARD_BOTS / BADGES / levelOf / xpForLevel / LEVEL_TITLES`、`useLearnStore()` 全部、`useAuthStore().user?.name`。
- Produces: 页面 phase `hub | map | player`；`activeCourse / activeLessonIndex` 状态；hub 内含排行榜与徽章墙、右上角"重置存档"（NPopconfirm 确认后 `resetSave()`）。

- [ ] **Step 1: 写入 Learn.vue**

布局（`max-width: 960px; margin: 0 auto`）：
- `phase==='hub'`：
  - 顶部英雄卡：学生名 + 称号 + 大号等级数字 + XP 进度条（`xpForLevel(level)` 到 `xpForLevel(level+1)`）+ 🔥xN 连续学习 + 总星数；
  - 课程卡片区（NGrid 3 列）：每卡 emoji、标题、描述、完成度进度条、⭐ 星数、`crowned` 显示 👑，点击 → `phase='map'`；
  - 排行榜卡：`[...LEADERBOARD_BOTS, { name: 我, emoji: '🙋', xp: learn.xp }]` 按 xp 降序，"我"行高亮（主色背景），显示排名奖牌 🥇🥈🥉；
  - 徽章墙卡：BADGES 网格，未解锁剪影（`filter: grayscale(1); opacity: 0.35`）+ 锁定提示，解锁显示彩色 + desc；
  - 页脚小字 `重置存档`。
- `phase==='map'`：渲染 `<CourseMap :course="activeCourse" @exit / @start>`。
- `phase==='player'`：渲染 `<LessonPlayer :course :lesson-index @exit="phase='map'" @next="activeLessonIndex += 1; phase='player'" />`。

- [ ] **Step 2: 路由注册**

`src/router/index.ts` children 数组 `my-groups` 条目之后插入：

```ts
{ path: 'learn', name: 'Learn', component: () => import('../views/Learn.vue') },
```

- [ ] **Step 3: 验证**

1. `npx vue-tsc -b` exit 0。
2. 浏览器：student 登录 → 访问 `http://localhost:5173/learn`：大厅渲染；点课程卡进地图；进第 1 课时 → mp4 可播放 → 答题 → 全对 3 星结算 + XP；回地图第 2 课时解锁动画；刷新页面进度仍在（localStorage）。

- [ ] **Step 4: Commit**

```bash
git add src/views/Learn.vue src/router/index.ts
git commit -m "feat: add learn hub with leaderboard and badges"
```

---

### Task 6: 侧边栏入口

**Files:**
- Modify: `src/components/Layout.vue`

**Interfaces:**
- Consumes: 既有 `MenuDef` 三张菜单表与 `renderIcon`。
- Produces: 学生/教师/管理三个菜单均含 `{ key: '/learn', title: '学习天地', icon: LearnIcon }`（学生菜单插在"闯关"后；教师/管理菜单插在"项目"前）。

- [ ] **Step 1: 修改菜单**

`@vicons/ionicons5` 导入中新增 `BulbOutline as LearnIcon`。三张菜单表插入：

```ts
{ key: '/learn', title: '学习天地', icon: LearnIcon },
```

- [ ] **Step 2: 验证**

1. `npx vue-tsc -b` exit 0。
2. 浏览器：student/teacher/admin 登录后侧栏均出现"学习天地"，点击进入 `/learn`，当前路由高亮。

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.vue
git commit -m "feat: add learn entry to sidebar menu"
```

---

### Task 7: 端到端验收 + 视觉审查

**Files:** 无新增（如有修复，按修复内容单独提交 `fix:`）。

- [ ] **Step 1: 全流程浏览器验收**

student 账号：大厅 → 三门课逐一通关 → 观察 XP 累计到 450 恰好 5 级 → 🎓/💯/🧠/🏅/👑/🗺️ 徽章按条件解锁 → 升级庆祝出现 → 排行榜"我"随 XP 上升 → 刷新不丢档；teacher/admin 账号：入口可见可玩。B 站 iframe 课时（人体奥秘第 3 课）能加载播放器。

- [ ] **Step 2: 视觉审查**

对大厅/地图/播放器/结算四个界面截图，交给 visual-judge 审查（布局、配色、动效可读性），按结论修复后重审。

- [ ] **Step 3: 收尾**

汇报：提交清单、验证结论、Mimosa 扫描状态。
