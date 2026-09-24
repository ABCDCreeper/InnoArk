# 成长激励闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在学习天地之上实现签到任务、知识图鉴、错题本+每日一题、成长档案页，共享统一 XP。

**Architecture:** 新增 `stores/growth.ts` 成长中枢与 `data/collection.ts` 图鉴数据；learn store 扩展 `addXp/todayLearned`；视图层在 Learn.vue（签到/任务/图鉴 phase）、Quiz.vue（错题/每日一题/掉落打点）、LessonPlayer.vue（掉落展示）集成；新增 Profile.vue 档案页（Canvas 分享卡片）。

**Tech Stack:** Vue 3 + Naive UI + Pinia + localStorage；Canvas 2D 生成分享卡。

## Global Constraints

- 统一 XP：所有奖励走 `learn.addXp()`；升级轻提示不弹全屏。
- 纯前端 + localStorage（key 前缀 `innoark_growth_<userId>`），不动后端。
- 提交拆分（每任务一个）：`feat: add growth store with sign-in and daily tasks` / `feat: add knowledge card collection` / `feat: add wrong-answer book and daily challenge` / `feat: add growth profile page`。
- 每任务验证：`npx vue-tsc -b` exit 0 + dev server（localhost:5173，mock）浏览器手测。
- 尽量少写注释；数值以 spec `docs/superpowers/specs/2026-09-24-growth-loop-design.md` 为准。

---

### Task 1: growth store + 签到 + 每日任务

**Files:** Create `src/stores/growth.ts`；Modify `src/stores/learn.ts`、`src/views/Learn.vue`

**Interfaces（后续任务依赖，签名固定）:**
- learn：`addXp(n: number): { leveledUp: boolean }`；save 增 `todayLearned: number`、`todayDate: string`（跨天清零；通关课时 +1）。
- growth：`signIn(): { xpGained: number } | null`；`signedToday: boolean`；`signDays: number`；`monthSigns: string[]`；`tasks: Array<{ id, label, emoji, done, claimed }>；refreshTasks(): Promise<void>`（内部查 focus stats）；`markQuizPlayed()`；`todayLearnedCount`；`grantXpForTasks()` 自动发奖；`reward(n, reason)` 统一走 learn.addXp 并返回 leveledUp。

- [ ] **Step 1: learn.ts 扩展**——LearnSave 加 `todayLearned: number; todayDate: string`（emptySave 补 0/''）；`load()` 与 `finishLesson()` 开头：`if (save.value.todayDate !== dateKey()) { save.value.todayLearned = 0; save.value.todayDate = dateKey() }`；finishLesson passed 时 `save.value.todayLearned += 1`；新增并导出 `addXp(n)`（oldLevel/newLevel 比较，返回 `{ leveledUp }`，内部 persist）。
- [ ] **Step 2: growth.ts 全量实现**——state/持久化模式仿 learn store（loadedUser 守卫）；`signIn()` 计算连续天数（从今天往回数 signs），奖励 `[5,10,15,20][min(streak-1,3)]`；`tasks` 四项判定见 spec 表格；`refreshTasks()` 拉 `fetchFocusStats()`（`src/api/focus.ts` 已有）取今日 minutes；任务满足且未发奖自动 `addXp(10)`（claimed 记账），四项全发过再 `addXp(5)` 一次性。
- [ ] **Step 3: Learn.vue 大厅集成**——hero 卡下方并排两张卡：签到卡（今日状态按钮 + 当月点阵日历，`monthSigns` 渲染）与任务卡（4 行 emoji+label+✅/待完成）。签到/进入大厅时调 `refreshTasks()`；任务发奖/签到发奖 `leveledUp` 时 `message.success('升级啦！…')`。
- [ ] **Step 4: 验证**——`npx vue-tsc -b` exit 0；浏览器：student 登录 → /learn 签到得 XP（等级/排行榜联动）→ 任务"看 1 课"通关一课后点亮并发奖 → 刷新状态保持、跨天可重置（改 localStorage lastLearnDate 模拟）。
- [ ] **Step 5: Commit** `feat: add growth store with sign-in and daily tasks`

---

### Task 2: 知识图鉴

**Files:** Create `src/data/collection.ts`；Modify `src/stores/growth.ts`、`src/views/Learn.vue`、`src/views/learn/LessonPlayer.vue`、`src/views/Quiz.vue`

