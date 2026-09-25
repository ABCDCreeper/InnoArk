# 第三期功能（极速对战 / 消息中心 / 班级动态）设计文档

日期：2026-09-24
状态：已经用户确认

## 目标

给平台补三块：学生侧最上头的对战玩法、全站高光时刻的消息聚合、教师端的学生动态可见性。延续统一 XP 体系，纯前端 + mock，不动 ArkEngine。

## 1. 极速对战（新页面 /battle）

- 入口：闯关开局区按钮。流程：抓 5 道公共题 → 双方各 5 格血条 → 每题 15 秒倒计时。
- 规则：自己答对 → 对手 -1 血；对手按脚本模拟（4~11 秒随机手速、约 70% 正确率）答对 → 自己 -1 血；自己超时未答不扣血但失去该题机会。有人血条归零或 5 题打完 → 结算，按剩余血量定胜负。
- 结算：胜 +30 XP / 负 +10 XP（统一 XP），growth 记战绩（胜/总场）；血条受击 shake、倒计时最后 5 秒变红。
- growth save 扩展：`battleWins: number; battleTotal: number`；`recordBattle(win: boolean): { xpGained: number; leveledUp: boolean }`。档案页显示战绩。

## 2. 消息中心（顶栏铃铛）

- `stores/notify.ts`，key `innoark_notify_<userId>`：`{ items: [{ id, text, time, read, to? }] }`，上限 50 条。
- 布局头部铃铛按钮（NBadge 未读数）→ NPopover 列表（文本 + 相对时间 + 未读高亮）+ "全部已读"；点击条目跳转 `to` 路由。
- 推送点：签到奖励、每日任务发奖、徽章解锁、卡片掉落、每日一题答对、对战结算。教师与管理角色也能看（消息本身按角色自然产生）。

## 3. 班级动态（教师端团队总览）

- mock 新增 `GET /api/teacher/activity`（教师及以上）：汇总 `quizAttempts`（闯关得分）与 `focusSessions`（专注完成），带姓名，按时间倒序，取 20 条。
- TeacherBoard 团队总览新增"最近动态"卡片：`姓名 ⚔️ 闯关 90/100 · x 分钟前` 时间线；空态提示。

## 非目标

真实多人对战（WebSocket 超范围）、浏览器外部推送通知、历史消息云同步。

## 验收标准

1. `npx vue-tsc -b` 通过；浏览器全流程：对战一局（胜/负 XP 与战绩正确）、铃铛收到各事件且已读跳转正确、教师号看到学生动态时间线。
2. 刷新持久、账号隔离。

## 实施约定

提交拆分：`feat: add notify store with header message center` → `feat: add quiz battle mode` → `feat: add class activity feed for teachers`；每任务 vue-tsc + 浏览器验证；少写注释。
