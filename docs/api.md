# InnoArk「智创方舟」RESTful API 文档

> 智能跨学科项目式学习协同平台 — 后端接口契约文档
> 前端已按本文档实现全部调用；开发阶段由 `mock/`（Vite 中间件）模拟响应，替换为真实后端时关闭 mock 插件即可。

## 1. 通用约定

### 1.1 基础信息

| 项目 | 约定 |
|---|---|
| Base URL | `/api`（开发环境建议配置 Vite 代理或同域部署） |
| 数据格式 | `Content-Type: application/json; charset=utf-8` |
| 字段风格 | JSON camelCase，时间统一为 ISO 8601 字符串（UTC） |
| 接口风格 | RESTful：名词复数资源 + HTTP 方法表达操作 |

### 1.2 鉴权

- 登录成功返回 `token`，后续请求在请求头携带：`Authorization: Bearer <token>`
- 除 `POST /api/sessions`、`POST /api/users` 外，所有接口均需鉴权；未携带或无效返回 `401`

### 1.3 HTTP 状态码

| 状态码 | 语义 | 说明 |
|---|---|---|
| `200` | 成功 | 响应体为资源 JSON |
| `201` | 创建成功 | 响应体为新资源 |
| `204` | 删除/登出成功 | 无响应体 |
| `400` | 参数错误 | 请求体缺字段 / 非法值 |
| `401` | 未认证 | token 缺失或无效 |
| `403` | 无权限 | 角色或成员身份不满足 |
| `404` | 资源不存在 | 接口或资源未找到 |
| `409` | 冲突 | 业务冲突（见错误码） |
| `500` | 服务端错误 | — |

### 1.4 错误响应格式

```json
{ "error": { "code": "TASK_NOT_FOUND", "message": "任务不存在" } }
```

| code | 触发场景 |
|---|---|
| `VALIDATION_ERROR` | 请求参数错误（400） |
| `UNAUTHORIZED` | 未登录或 token 失效（401） |
| `FORBIDDEN` | 无权限（403） |
| `NOT_FOUND` / `PROJECT_NOT_FOUND` / `TASK_NOT_FOUND` | 资源不存在（404） |
| `INVALID_CREDENTIALS` | 用户名或密码错误（401） |
| `USERNAME_TAKEN` | 注册时用户名已存在（409） |
| `INVALID_INVITE` | 邀请码无效（409） |
| `ALREADY_MEMBER` | 已在该项目中（409） |
| `TEAM_FULL` | 队伍已满 4 人（409） |
| `PROJECT_NOT_FINISHED` | 项目未结题（409） |

### 1.5 列表响应格式（分页）

