# 成长激励闭环（签到任务 / 知识图鉴 / 错题本每日一题 / 成长档案）设计文档

日期：2026-09-24
状态：已经用户确认（四项功能全选，统一设计）

## 目标

在现有学习天地（XP/等级/徽章/排行榜）之上，把签到、任务、图鉴、错题、档案做成互相喂料的激励闭环：每天有理由回来（签到任务），学习有掉落惊喜（图鉴），错题有去处（错题本），成长看得见（档案页 + 分享卡片）。

## 范围与非目标

- 纯前端 + localStorage（mock 模式下完整可玩），不改 ArkEngine 后端。
- 非目标：补签、跨设备同步、卡片交易、手动领取任务奖励（自动发放）。

## 统一 XP

- 全站只有一份 XP，即学习天地现有体系（等级 = floor(sqrt(xp/25))+1、称号、排行榜）。
- learn store 新增 `addXp(n)`：签到/任务/每日一题奖励走它；升级时由调用方用 message 轻提示，不弹全屏庆祝（通关升级的全屏庆祝保留）。
- learn save 新增 `todayLearned` + `todayDate`：跨天自动清零，用于"看 1 课"任务判定。

## 每日签到 + 每日任务（growth store）

`stores/growth.ts`，key `innoark_growth_<userId>`：

```ts
interface GrowthSave {
  signs: string[]                       // 已签到日期 YYYY-MM-DD
  quizPlayedDate: string                // 最近一次闯关日期
  collection: string[]                  // 已拥有卡片 id
  wrongBook: WrongItem[]                // 上限 50，按题干去重
  daily: Record<string, boolean>        // 每日一题当日是否已答对
  dailyStreak: number
  dailyLastDate: string
  claimed: Record<string, string[]>     // date -> 已发奖任务 id
}
```

- **签到**：非当日可点；奖励按连续天数 [5,10,15,20][min(streak-1,3)] XP；大厅展示当月日历点阵。
- **每日任务 4 项，各 +10 XP，全完成 +5**：
  | id | 任务 | 判定 |
  |---|---|---|
  | lesson | 📖 看 1 节课 | learn.todayLearned ≥ 1 |
  | quiz | ⚔️ 答 1 局闯关 | growth.quizPlayedDate == 今天（Quiz.vue 提交成功时打点） |
  | focus | 🍅 专注 25 分钟 | `/focus/stats` 今日 minutes ≥ 25 |
  | sign | ✅ 完成签到 | signs 含今天 |
- 满足且未发过奖 → 自动 addXp。大厅渲染时与相关操作后重算。

## 知识图鉴（data/collection.ts + growth）

- 6 套系 × 6 张 = 36 张卡：`{ id, set, emoji, name, fact }`；套系：厨房科学（对应课程 c-kitchen）、人体密码（c-body）、编程世界（c-code）、星际探索、自然百科、思维陷阱。
- 掉落：首次通关课时 → 对应套系随机新卡；闯关一局答对 ≥6 题 → 全池随机新卡；已集齐该池 → 不掉。
- 集齐一套 → +30 XP、套系点亮。
- UI：学习天地大厅"卡片图鉴"入口 → 图鉴 phase（套系分组、未获得剪影、点击翻卡看 fact）；结算页展示"🎁 获得新卡"（LessonPlayer 与 Quiz 结果页）。

## 错题本 + 每日一题（闯关页）

- **错题本**：答错自动收录 `{ question, options, answer, explanation, date }`，题干去重、上限 50。闯关页开局区按钮 → NDrawer 列表，可重答（点选项即时判对错），答对即移出，支持清空。
- **每日一题**：闯关页开局区卡片；题源 = mock 公共题库（fetchQuizQuestions(20)，失败回退 COURSES 题目池），按日期 hash 固定 1 题；答对 +5 XP + 连续天数加成（+2 × min(dailyStreak-1, 5)），当天仅一次，growth.daily 记录。

## 个人成长档案（/profile）

- 新页面 + 三张侧栏菜单加"成长档案"入口。
- 聚合：等级称号大卡 + XP 条、闯关统计、专注今日/周趋势（复用 WeeklyBar）、项目数、签到天数、徽章墙、图鉴进度。
- **生成成长卡片**：Canvas 手绘 720×960 渐变卡（等级称号、统计、徽章 emoji、日期水印），一键下载 PNG。

## 验收标准

1. `npx vue-tsc -b` 通过。
2. 浏览器全流程：签到→任务依次点亮→XP 累计联动等级/排行榜；通关与闯关掉卡；图鉴翻卡；错题收录与重答移除；每日一题当天固定且只奖一次；档案页数据齐全、卡片可下载。
3. 刷新不丢档，不同账号隔离。

## 实施约定

- Conventional Commits 小步提交：`feat: add growth store with sign-in and daily tasks` → `feat: add knowledge card collection` → `feat: add wrong-answer book and daily challenge` → `feat: add growth profile page`。
- 尽量少写注释；验证 = vue-tsc + dev server 浏览器手测（无单测框架）。
