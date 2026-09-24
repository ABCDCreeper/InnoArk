# 学习天地（在线视频学习 + 闯关答题）设计文档

日期：2026-09-24
状态：已经用户确认

## 背景与目标

InnoArk 已有知识闯关问答页（Quiz.vue）和教师题库，但缺少"看视频学知识"的主线学习体验。本期新增"学习天地"：学生在线观看教学视频、答配套题目、按课程闯关推进，并用游戏化元素（XP 等级、徽章、排行榜、动效）让学习有趣。

## 范围与非目标

**本期范围**：纯前端实现，课程数据硬编码在前端，进度存 localStorage，不改 ArkEngine 后端。

**非目标（后续迭代）**：
- 教师端建课/配题管理界面
- 视频上传到后端（数据模型预留视频链接字段，将来贴链接或上传都只是换数据来源）
- 后端同步学习进度

## 架构与文件结构

```
src/
├─ data/courses.ts        # 硬编码课程数据（课程/课时/题目）
├─ stores/learn.ts        # Pinia store：进度/XP/徽章，localStorage 持久化
├─ views/Learn.vue        # 选课大厅（含排行榜、徽章墙）
├─ views/learn/
│   ├─ CourseMap.vue      # 课程闯关地图
│   └─ LessonPlayer.vue   # 课时播放器（视频 + 答题 + 结算）
└─ router/index.ts        # 新增 /learn 路由
```

页面内部用 phase 切换"选课大厅 → 课程地图 → 课时播放"三阶段，与 Quiz.vue 的 phase 模式一致，不加子路由。

## 课程数据

3 门示范课，每门 3 个课时，每个课时 = 标题 + 视频 + 3 道选择题（含解析）：

1. 🔬 厨房里的科学
2. 🧬 人体奥秘
3. 💻 编程思维第一课

题目为跨学科趣味题，风格延续 Quiz 页"错题涨知识"的写法。视频为占位内容：CC0 示例 mp4 与 B 站科普视频真链接混用，保证两种播放器路径都被验证。

```ts
// 数据结构示意
interface LessonQuestion { question: string; options: string[]; answer: number; explanation: string }
interface Lesson { id: string; title: string; videoUrl: string; questions: LessonQuestion[] }
interface Course { id: string; title: string; emoji: string; color: string; desc: string; lessons: Lesson[] }
```

## 存档设计

localStorage key：`innoark_learn_<userId>`（按用户隔离）。

```ts
interface LearnSave {
  xp: number
  completed: Record<string, { stars: 1 | 2 | 3; bestCorrect: number; bestTotal: number }> // key = lessonId
  badges: string[]
  streak: number       // 连续学习天数
  lastLearnDate: string // YYYY-MM-DD
}
```

选课大厅角落提供"重置存档"小按钮，方便演示。

## 学习流程与解锁

三阶段：选课大厅 → 课程地图 → 课时播放。

- 课程全部开放自选；课程内课时顺序解锁：上一课时通关（至少 1 星，即至少答对 1 题）才解锁下一课，0 星需重刷；锁定节点显示 🔒，解锁瞬间 bounce 动画。
- 星级：全对 3 星；答对 2 题 2 星；通关 1 星。存历史最佳星数与最佳成绩。
- 课程内全部课时 3 星后，地图尽头亮 👑 奖杯；大厅课程卡片显示完成度进度条。

## 趣味系统

**XP 与等级称号**
- 首次通关：每题 +10 XP，通关奖励 +20 XP。
- 重刷巩固：每题 +2 XP（防无限刷分）。
- 等级 = `floor(sqrt(xp / 25)) + 1`，共 8 个称号：🌱 见习船员、🧭 探索者、🔍 学者、⚡ 导航员、🛠️ 工程师、🌟 智者、🏆 博士、🚀 方舟船长。全课程首次通关共可得 450 XP（27 题 × 10 + 9 课时 × 20），恰好达到 5 级；冲更高级称号靠重刷积累。
- 升级瞬间全屏庆祝弹层。

**徽章（8 枚）**
| 徽章 | 条件 |
|---|---|
| 🎓 初次启航 | 首次通关任意课时 |
| 💯 完美学霸 | 单课时全对通关 |
| 🧠 知识库 | 累计答对 25 题（含重刷） |
| ⭐ 攒分狂人 | XP 达到 500 |
| 👑 三星大师 | 单课程全部课时 3 星 |
| 🔥 持之以恒 | 连续学习 3 天 |
| 🗺️ 环球航行 | 通关全部门课程 |
| 🏅 崭露头角 | 等级达到 5 |

徽章解锁时在结算页弹横幅动画；选课大厅有徽章展示墙，未解锁显示剪影。

**排行榜**
7 个虚拟同学（emoji 头像 + 固定 XP），与"我"合并排序，高亮"我"一行，放在选课大厅。

**连续学习天数**
按日期比对 lastLearnDate：同一天不变，隔天 +1，断签清零。大厅头部显示 🔥 x N。

**视觉动效**
延续 Quiz.vue 风格：答对 emoji 漂浮、连对 🔥 标记、答错 shake、分数 pop；地图解锁动画、通关彩带、升级庆祝。全部用 CSS 动画实现。

## 视频播放

按链接自动识别：
- 以 `.mp4` 结尾 → 原生 `<video controls>`。
- `bilibili.com/video/BVxxx` 标准链接 → 转为 `player.bilibili.com/player.html?bvid=xxx` 的 iframe 内嵌。
- 其他链接 → 不放播放器，直接显示兜底提示卡片。

兜底提示不阻塞继续答题。

## 导航

- 侧边栏新增"🎓 学习天地"入口，学生/教师/管理菜单都加入，不设角色限制。
- 路由 `/learn`，命名 `Learn`。

## 验收标准

1. `yarn build`（含 vue-tsc 类型检查）通过。
2. dev server 手测完整流程：选课 → 看视频 → 答题 → 解锁下一课 → 升级庆祝 → 徽章解锁 → 排行榜更新；mp4 与 B 站两种视频都能播。
3. 存档刷新页面不丢，不同账号互不影响。
4. 页面渲染截图通过视觉审查。

## 实施约定

- 提交遵循 Conventional Commits，参考仓库既有风格：小写英文祈使句、按里程碑小步提交（如 `feat: add learn hub with courses and leaderboard`）。
- 尽量少写代码注释，只写必要约束。