所有 GET 列表接口统一返回：

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 20 }
```

`?page=`、`?pageSize=` 查询参数（当前数据量小，Mock 未强制分页，后端需支持）。

### 1.6 权限模型

| 资源 | 学生（项目成员） | 教师 |
|---|---|---|
| 项目协作内容（导图/便签/任务/打卡） | 读写 | 只读 |
| 教师批注 | 只读 | 读写 |
| 教师总览 `/api/teacher/*` | 禁止（403） | 读写 |
| 项目结题 | 可发起 | — |

---

## 2. 数据模型

### 2.1 User 用户

```json
{
  "id": "u1",
  "username": "student",
  "name": "张三",
  "role": "student"
}
```

`role`: `student` 学生 | `teacher` 教师。响应中**不含** `password`。

### 2.2 Topic 课题

```json
{
  "id": "topic1",
  "title": "火星基地能源方案设计",
  "summary": "课题简介…",
  "subjects": ["物理", "工程"],
  "tags": ["能源", "太空"],
  "difficulty": "挑战"
}
```

`difficulty`: `入门` | `进阶` | `挑战`。

### 2.3 Project 项目

```json
{
  "id": "p1",
  "topicId": "topic1",
  "name": "火星基地能源方案",
  "status": "active",
  "inviteCode": "P1-7F3A",
  "leaderId": "u1",
  "description": "探索火星基地的能源自给方案",
  "createdAt": "2026-07-30T02:00:00.000Z",
  "updatedAt": "2026-08-11T01:00:00.000Z",
  "finishedAt": null,
  "topic": { "id": "topic1", "title": "…", "subjects": ["物理"] },
  "members": [ /* User[] */ ],
  "progress": { "done": 3, "total": 6 }
}
```

`status`: `active` 进行中 | `finished` 已结题。`description` 项目简介（≤2000 字，组员与教师可编辑）。`progress` 由后端按任务状态实时计算。

### 2.4 MindNode 思维导图节点

```json
{ "id": "n1", "projectId": "p1", "parentId": null, "label": "火星基地能源方案", "createdAt": "…", "updatedAt": "…" }
```

`parentId` 为 `null` 表示根节点；树形结构由 `parentId` 表达（同项目内），布局由前端计算。

### 2.5 StickyNote 灵感便签

```json
{ "id": "sn1", "projectId": "p1", "content": "灵感内容", "color": "#fde68a", "x": 30, "y": 40, "createdAt": "…", "updatedAt": "…" }
```

`x`/`y` 为便签在画布内的绝对坐标（px）。

### 2.6 Task 任务

```json
{
  "id": "t1",
  "projectId": "p1",
  "title": "调研火星基地用电需求",
  "description": "任务描述",
  "assigneeId": "u1",
  "status": "done",
  "dueDate": "2026-08-05T00:00:00.000Z",
  "createdAt": "…",
  "updatedAt": "…"
}
```

`status`: `todo` 待认领 | `doing` 进行中 | `review` 待验收 | `done` 已完成。
`assigneeId` 为 `null` 表示未认领。

### 2.7 TaskLog 任务动态（版本记录）

```json
{ "id": "l1", "projectId": "p1", "taskId": "t1", "userId": "u1", "action": "status", "detail": "状态更新为 已完成", "createdAt": "…" }
```

`action`: `create` | `edit` | `claim` | `status` | `delete`。由后端在任务变更时自动追加。

### 2.8 Checkin 打卡记录

```json
{ "id": "c1", "projectId": "p1", "userId": "u1", "content": "完成用电需求调研", "createdAt": "…" }
```

### 2.9 Feedback 系统反馈

```json
{ "id": "f1", "projectId": "p1", "userId": "u1", "type": "milestone", "content": "里程碑达成！…", "createdAt": "…" }
```

`type`: `milestone` 里程碑达成（任务完成自动生成） | `guide` 思路引导（打卡时生成）。

### 2.10 Resource 资源

```json
{ "id": "r1", "title": "…", "category": "物理", "description": "…", "url": "https://…", "tags": ["能源"] }
```

`category` 取值：`物理` | `工程` | `编程` | `艺术` | `生物` | `综合`。

### 2.11 Annotation 教师批注

```json
{ "id": "a1", "projectId": "p2", "userId": "t1", "content": "批注内容", "createdAt": "…" }
```

### 2.12 FocusSession 专注记录

```json
{ "id": "fs1", "userId": "u1", "durationMin": 25, "type": "focus", "createdAt": "…" }
```

`type`: `focus` | `break`。

### 2.13 Archive 科创档案（只读汇总，派生资源）

```json
{
  "project": { /* Project */ },
  "summary": { "taskTotal": 10, "doneTotal": 10, "checkinTotal": 8, "feedbackTotal": 6, "durationDays": 34 },
  "members": [ { "user": { /* User */ }, "taskCount": 4, "doneCount": 4, "checkinCount": 3 } ],
  "tasks": [ /* Task[] */ ],
  "checkins": [ /* Checkin[] */ ],
  "feedbacks": [ /* Feedback[] */ ],
  "mindNodes": [ /* MindNode[] */ ],
  "annotations": [ /* Annotation[] */ ]
}
```

### 2.14 QuizQuestion 闯关题目

```json
{
  "id": "q1", "groupId": null, "createdBy": null,
  "createdAt": null, "updatedAt": null,
  "category": "物理", "difficulty": 1,
  "question": "火星沙尘暴期间，到达地面的阳光最多会减少约多少？",
  "options": ["5% 左右", "20% 左右", "60% 左右", "90% 以上"],
  "answer": 2, "explanation": "火星全球性沙尘暴可遮挡约 60% 的阳光……"
}
```

- `options`：4 个选项（JSON 数组），`answer`：正确选项下标（0 起）
- `category`：`物理` | `工程` | `编程` | `生物` | `综合`；`difficulty`：1~3
- `explanation`：答案解析（正误原因）
- `groupId`：所属用户组，`null` 表示公共题库（种子题）；`createdBy/createdAt/updatedAt` 仅组内题目有值

### 2.15 QuizAttempt 闯关成绩

```json
{ "id": "qa1", "userId": "u1", "score": 80, "total": 100, "createdAt": "…" }
```

### 2.16 Group 用户组

```json
{
  "id": "g1", "name": "火星能源课题小组", "description": "…",
  "quizMode": "fallback", "memberCount": 4, "questionCount": 5,
  "createdAt": "…", "updatedAt": "…"
}
```

- `quizMode` 抽题机制：`group` 只用组内题库 | `fallback` 组内为空回退公共 | `mixed` 组内与公共混合
- `memberCount` / `questionCount` 为统计字段（仅列表/详情返回）

### 2.17 GroupMember 用户组成员

```json
{ "id": "gm1", "groupId": "g1", "userId": "u1", "role": "member", "name": "张三", "username": "student", "joinedAt": "…" }
```

`role`：`teacher`（负责老师，可管理该组）| `member`（组内学生）。一个用户组可有多个负责老师，一个学生可同时属于多个组。

---

## 3. 接口清单

### 3.1 认证

#### `POST /api/sessions` — 登录（公开接口）

请求：

```json
{ "username": "student", "password": "123456" }
```

响应 `201`：

```json
{ "token": "mock.u1.xxxx", "user": { "id": "u1", "username": "student", "name": "张三", "role": "student" } }
```

错误：`401 INVALID_CREDENTIALS`（用户名或密码错误）、`400 VALIDATION_ERROR`。

> 账号角色由后端决定（演示账号：`student/123456` 学生、`teacher/123456` 教师）。

#### `POST /api/users` — 注册（公开接口）

请求：

```json
{ "username": "alice", "password": "123456", "name": "爱丽丝", "role": "student" }
```

- `username`：登录用户名，至少 3 个字符，全局唯一
- `password`：至少 6 个字符
- `name`：真实姓名
- `role`：仅 `student` / `teacher`

响应 `201`（注册成功即登录态，直接返回 token）：

```json
{ "token": "mock.u5.xxxx", "user": { "id": "u5", "username": "alice", "name": "爱丽丝", "role": "student" } }
```

错误：`409 USERNAME_TAKEN`（用户名已被占用）、`400 VALIDATION_ERROR`（参数缺失或格式不合法）。

#### `DELETE /api/sessions/current` — 登出

响应 `204`。后端需使 token 失效。

#### `GET /api/me` — 当前用户信息

响应 `200`：`{ "user": { /* User */ } }`

### 3.2 课题与项目

#### `GET /api/topics` — 课题库列表

响应 `200`：`{ "items": [ /* Topic[] */ ], "total": n, "page": 1, "pageSize": n }`

#### `GET /api/projects` — 当前用户参与的项目

响应 `200`：`{ "items": [ /* Project[] */ ] }`（学生返回参与的；教师返回空数组，教师用 `/api/teacher/projects`）。

#### `POST /api/projects` — 发起项目（组队）

请求：

```json
{ "topicId": "topic1", "name": "火星基地能源方案" }
```

`name` 可省略，默认取课题名。创建后自动：发起人成为组长并加入成员、生成唯一 `inviteCode`、初始化根导图节点。

响应 `201`：`Project`。错误：`400 VALIDATION_ERROR`。

#### `GET /api/projects/:id` — 项目详情

响应 `200`：`Project`。错误：`404 PROJECT_NOT_FOUND`、`403`（非成员学生）。

#### `PATCH /api/projects/:id` — 更新项目

请求（可部分提交）：

```json
{ "name": "新名称" }
```

或填写简介：

```json
{ "description": "探索火星基地的能源自给方案" }
```

或结题：

```json
{ "status": "finished" }
```

简介由组员或教师填写，≤2000 字。结题时后端记录 `finishedAt`，并生成一条里程碑系统反馈。
响应 `200`：`Project`。错误：`400`、`403`。

#### `POST /api/projects/join` — 邀请码加入（组队）

请求：

```json
{ "inviteCode": "P1-7F3A" }
```

响应 `201`：`Project`。错误：
- `409 INVALID_INVITE`（邀请码无效）
- `409 ALREADY_MEMBER`（已加入）
- `409 TEAM_FULL`（已满 4 人）

> 说明：邀请码由后端生成并全局唯一（如 `P1-7F3A`），加入时后端解析其对应项目；若希望更纯粹的 REST 风格，可改为 `POST /api/projects/:id/members`（body 携带 `inviteCode` 校验）。

### 3.3 星云创意看板

#### `GET /api/projects/:id/mind-nodes` — 思维导图节点列表

响应 `200`：`{ "items": [ /* MindNode[] */ ] }`

#### `POST /api/projects/:id/mind-nodes` — 添加节点

请求：

```json
{ "parentId": "n1", "label": "新节点" }
```

`parentId` 为 `null` 表示根节点。响应 `201`：`MindNode`。

#### `PATCH /api/mind-nodes/:id` — 重命名节点

请求：`{ "label": "新名称" }`。响应 `200`：`MindNode`。

#### `DELETE /api/mind-nodes/:id` — 删除节点（含子树）

响应 `204`。

#### `GET /api/projects/:id/notes` — 便签列表

响应 `200`：`{ "items": [ /* StickyNote[] */ ] }`

#### `POST /api/projects/:id/notes` — 创建便签

请求：

```json
{ "content": "灵感…", "color": "#fde68a", "x": 30, "y": 40 }
```

响应 `201`：`StickyNote`。

#### `PATCH /api/notes/:id` — 更新便签

请求（可部分提交）：`{ "content"?: string, "color"?: string, "x"?: number, "y"?: number }`
响应 `200`：`StickyNote`。

#### `DELETE /api/notes/:id` — 删除便签

响应 `204`。

> 实时协作说明：当前前端每 5 秒轮询上述列表接口模拟多人同步。建议后端升级为 WebSocket（`ws://…/projects/:id` 推送变更事件），轮询接口契约保持不变。