**Interfaces:**
- collection：`interface CollectionCard { id: string; set: string; emoji: string; name: string; fact: string }`；`interface CardSet { id: string; name: string; emoji: string; color: string }`；`const CARD_SETS: CardSet[]`（6 套：s-kitchen 厨房科学🔬 / s-body 人体密码🧬 / s-code 编程世界💻 / s-space 星际探索🚀 / s-earth 自然百科🌿 / s-mind 思维陷阱🧠）；`const CARDS: CollectionCard[]`（6×6=36 张，冷知识文案写足）；`cardsOfSet(setId): CollectionCard[]`。
- growth：`collection: string[]`（computed）；`grantLessonDrop(courseId): CollectionCard | null`（c-kitchen/c-body/c-code → 对应套系；随机未拥有）；`grantQuizDrop(correct: number): CollectionCard | null`（≥6 时全池随机未拥有）；`setComplete(setId): boolean`；集齐时自动 `learn.addXp(30)`（一次性，靠 collection 去重自然保证）。
- LessonPlayer 结算页：`grantLessonDrop(props.course.id)` 结果非空时展示"🎁 获得新卡片"块（emoji + name，flip 动画）。
- Quiz.vue 结果页：提交成功后 `grantQuizDrop(score / 10)` 非空时同样展示。
- Learn.vue：大厅任务卡旁"🃏 图鉴进度 x/36"入口按钮 → `phase='collection'`：按套系分组的卡片墙（拥有彩色、未拥有 `grayscale+opacity` 剪影），点击翻卡（CSS rotateY）显示 fact；套系头显示 `n/6` 与集齐 👑。

- [ ] **Step 1: 写 collection.ts（36 张卡内容全部写死）**
- [ ] **Step 2: growth.ts 掉落逻辑**
- [ ] **Step 3: Learn.vue 图鉴 phase + 两处结算页掉落展示**
- [ ] **Step 4: 验证**——vue-tsc exit 0；浏览器：通关新课 → 结算出卡 → 图鉴墙点亮；闯关答对 ≥6 → 出公共池卡；集齐一套 +30 XP。
- [ ] **Step 5: Commit** `feat: add knowledge card collection`

---

### Task 3: 错题本 + 每日一题

**Files:** Modify `src/stores/growth.ts`、`src/views/Quiz.vue`

**Interfaces:**
- growth：`interface WrongItem { question: string; options: string[]; answer: number; explanation: string; date: string }`；`recordWrong(item: Omit<WrongItem, 'date'>)`（题干去重、unshift、截断 50）；`wrongBook: WrongItem[]`；`removeWrong(question: string)`；`clearWrong()`；`dailyQuestion: { question, options, answer, explanation } | null`（异步初始化：`initDailyQuestion(fetcher)` 由 Quiz.vue 传入 `fetchQuizQuestions(20)`，失败回退 COURSES 题目池扁平化）；`answerDaily(correct: boolean): { xpGained: number } | null`（当天首次答对才发奖：5 + 2×min(dailyStreak-1,5)，维护 dailyStreak/dailyLastDate/daily）。
- Quiz.vue：`pick()` 答错分支调 `growth.recordWrong(...)`；开局 phase 加"📝 错题本 (n)"按钮 → NDrawer（每条卡片：题干 + 选项可点即时判对错 + 解析 + 答对移除；顶部清空按钮）；开局 phase 加"🌟 每日一题"卡（选项点击 → 即时判对错 + 解析 + XP 提示；已答对显示已完成状态）。

- [ ] **Step 1: growth.ts 错题/每日一题逻辑**
- [ ] **Step 2: Quiz.vue 三处集成（打点、抽屉、每日卡）**
- [ ] **Step 3: 验证**——vue-tsc exit 0；浏览器：答错题入本 → 重答答对移除；每日一题答对得 XP、再进不重复发奖；刷新后当日固定同一题。
- [ ] **Step 4: Commit** `feat: add wrong-answer book and daily challenge`

---

### Task 4: 成长档案页

**Files:** Create `src/views/Profile.vue`；Modify `src/router/index.ts`、`src/components/Layout.vue`

**Interfaces:**
- 路由 `{ path: 'profile', name: 'Profile', component: () => import('../views/Profile.vue') }`；三张菜单在"学习天地"后加 `{ key: '/profile', title: '成长档案', icon: LearnIcon }`。
- Profile.vue 数据源：learn（等级/徽章/XP）、growth（签到天数/图鉴进度/错题数）、`fetchQuizStats()`、`fetchFocusStats()`、`fetchProjects()`（项目数）；布局复用 learn 风格（卡片网格，max-width 960）。
- Canvas 成长卡：`generateCard()` 绘制 720×960（渐变底 #1e293b→#4c1d95、圆角卡面、标题"智创方舟 · 成长卡片"、姓名、`Lv.x 称号` 大字、XP/答对/专注/图鉴/徽章统计行、徽章 emoji 行、页脚日期+InnoArk），`toDataURL('image/png')` → `<a download="growth-card.png">` 触发下载；emoji 绘制用 `ctx.font` 直接 fillText。

- [ ] **Step 1: Profile.vue 全量实现 + 路由 + 菜单**
- [ ] **Step 2: 验证**——vue-tsc exit 0；浏览器：student 进入 /profile 各统计正确；下载的 PNG 可打开且内容完整；teacher/admin 入口可见。
- [ ] **Step 3: Commit** `feat: add growth profile page`

---

### Task 5: 端到端验收

- [ ] 浏览器跑通闭环一天：签到 → 任务逐个点亮 → 看课掉卡 → 闯关掉卡+错题入库 → 每日一题 → 档案页核对全部数字 → 下载卡片。
- [ ] 刷新持久化 + 换账号隔离复查。
- [ ] 汇报：提交清单、验证结论、遗留事项。
