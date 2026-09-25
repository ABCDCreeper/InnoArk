# 第三期功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 极速对战（/battle）+ 顶栏消息中心 + 教师班级动态，三块补强统一 XP 生态。

**Architecture:** `stores/notify.ts` 消息流 + Layout 顶栏铃铛；`views/Battle.vue` 对战玩法（growth 记战绩发 XP）；mock 加 `/teacher/activity` 接口 + TeacherBoard 动态卡。

**Tech Stack:** Vue 3 + Naive UI + Pinia + localStorage + setInterval 驱动的对战循环。

## Global Constraints

- 全部奖励走 `learn.addXp()`；消息统一走 notify.push。
- localStorage key：`innoark_notify_<userId>`；消息上限 50。
- 提交拆分：`feat: add notify store with header message center` / `feat: add quiz battle mode` / `feat: add class activity feed for teachers`。
- 每任务 `npx vue-tsc -b` exit 0 + 浏览器手测；少写注释。
- Spec：`docs/superpowers/specs/2026-09-24-battle-notify-activity-design.md`。

---

### Task 1: notify store + 顶栏铃铛 + 全部推送点

**Files:** Create `src/stores/notify.ts`；Modify `src/components/Layout.vue`、`src/stores/growth.ts`、`src/views/learn/LessonPlayer.vue`、`src/views/Quiz.vue`

**Interfaces:**
- notify：`push(text: string, to?: string)`；`unread: number`；`items: NotifyItem[]`；`markAllRead()`；`markRead(id)`。`interface NotifyItem { id: string; text: string; time: string; read: boolean; to?: string }`。
- growth 推送点：signIn → `📅 签到成功，+N XP`；grantTaskXp → `🎯 每日任务完成，+N XP`；answerDaily 答对 → `🌟 每日一题答对，+N XP`。
- LessonPlayer submit：新徽章 `🎖️ 解锁徽章「name」`、掉卡 `🃏 获得新卡片「name」`（to: '/learn'）。
- Quiz finish：同上（徽章/掉卡）。
- Layout header：NBadge(count=unread, offset) 包 NButton circle 铃铛（NotificationsOutline 图标）→ NPopover(trigger click, width 320)：列表（未读加粗高亮、time 显示 MM-DD HH:mm）、点击条目 `router.push(to)` + markRead、底部"全部已读"按钮、空态"暂无消息"。

- [ ] Step 1 notify.ts（模式仿 growth：loadedUser 守卫 + persist）
- [ ] Step 2 growth/LessonPlayer/Quiz 埋 push
- [ ] Step 3 Layout 铃铛 UI
- [ ] Step 4 验证：vue-tsc exit 0；浏览器签到 → 铃铛出现未读 → 点开列表 → 已读清零
- [ ] Step 5 Commit `feat: add notify store with header message center`

---

### Task 2: 极速对战

**Files:** Create `src/views/Battle.vue`；Modify `src/router/index.ts`、`src/views/Quiz.vue`、`src/stores/growth.ts`、`src/views/Profile.vue`

**Interfaces:**
- growth：`recordBattle(win: boolean): { xpGained: number; leveledUp: boolean }`（save 加 `battleWins/battleTotal`，win +30 / 负 +10 XP，notify push `⚔️ 对战胜利/惜败，+N XP`，to '/battle'）；`battleWins/battleTotal` computed。
- 路由 `{ path: 'battle', name: 'Battle' }`；Quiz.vue 开局区加 `⚔️ 极速对战` 按钮（router.push）。
- Battle.vue 三阶段：
  - `start`：规则卡（5 题 15 秒、答对砍对方一刀）+ 战绩统计 + 开始按钮（fetchQuizQuestions(5) 公共池，空题报错）。
  - `fighting`：双方头像 + ❤️x5 血条行；题干 + 4 选项 + 倒计时进度条（setInterval 100ms，剩 5 秒变红）；逻辑：每题开始时安排对手定时器（4~11s 内命中，70% 正确率）——对手命中且正确 → 我方 -1 血 + 受击 shake；我答对 → 对方 -1 血 + 命中动画；我答错/超时无事（对手独立结算）。双方本回合出结果后 1.2s 进下一题；有人归零提前结束。
  - `result`：🏆 胜利 / 💪 惜败 + `recordBattle(win)` 的 XP 展示 + 再来一局 / 回闯关。
- Profile.vue 战绩卡追加：`⚔️ 对战 x 胜 / y 场`。

- [ ] Step 1 growth.recordBattle
- [ ] Step 2 Battle.vue 全量 + 路由 + Quiz 入口 + Profile 战绩
- [ ] Step 3 验证：vue-tsc exit 0；浏览器打一局（可故意全对/全错各验一次）→ XP 与战绩正确 → 铃铛收到对战消息
- [ ] Step 4 Commit `feat: add quiz battle mode`

---

### Task 3: 班级动态

**Files:** Modify `mock/handlers.ts`、`src/api/teacher.ts`、`src/views/TeacherBoard.vue`

**Interfaces:**
- mock：`GET /api/teacher/activity`（rank ≥ 1）→ `{ items: [{ type: 'quiz' | 'focus', name, username, text, createdAt }] }`：quizAttempts → `text: 闯关获得 ${score}/${total}`；focusSessions(type=focus) → `text: 完成 ${durationMin} 分钟专注`；合并按 createdAt 倒序取 20。
- api/teacher.ts：`fetchTeacherActivity(): get<{ items: TeacherActivity[] }>('/teacher/activity')`，`interface TeacherActivity { type: string; name: string; username: string; text: string; createdAt: string }`。
- TeacherBoard：团队总览卡片区内新增"📡 最近动态"卡（时间线：`{{name}} · {{text}} · 相对时间`；相对时间函数：分钟/小时/天）；空态"最近还没有动态"。

- [ ] Step 1 mock 路由
- [ ] Step 2 api 函数 + TeacherBoard 动态卡
- [ ] Step 3 验证：vue-tsc exit 0；teacher 登录 → /teacher 看到张三的闯关/专注动态
- [ ] Step 4 Commit `feat: add class activity feed for teachers`

---

### Task 4: 端到端验收

- [ ] 全流程：student 对战两局（一胜一负）→ 铃铛消息齐全 → profile 战绩；teacher 看动态。
- [ ] 汇报提交清单与验证结论。