### 3.4 PBL 里程碑任务

#### `GET /api/projects/:id/tasks` — 任务列表

查询参数：`?status=todo`（按状态过滤）、`?assigneeId=u1`（按认领人过滤）。
响应 `200`：`{ "items": [ /* Task[] */ ] }`

#### `POST /api/projects/:id/tasks` — 创建任务

请求：

```json
{ "title": "任务标题", "description": "描述", "dueDate": "2026-08-20T00:00:00.000Z" }
```

`dueDate` 可省略（`null`）。创建时自动追加 `create` 动态。
响应 `201`：`Task`。

#### `PATCH /api/tasks/:id` — 更新任务（编辑 / 认领 / 状态流转）

请求（可部分提交）：

```json
{ "title": "新标题", "description": "…", "dueDate": "…" }
```

认领/取消认领：

```json
{ "assigneeId": "u1" }
```

`assigneeId` 只能设为当前登录用户自己或 `null`（取消），否则 `403`。

状态流转：

```json
{ "status": "done" }
```

**后端约定**：`status` 由 `todo → doing → review → done` 方向推进（允许直接跳转），每次变更追加 `status` 动态；当变为 `done` 时，自动执行：
1. 追加 `status` 动态；
2. 生成一条打卡记录（内容格式：`完成里程碑任务「任务名」`）；
3. 生成一条 `milestone` 类型系统反馈（从反馈语料中选取）。

响应 `200`：`Task`。错误：`400`（非法状态）、`403`、`404 TASK_NOT_FOUND`。

#### `DELETE /api/tasks/:id` — 删除任务

响应 `204`（删除时追加 `delete` 动态）。

#### `GET /api/projects/:id/task-logs` — 任务动态（版本记录）

按时间倒序。响应 `200`：`{ "items": [ /* TaskLog[] */ ] }`

### 3.5 打卡与动态反馈

#### `GET /api/projects/:id/checkins` — 打卡记录

按时间倒序。响应 `200`：`{ "items": [ /* Checkin[] */ ] }`

#### `POST /api/projects/:id/checkins` — 打卡

请求：`{ "content": "今日完成内容" }`
响应 `201`：`Checkin`。**后端约定**：打卡成功同时生成一条 `guide` 类型系统反馈。

#### `GET /api/projects/:id/feedbacks` — 系统反馈列表

按时间倒序。响应 `200`：`{ "items": [ /* Feedback[] */ ] }`

### 3.6 跨学科资源导航

#### `GET /api/resources` — 资源列表

查询参数：`?category=物理`、`?keyword=AI`（匹配标题/描述/标签，大小写不敏感）。
响应 `200`：`{ "items": [ /* Resource[] */ ] }`

### 3.7 沉浸式专注模式

#### `POST /api/focus-sessions` — 上报番茄钟完成

请求：

```json
{ "durationMin": 25, "type": "focus" }
```

响应 `201`：`FocusSession`。错误：`400 VALIDATION_ERROR`（时长为非法正数）。

#### `GET /api/focus-sessions` — 我的专注记录

按时间倒序。响应 `200`：`{ "items": [ /* FocusSession[] */ ] }`

#### `GET /api/focus/stats?days=7` — 专注统计

按当前登录用户统计 `type=focus` 的记录。响应 `200`：

```json
{
  "today": { "count": 3, "minutes": 75 },
  "week": [
    { "date": "2026-08-05", "count": 2, "minutes": 50 },
    { "date": "2026-08-06", "count": 4, "minutes": 100 }
  ]
}
```

`week` 按日期升序，长度 = `days`（默认 7，最大 30），无记录日期补 0。

### 3.8 教师端

#### `GET /api/teacher/projects` — 全部团队总览（仅教师）

按最近更新倒序。响应 `200`：`{ "items": [ /* Project[] */ ] }`。错误：`403`。

#### `GET /api/projects/:id/annotations` — 批注列表

学生（成员）只读可访问。响应 `200`：`{ "items": [ /* Annotation[] */ ] }`

#### `POST /api/projects/:id/annotations` — 添加批注（仅教师）

请求：`{ "content": "批注内容" }`
响应 `201`：`Annotation`。错误：`403`（学生）、`400`。

### 3.9 成果归档

#### `GET /api/projects/:id/archive` — 科创档案（派生资源）

响应 `200`：`Archive`（见 2.13）。错误：`409 PROJECT_NOT_FINISHED`（未结题）。

### 3.10 闯关（知识问答）

#### `GET /api/quiz/questions?group=<id>&count=10` — 按题库抽题

- `count`：抽取数量（默认 10，上限 20）
- `group`：用户组 id（可选）。省略时使用**公共题库**；传入时必须是自己所在的组（否则 `403`），并按该组的 `quizMode` 抽题：
  - `group`：只用组内题库（组内为空则返回空）
  - `fallback`：组内为空时回退公共题库
  - `mixed`：组内与公共题库合并后抽样

响应 `200`：

```json
{ "items": [ /* QuizQuestion[] */ ], "total": 21, "group": { "id": "g1", "name": "火星能源课题小组" } }
```

`total` 为该题库（合并后）全部题数；`group` 为 `null` 时表示公共题库。

#### `POST /api/quiz/attempts` — 记录一局成绩

请求：

```json
{ "score": 80, "total": 100 }
```

- `score` / `total`：整数，`0 ≤ score ≤ total`

响应 `201`：`{ "attempt": QuizAttempt, "best": { score, total, createdAt } | null }`（`best` 为该用户历史最佳）。

错误：`400 VALIDATION_ERROR`。

#### `GET /api/quiz/stats` — 我的闯关统计

响应 `200`：

```json
{
  "attempts": 5,
  "best": { "score": 90, "total": 100, "createdAt": "…" },
  "last": { "score": 80, "total": 100, "createdAt": "…" }
}
```

`best` / `last` 无记录时为 `null`。

### 3.11 用户组与题库管理

权限模型：**建组/搜索用户** = 任意教师；**管理（改名、删组、成员、出题）** = 组内的负责老师（`role=teacher`）；学生仅可通过 3.10 玩自己所在组的题库。

#### `GET /api/groups` — 我负责管理的用户组（仅教师）

响应 `200`：`{ "items": [ /* Group[]（含 memberCount/questionCount） */ ] }`。错误：`403`。

#### `GET /api/groups/mine` — 我所在的用户组（学生）

响应 `200`：`{ "items": [ { "id": "g1", "name": "火星能源课题小组" } ] }`

#### `POST /api/groups` — 新建用户组（仅教师）

请求：`{ "name": "…", "description": "…", "quizMode": "fallback" }`（`quizMode` 默认 `group`）。
响应 `201`：`Group`。创建者自动成为该组负责老师。错误：`403`、`400`。

#### `PATCH /api/groups/:id` — 修改组（名称/描述/抽题机制，仅负责老师）

响应 `200`：`Group`。错误：`403`、`400`、`404`。

#### `DELETE /api/groups/:id` — 删除组（仅负责老师）

连带删除组内成员关系与组内题目。响应 `204`。

#### `GET /api/groups/:id/members` — 成员列表（仅负责老师）

响应 `200`：`{ "items": [ /* GroupMember[] */ ] }`（负责老师在前）。

#### `POST /api/groups/:id/members` — 添加成员（仅负责老师）

请求：`{ "userId": "u4", "role": "member" }`（`role`：`teacher` 负责老师 | `member` 学生）。
响应 `201`：`GroupMember`。错误：`409 ALREADY_MEMBER`、`404`（用户不存在）、`403`、`400`。

#### `DELETE /api/groups/:id/members/:userId` — 移除成员（仅负责老师）

组内至少保留一名负责老师。响应 `204`。错误：`400`（最后一个老师）、`404`、`403`。

#### `GET /api/groups/:id/questions` — 组内题库（仅负责老师）

响应 `200`：`{ "items": [ /* QuizQuestion[] */ ] }`（按更新时间倒序）。

#### `POST /api/groups/:id/questions` — 出题（仅负责老师）

请求：`{ "question": "…", "category": "物理", "difficulty": 1, "options": ["…", "…", "…", "…"], "answer": 2, "explanation": "…" }`
响应 `201`：`QuizQuestion`（含 `groupId`/`createdBy` 等）。错误：`400`（校验见 §2.14）、`403`。

#### `PATCH /api/groups/:id/questions/:qid` — 改题（仅负责老师）

请求体同出题（全量）。响应 `200`：`QuizQuestion`。

#### `DELETE /api/groups/:id/questions/:qid` — 删题（仅负责老师）

响应 `204`。

#### `GET /api/users?keyword=` — 搜索用户（仅教师，添加成员用）

按用户名/姓名模糊匹配（大小写不敏感），最多 20 条。响应 `200`：`{ "items": [ { "id", "username", "name", "role" } ] }`。错误：`403`。

---

## 4. 反馈语料（系统反馈自动生成用）

后端可从以下语料中按序或随机选取：

```
里程碑达成！你们把一个大目标拆成了可执行的小步，这正是工程师思维。
干得漂亮！这一步的完成意味着整个项目又向前推进了一截。
进度同步得很好，接下来可以尝试把成果整理成可视化材料。
团队协作满分！记得在打卡里记录下这次尝试中的收获与踩坑。
这个节点很关键，完成后建议做一次小复盘，把经验沉淀到档案里。
思路清晰，继续推进！遇到瓶颈时回到星云看板看看最初的想法。
```

---

## 5. 后端实现建议（Flask / Django）

1. 表结构可按 2.x 数据模型一一对应（User / Topic / Project / Member / MindNode / StickyNote / Task / TaskLog / Checkin / Feedback / Resource / Annotation / FocusSession）。
2. 鉴权建议：登录签发 token（JWT 或服务端 session），中间件校验 `Authorization: Bearer`，解析出当前用户后注入视图。
3. 权限校验集中在两处：成员校验（`memberOf(projectId, userId)`）与角色校验（教师接口）。
4. 任务状态变更的「打卡 + 反馈 + 动态」三连写在同一个事务中，保证一致性（对应申报书示例代码 `trigger_milestone_feedback`）。
5. 对接前端：前端 `src/api/request.ts` 中 `BASE_URL = '/api'`；开发环境在 `vite.config.ts` 配置代理到后端地址，并**移除 `mockPlugin()`**（`mock/` 目录仅为前端开发模拟，不作为生产后端）。
