# InnoArk「智创方舟」RESTful API 文档

> 智能跨学科项目式学习协同平台 — 后端接口契约文档
> 当前前端通过 Vite 代理连接 ArkEngine。`mock/` 是历史开发资料，不支持新的答题、验收和过程评价契约，不能作为生产后端。

## 1. 通用约定

2026-09-12 更新：任务新增 `statusChangedAt`（状态进入时间），用于等待验收预警；普通内容修改及相同状态重试不会重置该时间。重复提交相同字段不会追加动态或修改 `updatedAt`。任务标题 1~200 字符，描述不超过 5000 字符；日期必须为 `null`、空字符串、有效 `YYYY-MM-DD`（UTC 当天结束）或带时区 ISO 时间。前端选取日期时提交本地当天结束时间。校验失败返回 `400 VALIDATION_ERROR` 且不写入部分字段。登录/注册拒绝非文本及超长用户名、密码或姓名。

### 比赛版本扩展

`Project` 响应新增 `permissions: { edit, review, finish, annotate }`，各字段为当前调用者的能力。已结题项目 edit/review/finish 为 false；读取权限不代表写入权限。负责教师指项目所属组的管理教师，公共项目可由教师管理；管理角色按现有全局权限管理。

`GET /api/projects/:id/assessment` 使用项目读取权限，响应为：

```ts
{
  version: 'process-v1', asOf: string, status: 'active' | 'finished',
  summary: { total: number, done: number, overdue: number, review: number,
    unassigned: number, completionRate: number | null, activeMembers: number, memberCount: number },
  members: Array<{ user: User, assigned: number, completed: number,
    completionShare: number | null, activeDays: number, lastActiveAt: string | null }>,
  risks: Array<{ code: string, level: 'warning' | 'info', title: string,
    evidence: string, action: string, taskIds: string[], userIds: string[],
    responses: Array<{ id: string, projectId: string, riskCode: string, userId: string,
      content: string, createdAt: string, userName: string | null }> }>,
  tasks: Array<{ id: string, title: string }>,
  trend: {
    baseDate: string,
    metrics: Record<string, { now: number, before: number, delta: number }>,
    risksAdded: string[], risksResolved: string[]
  } | null
}
```

`responses` 是成员对该条预警的补充说明（见 `POST /api/projects/:id/risk-responses`）。说明记录不会因预警消失而删除，但它只在对应预警生效时随评价返回；已结题项目的评价来自结题快照，因此包含结题时刻已有的说明。

`trend` 是与最近一份历史快照的对比。进行中的项目在每次读取时会把当天的评价写入快照（每天至多一条，已存在则不覆盖），因此趋势反映的是"相对上一天"的变化，而不是同一天内反复刷新的抖动。**没有历史快照时为 `null`**——不编造趋势；已结题项目的评价来自结题快照，趋势字段为 `null`。

指标与预警阈值见 [过程评价规则](../../IMPLEMENTATION.md)。已结题项目如有快照返回其中的评价，无快照的旧项目按当前保留记录派生。

### 1.1 基础信息

| 项目 | 约定 |
|---|---|
| Base URL | `/api`（开发环境建议配置 Vite 代理或同域部署） |
| 数据格式 | `Content-Type: application/json; charset=utf-8` |
| 字段风格 | JSON camelCase，时间统一为 ISO 8601 字符串（UTC） |
| 页面托管 | 后端在 `InnoArk-main/dist` 存在时一并提供前端页面（可用 `ARK_FRONTEND_DIST` 覆盖）；`/api/*` 以外的路径不参与接口契约，未知接口路径仍返回 JSON `404 NOT_FOUND` |
| 接口风格 | RESTful：名词复数资源 + HTTP 方法表达操作 |

### 1.2 鉴权

- 登录成功返回 `token`，后续请求在请求头携带：`Authorization: Bearer <token>`
- 除 `POST /api/sessions`、`POST /api/users` 外，所有接口均需鉴权；未携带或无效返回 `401`
- token 有有效期（默认 14 天，`SESSION_TTL_DAYS`），过期即 `401`；登出删除该 token；管理员重置口令会吊销该用户已签发的全部会话

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

角色层级：`superadmin`（超级管理员）> `admin`（管理员）> `schooladmin`（校管理员）> `teacher`（教师）> `student`（学生）

| 资源 | 学生（项目成员） | 教师 | 校管理员 | 管理员 | 超级管理员 |
|---|---|---|---|---|---|
| 项目协作内容（导图/便签/任务/打卡） | 读写 | 只读 | 只读 | 只读 | 只读 |
| 教师批注 | 只读 | 读写 | 读写 | 读写 | 读写 |
| 教师总览 `/api/teacher/*` | 禁止（403） | 读写（自己管理的组+公共） | 读写（全部） | 读写（全部） | 读写（全部） |
| 用户组与题库管理 `/api/groups/*` | 仅玩本组题库 | 管理自己负责的组 | 管理任意组 | 管理任意组 | 管理任意组 |
| 用户管理 `/api/admin/users` | 禁止 | 禁止 | 管理 老师/学生 | 管理 校管理员/老师/学生 | 管理 管理员/校管理员/老师/学生 |
| 项目结题 | 可发起 | — | — | — | — |

规则：管理角色只能管理**低于自己层级**的账号（不能改/删自己、同级与更高层）；管理员账号只能由超级管理员创建/调整；校管理员及以上账号不能自行注册，只能由上级创建。

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
  "groupId": "g1",
  "name": "火星基地能源方案",
  "status": "active",
  "inviteCode": "P1-7F3A",
  "leaderId": "u1",
  "description": "探索火星基地的能源自给方案",
  "createdAt": "2026-07-30T02:00:00.000Z",
  "updatedAt": "2026-08-11T01:00:00.000Z",
  "finishedAt": null,
  "topic": { "id": "topic1", "title": "…", "subjects": ["物理"] },
  "group": { "id": "g1", "name": "火星能源课题小组" },
  "members": [ /* User[] */ ],
  "progress": { "done": 3, "total": 6 }
}
```

`status`: `active` 进行中 | `finished` 已结题。`description` 项目简介（≤2000 字，组员与教师可编辑）。`progress` 由后端按任务状态实时计算。`groupId`：所属用户组（`null` 为公共项目），发起项目时自动归入创建者所在组（未分组则为公共）；**组间隔离**：学生仅可访问/加入 自己加入的项目、公共项目、自己所在组的项目。

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
  "updatedAt": "…",
  "statusChangedAt": "…",
  "sourceAnnotationId": null,
  "criteria": "[{\"text\":\"有量化数据\",\"done\":false}]",
  "verifiedBy": null,
  "verifiedAt": null,
  "verifiedByName": null,
  "focusMinutes": 0,
  "peerReviewCount": 0
}
```

`focusMinutes` 为关联到该任务的专注分钟数（番茄钟记录的真实时长），`peerReviewCount` 为收到的同伴互评条数；两者都是派生字段，不落库在 tasks 表里。

`status`: `todo` 待认领 | `doing` 进行中 | `review` 待验收 | `done` 已完成。
`assigneeId` 为 `null` 表示未认领。`sourceAnnotationId` 非空表示该任务由教师批注派生（见 `POST /api/annotations/:id/tasks`）。

状态机：`todo → doing → review → done`。学生可推进前三步，并可从 `review` 撤回 `doing`；只有负责教师能做 `review → done`（验收）与 `review → doing`（退回）。
**待验收期间任务内容冻结**：`title` / `description` / `dueDate` 在 `review` 状态下拒绝修改（`409 TASK_IN_REVIEW`），需要修改必须先撤回，以免验收对象与提交物不一致。

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
{
  "id": "a1", "projectId": "p2", "userId": "t1", "content": "批注内容", "createdAt": "…",
  "userName": "王老师",
  "linkedTasks": [{ "id": "t9", "title": "补充量化结论", "status": "todo" }]
}
```

`userName` 由后端 join users 给出，前端不应自行推断作者。`linkedTasks` 是由该批注派生出的任务（见 `POST /api/annotations/:id/tasks`），用于展示「批注 → 任务 → 验收 → 档案」的闭环。

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
  "quizMode": "fallback", "inviteCode": "G1-KM3X",
  "memberCount": 4, "questionCount": 5, "projectCount": 2,
  "createdAt": "…", "updatedAt": "…"
}
```

- `quizMode` 抽题机制：`group` 只用组内题库 | `fallback` 组内为空回退公共 | `mixed` 组内与公共混合
- `inviteCode`：学生凭码直接入组（`G` 开头）
- `memberCount` / `questionCount` / `projectCount` 为统计字段（列表/详情返回）

### 2.17 GroupMember 用户组成员

```json
{ "id": "gm1", "groupId": "g1", "userId": "u1", "role": "member", "name": "张三", "username": "student", "joinedAt": "…" }
```

`role`：`teacher`（负责老师，可管理该组）| `member`（组内学生）。一个用户组可有多个负责老师，一个学生可同时属于多个组。

### 2.18 GroupInvite 入组邀请

```json
{ "id": "gi1", "groupId": "g1", "userId": "u4", "inviterId": "t1", "status": "pending", "createdAt": "…", "respondedAt": null }
```

- `status`：`pending` 待处理 | `accepted` 已通过 | `declined` 已拒绝
- 学生端列表附加 `groupName`（组名）与 `inviterName`（邀请老师）；老师端列表附加 `name`/`username`（被邀请人）

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
- `role`：只能为 `student`；教师账号由管理员在后台创建

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

#### `GET /api/projects` — 我可见的项目

学生返回：我加入的 + 公共项目 + 我所在组的项目（**组间隔离**，跨组项目不可见）；教师返回空数组（教师用 `/api/teacher/projects`）。

响应 `200`：`{ "items": [ /* Project[] */ ] }`。

#### `POST /api/projects` — 发起项目（组队）

请求：

```json
{ "topicId": "topic1", "name": "火星基地能源方案" }
```

`name` 可省略，默认取课题名。创建后自动：发起人成为组长并加入成员、生成唯一 `inviteCode`、初始化根导图节点、**自动归入发起人所在组**（未分组则为公共项目）。

响应 `201`：`Project`。错误：`400 VALIDATION_ERROR`。

#### `GET /api/projects/:id` — 项目详情

响应 `200`：`Project`。错误：`404 PROJECT_NOT_FOUND`、`403`（非成员且非同组学生）。

#### `POST /api/projects/:id/join` — 一键加入（仅学生）

同组成员或公共项目可直接加入（无需邀请码）。错误：`403`（跨组或非学生）、`409 ALREADY_MEMBER`、`409 TEAM_FULL`（满 4 人）。响应 `201`：`Project`。

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

简介由组员或负责教师填写，≤2000 字。结题仅限组长或负责教师/管理角色，且至少有一项任务并全部通过教师验收；不满足返回 `409 TASKS_INCOMPLETE`。重复结题返回 `409 PROJECT_FINISHED`。
结题时记录 `finishedAt` 和操作者，并保存包含成员、任务、打卡、教师批注及过程评价的不可变档案快照。结题后的任务、看板、打卡、简介和加入操作均返回 `409 PROJECT_FINISHED`。后续教师批注可在批注列表查看，不会改写已保存档案。升级前已结题项目没有历史快照，继续使用派生档案。
响应 `200`：`Project`。错误：`400`、`403`。

#### `POST /api/projects/join` — 邀请码加入（组队，仅学生）

请求：

```json
{ "inviteCode": "P1-7F3A" }
```

响应 `201`：`Project`。错误：
- `409 INVALID_INVITE`（邀请码无效）
- `409 ALREADY_MEMBER`（已加入）
- `409 TEAM_FULL`（已满 4 人）
- `403`（跨组项目：仅本组成员可加入；非学生）

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

可提交字段：`title`、`description`、`dueDate`、`assigneeId`、`status`、`criteria`。
`criteria` 为验收标准清单，接受字符串数组或 `{ text, done }` 对象数组（最多 10 条、单条 ≤200 字）；`done` 缺失按未达标处理。
教师验收时可在同一请求里带 `criteria`（带 `done` 标记）提交逐条核对结果；验收通过会记录 `verifiedBy` / `verifiedAt`，动态里附上「验收标准 x/y 项达标」。

请求（可部分提交）：

```json
{ "title": "新标题", "description": "…", "dueDate": "…" }
```

认领/取消认领：

```json
{ "assigneeId": "u1" }
```

仅 `todo` 状态可认领，`assigneeId` 只能设为当前登录用户自己或 `null`（取消）；他人已认领任务不能抢领、取消或编辑，返回 `403`。

状态流转：

```json
{ "status": "done" }
```

**后端约定**：必须先认领。认领人可执行 `todo → doing → review`；负责教师可执行 `review → done` 或 `review → doing`（退回）。跳跃状态返回 `409 INVALID_TRANSITION`；未认领返回 `409 ASSIGNEE_REQUIRED`。已验收任务只读，教师重复提交 `done` 幂等，不重复生成记录。当首次变为 `done` 时，自动执行：
1. 追加 `status` 动态；
2. 生成一条打卡记录（内容格式：`完成里程碑任务「任务名」`）；
3. 生成一条 `milestone` 类型系统反馈（从反馈语料中选取）。

响应 `200`：`Task`。错误：`400`（非法状态）、`403`、`404 TASK_NOT_FOUND`。

#### `POST /api/projects/:id/tasks/batch-verify` — 批量验收（仅负责教师）

请求：`{ "taskIds": ["t1", "t2"] }`（最多 50 项）。逐项返回结果，而不是整体失败：某一项状态已变（学生撤回、他人已验收）时只跳过该项，其余仍然生效。

响应 `200`：

```json
{ "verified": 2,
  "results": [ { "id": "t1", "title": "…", "status": "verified" },
               { "id": "t3", "title": "…", "status": "skipped", "reason": "仅待验收任务可批量验收" },
               { "id": "t9", "status": "not_found" } ] }
```

错误：`403`（非负责教师）、`400`（未提供任务或超过 50 项）、`409 PROJECT_FINISHED`。

#### `GET /api/projects/:id/revision` — 数据修订号

响应 `200`：`{ "revision": 12 }`。过程记录每有写入即递增。客户端轮询时先比对这个数字，未变就不必重新拉取整个看板（权限与项目读取一致）。

#### `GET /api/projects/:id/stream` — 变更推送（SSE）

`text/event-stream`。修订号变化时推送一个事件，客户端据此重新拉取；只推"数据变了"这个信号，不推数据本身。

```
event: revision
data: {"revision": 13}

: keep-alive
```

单条连接有最长存活时间（默认 240 秒，`STREAM_MAX_SECONDS` 可调），到点主动发出 `event: reconnect` 并结束，由客户端自行重连，避免长期占用线程。客户端不支持或连接失败时应退回轮询。

#### `DELETE /api/tasks/:id` — 删除任务

仅未开始的 `todo` 任务可删除，不能删除他人认领的任务。响应 `204`（删除时追加 `delete` 动态）。

#### `GET /api/projects/:id/task-logs` — 任务动态（版本记录）

按时间倒序。响应 `200`：`{ "items": [ /* TaskLog[] */ ] }`

### 3.5 打卡与动态反馈

#### `GET /api/projects/:id/checkins` — 打卡记录

按时间倒序。响应 `200`：`{ "items": [ /* Checkin[] */ ] }`

#### `POST /api/projects/:id/checkins` — 打卡

请求可选带 `clientId`（客户端生成，≤64 字符）：离线补交时用它做幂等键，同一 `clientId` 只会入库一次，断网重试不会产生重复打卡（重复提交返回 `200` 与已入库的那条，首次为 `201`）。未带 `clientId` 时行为不变。

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

请求可选带 `taskId`：把这次专注记到具体任务上，成为该任务的投入证据（只能关联自己参与的项目中的任务，否则 `400`）。休息时段不计入任务的 `focusMinutes`。

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

自然日按 `tzOffset` 划分：该参数为分钟数、东为正（如北京 `480`），默认 `0`（UTC），越界值夹紧到 ±14 小时。前端应传 `-new Date().getTimezoneOffset()`，否则「今日」会按 UTC 自然日计算，在东八区要到本地早上 8 点才翻页。

### 3.8 教师端

#### `GET /api/teacher/projects?group=<id>` — 团队总览（仅教师）

默认返回：我负责管理的组的项目 + 公共项目；`?group=<id>` 只看该组的项目（非管理的组返回 `403`）。按最近更新倒序。响应 `200`：`{ "items": [ /* Project[] */ ] }`。错误：`403`。

#### `GET /api/projects/:id/annotations` — 批注列表

学生（成员）只读可访问。响应 `200`：`{ "items": [ /* Annotation[] */ ] }`

#### `POST /api/projects/:id/annotations` — 添加批注（仅教师）

请求：`{ "content": "批注内容" }`
响应 `201`：`Annotation`。错误：`403`（学生）、`400`。

#### `POST /api/annotations/:id/tasks` — 把批注转为任务（仅负责教师）

请求：

```json
{ "title": "补充量化结论", "assigneeId": "u2", "dueDate": "2026-09-20" }
```

- `title` 省略时取批注内容（截断到 200 字）；`description` 省略时记为「来自教师批注：…」
- `assigneeId` 可选，必须**是本项目成员**，留空则生成待认领任务由学生认领
- `dueDate` 可选，格式同任务创建

响应 `201`：`Task`（`sourceAnnotationId` 指向来源批注，`status` 为 `todo`）。错误：`403`（学生或非负责教师）、`404`（批注不存在）、`400`、`409 PROJECT_FINISHED`。

生成的任务会写入一条任务动态「由教师批注创建任务」，并且该批注在 `GET /api/projects/:id/annotations` 与结题档案中通过 `linkedTasks` 回指，形成「批注 → 任务 → 验收 → 档案」的可追溯链路。

### 3.9 成果归档

#### `GET /api/projects/:id/archive` — 科创档案（派生资源）

响应 `200`：`Archive`（见 2.13）。错误：`409 PROJECT_NOT_FINISHED`（未结题）。

#### `POST /api/projects/:id/risk-responses` — 对过程评价预警补充说明（成员）

请求：

```json
{ "riskCode": "LOW_ACTIVITY", "content": "线下已完成，证据稍后补录",
  "evidenceType": "checkin", "evidenceId": "c123" }
```

`evidenceType` / `evidenceId` 可选，用于引用**本项目内**的一条打卡（`checkin`）或一项任务（`task`）作为证据；引用不存在或不属于本项目的对象返回 `400`。证据被删除后说明本身仍保留，只是 `evidenceLabel` 变为 `null`。

- `riskCode` 必须是评价规则中的预警编号之一：`NO_TASKS` / `OVERDUE` / `UNASSIGNED` / `REVIEW_WAIT` / `LOW_ACTIVITY` / `CONCENTRATED`
- `content` 必填，1~500 字
- 仅项目成员（学生）可提交；教师不是项目成员，走批注通道

响应 `201`：`{ id, projectId, riskCode, userId, content, createdAt, userName, evidenceType, evidenceId, evidenceLabel }`。错误：`400`（编号无效或内容为空）、`403`（非成员）、`409 PROJECT_FINISHED`（项目已结题，过程记录只读）。

提交后的说明会出现在 `GET /api/projects/:id/assessment` 对应预警的 `responses` 字段中，用于把「与成员核实线下工作」这类建议变成可回应的过程记录。

### 3.10 闯关（知识问答）

#### `GET /api/quiz/questions?group=<id>&count=10` — 按题库抽题

- `count`：抽取数量（默认 10，上限 20）
- `group`：用户组 id（可选）。省略时使用**公共题库**；传入时必须是自己所在的组（否则 `403`），并按该组的 `quizMode` 抽题：
  - `group`：只用组内题库（组内为空则返回空）
  - `fallback`：组内为空时回退公共题库
  - `mixed`：组内与公共题库合并后抽样

响应 `200`：

```json
{ "roundId": "qrabc123", "items": [ /* 不含 answer / explanation 的题目 */ ], "total": 21, "group": { "id": "g1", "name": "火星能源课题小组" } }
```

`total` 为该题库（合并后）全部题数；`group` 为 `null` 时表示公共题库。空题库返回 `roundId: null`。本局题目与答案由服务端保存快照，有效期 2 小时，仅发起人可答题。

#### `POST /api/quiz/rounds/:roundId/answers` — 提交单题答案

请求：`{ "questionId": "q1", "choice": 2 }`。题目接口不会返回正确答案，答案由服务端校验并返回解析。

响应：`{ "answer": 2, "explanation": "...", "correct": true, "score": 10 }`。
相同答案重试返回相同结果，更改已提交答案返回 `409 ANSWER_LOCKED`。题目必须属于本局，选项必须为合法整数。过期返回 `409 ROUND_EXPIRED`；访问他人局返回 `404 ROUND_NOT_FOUND`。

#### `POST /api/quiz/attempts` — 完成本局并记录成绩

请求：

```json
{ "roundId": "qrabc123" }
```

- 服务端根据本局答题记录计算 `score` / `total`，客户端不能直接提交分数

响应 `201`：`{ "attempt": QuizAttempt, "best": { score, total, createdAt } | null }`（每题 10 分，`best` 按正确率、题数排序）。必须全部答完，否则 `409 ROUND_INCOMPLETE`。重复提交本局返回 `200` 和原记录，不累计次数。

错误：`400 VALIDATION_ERROR`。

#### `GET /api/quiz/stats` — 我的闯关统计

响应 `200`：

```json
{
  "attempts": 5,
  "best": { "score": 90, "total": 100, "createdAt": "…" },
  "last": { "score": 80, "total": 100, "createdAt": "…" },
  "wrong": { "open": 3, "due": 1 }
}
```

`best` / `last` 无记录时为 `null`。

#### `GET /api/quiz/wrong-answers?due=1` — 我的错题本

`due=1` 时只返回今天该复习的（`resolvedAt` 为空且 `nextReviewAt` 已到）。响应 `200`：

```json
{
  "items": [
    { "id": "wa…", "questionId": "q11", "choice": 2, "stage": 0,
      "nextReviewAt": "2026-09-15T…Z", "createdAt": "…", "resolvedAt": null,
      "category": "编程", "difficulty": 2, "question": "…", "options": ["…"],
      "stageLabel": "第 1/3 轮" }
  ],
  "total": 3
}
```

**不含 `answer` 与 `explanation`**，与抽题接口一致：答案只在提交复习结果时返回。

#### `POST /api/quiz/wrong-answers/:questionId/review` — 复习一道错题

请求：`{ "choice": 0 }`。答对推进一轮（间隔 3 / 7 / 14 天），走完三轮即标记已掌握；答错退回第一轮并更新记录。响应 `200`：

```json
{ "correct": true, "answer": 1, "explanation": "…", "stage": 1,
  "resolved": false, "nextReviewAt": "2026-09-19T…Z", "totalStages": 3 }
```

错误：`404 NOT_FOUND`（不在错题本 / 题目已不存在）、`400 VALIDATION_ERROR`（选项非法）。

### 3.11 用户组与题库管理

权限模型：**建组/搜索用户/邀请码入组** = 相应角色；**管理（改名、删组、成员、出题、邀请）** = 组内的负责老师（`role=teacher`）；学生可通过邀请码直接入组，或收到老师邀请后在首页确认。

#### `GET /api/groups` — 我负责管理的用户组（仅教师）

响应 `200`：`{ "items": [ /* Group[]（含 memberCount/questionCount/projectCount/inviteCode） */ ] }`。错误：`403`。

#### `GET /api/groups/mine` — 我所在的用户组（学生，多组并列）

响应 `200`：`{ "items": [ { "id": "g1", "name": "火星能源课题小组", "quizMode": "fallback" } ] }`

#### `POST /api/groups/join` — 邀请码加入分组（仅学生）

请求：`{ "inviteCode": "G1-KM3X" }`（大小写不敏感）。
响应 `201`：`Group`（直接入组为 `member`）。错误：`403`（非学生）、`409 INVALID_INVITE`、`409 ALREADY_MEMBER`。

#### `POST /api/groups` — 新建用户组（仅教师）

请求：`{ "name": "…", "description": "…", "quizMode": "fallback" }`（`quizMode` 默认 `group`）。
响应 `201`：`Group`。创建者自动成为该组负责老师。错误：`403`、`400`。

#### `PATCH /api/groups/:id` — 修改组（名称/描述/抽题机制/归属学校，仅负责老师）

响应 `200`：`Group`。错误：`403`、`400`、`404`。

#### `DELETE /api/groups/:id` — 删除组（仅负责老师）

连带删除组内成员关系与组内题目。响应 `204`。

#### `GET /api/groups/:id/members` — 成员列表（仅负责老师）

响应 `200`：`{ "items": [ /* GroupMember[] */ ] }`（负责老师在前）。

#### `POST /api/groups/:id/members` — 添加负责老师（仅负责老师）

请求：`{ "userId": "t2", "role": "teacher" }`。**添加学生请改用发送邀请（见下）**。
响应 `201`：`GroupMember`。错误：`409 ALREADY_MEMBER`、`404`（用户不存在）、`403`、`400`。

#### `DELETE /api/groups/:id/members/:userId` — 移除成员（仅负责老师）

组内至少保留一名负责老师。响应 `204`。错误：`400`（最后一个老师）、`404`、`403`。

移除时会**同步收回该成员在本组项目中的成员身份**（删除对应的 `members` 记录），否则被移出的人仍能读写项目，与「仅本组成员可访问该项目」的隔离规则相矛盾。项目组长身份不变；该成员若需继续参与，可重新入组并再次加入项目。

#### `GET /api/groups/:id/questions` — 组内题库（仅负责老师）

响应 `200`：`{ "items": [ /* QuizQuestion[] */ ] }`（按更新时间倒序）。

#### `POST /api/groups/:id/questions` — 出题（仅负责老师）

请求：`{ "question": "…", "category": "物理", "difficulty": 1, "options": ["…", "…", "…", "…"], "answer": 2, "explanation": "…" }`
响应 `201`：`QuizQuestion`（含 `groupId`/`createdBy` 等）。错误：`400`（校验见 §2.14）、`403`。

#### `PATCH /api/groups/:id/questions/:qid` — 改题（仅负责老师）

请求体同出题（全量）。响应 `200`：`QuizQuestion`。

#### `DELETE /api/groups/:id/questions/:qid` — 删题（仅负责老师）

响应 `204`。

#### `POST /api/groups/:id/invites` — 给学生发送入组邀请（仅负责老师）

请求：`{ "userId": "u4" }`（目标必须是学生）。
响应 `201`：`GroupInvite`。错误：`409 ALREADY_INVITED`（已有待处理邀请）、`409 ALREADY_MEMBER`、`400`（目标为老师）、`403`、`404`。

#### `GET /api/groups/:id/invites` — 组内待处理邀请（仅负责老师）

响应 `200`：`{ "items": [ /* GroupInvite[]（含被邀请人 name/username） */ ] }`。

#### `DELETE /api/groups/:id/invites/:inviteId` — 撤回邀请（仅负责老师）

仅可撤回 `pending` 状态的邀请。响应 `204`。错误：`404`、`403`。

#### `GET /api/groups/invites` — 我的待处理邀请（学生）

响应 `200`：`{ "items": [ { "id", "groupId", "groupName", "inviterName", "createdAt" } ] }`

#### `POST /api/groups/invites/:inviteId/respond` — 通过/拒绝邀请（学生）

请求：`{ "accept": true }`。通过后自动入组（`member`）。响应 `200`：`{ "status": "accepted" | "declined" }`。错误：`404`（非本人或已处理）、`400`。

#### `GET /api/users?keyword=` — 搜索用户（仅教师，添加成员/发邀请用）

按用户名/姓名模糊匹配（大小写不敏感），最多 20 条。响应 `200`：`{ "items": [ { "id", "username", "name", "role" } ] }`。错误：`403`。

只返回**不高于调用者层级**的账号：普通教师看不到校管理员/平台管理员的账号信息，管理角色可搜索到同级及以下。

### 3.12 同伴互评与教师量化评分

过程评价此前只有可自动计算的指标；这两类记录把"队友怎么看""教师怎么判"也变成有作者、有时间、可追溯的数据。

#### `GET /api/tasks/:id/reviews` — 某任务的同伴互评

权限与项目读取一致。响应 `200`：

```json
{ "items": [ { "id": "tr…", "taskId": "t9", "projectId": "p1", "reviewerId": "u2",
               "reviewerName": "李四", "verdict": "question",
               "comment": "数据来源没写", "createdAt": "…" } ] }
```

#### `POST /api/tasks/:id/reviews` — 提交同伴互评（项目成员）

请求：`{ "verdict": "acknowledge" | "question", "comment": "…" }`

- 只在任务进入 `review` 或 `done` 后可评（成果已提交才有评价对象）
- 不能评价自己的任务
- `question` 必须写明具体问题（`comment` 必填，≤500 字）
- 同一人对同一任务只保留一条，重复提交为更新

响应 `201`。错误：`403`（非成员 / 评自己）、`409 TASK_NOT_SUBMITTED`、`400`、`409 PROJECT_FINISHED`。

互评是过程记录，**不替代教师验收**；它只影响任务列表的 `peerReviewCount` 与过程评价的 `peerReview` 概览。

#### `GET /api/projects/:id/evaluations` — 教师量化评分

负责教师/管理角色可见全部；学生**只看自己那份**（避免把同伴之间的分数摊开比较）。

```json
{ "items": [ { "id": "ev…", "userId": "u1", "userName": "张三", "evaluatorId": "t1",
               "evaluatorName": "王老师",
               "dimensions": { "problem": 4, "solution": 5, "collaboration": 3, "presentation": 4 },
               "total": 16, "maxTotal": 20, "comment": "方案清晰",
               "createdAt": "…", "updatedAt": "…" } ],
  "total": 1,
  "dimensions": [ { "key": "problem", "label": "问题理解" },
                  { "key": "solution", "label": "方案与创新" },
                  { "key": "collaboration", "label": "协作与过程" },
                  { "key": "presentation", "label": "表达与呈现" } ],
  "min": 1, "max": 5 }
```

`items[].total` 为该条评分的四维之和（满分 `maxTotal`）。若同一名成员被多位教师评过分，会有多条记录——**评分汇总按成员先各自求均分、再对成员求平均**，因此被评多次的成员不会被重复计入。

#### `PUT /api/projects/:id/evaluations/:userId` — 打分或改分（仅负责教师）

请求：`{ "dimensions": { 四个维度各 1~5 整数 }, "comment": "…" }`

**四个维度必须齐全**：缺项会让总分失去可比性。不接受未知维度、非整数、超范围或布尔值。重复提交为更新。响应 `200`：`Evaluation`（含 `total` 与 `maxTotal`）。错误：`403`、`404`（成员不在项目中）、`400`。

#### `DELETE /api/projects/:id/evaluations/:userId` — 撤销自己的评分

仅能撤销本人给出的评分。响应 `204`。错误：`403`、`404`。

评分会写入审计（`evaluation.upsert` / `evaluation.delete`），并随结题档案留档（`Archive.evaluations`）与过程评价汇总（`assessment.evaluation`）。

### 3.12 学校、审计与演示数据（管理角色）

#### `GET /api/admin/schools` — 学校列表

校管理员只见自己的学校；平台管理员见全部。响应 `200`：`{ "items": [ { "id", "name", "createdAt" } ] }`。

#### `GET /api/admin/audit-logs?limit=50` — 管理操作审计

记录谁在何时对哪个对象做了什么（不含口令等敏感内容）。平台管理员见全部，校管理员只见自己的操作；教师不可访问（`403`）。

```json
{ "items": [ { "id": "al…", "actorId": "ad1", "actorName": "平台管理员",
               "action": "user.role_change", "targetType": "user", "targetId": "u9",
               "detail": "u9 的角色 student → teacher", "createdAt": "…" } ],
  "total": 12 }
```

`action` 取值：`user.create`、`user.rename`、`user.reset_password`、`user.role_change`、`user.school_change`、`user.delete`、`group.delete`、`group.school_change`、`project.finish`、`demo.reset`。相同角色/姓名的重复提交不产生记录。

#### `POST /api/admin/demo/reset` — 重置为初始演示数据（仅平台管理员）

清空全部业务数据并重新播种。**会删除所有账号与会话**，当前登录随即失效，需要重新登录。响应 `200`：`{ "reset": true }`。错误：`403`（校管理员及以下）。

### 3.12 用户管理（管理角色）

权限：校管理员及以上（`schooladmin` / `admin` / `superadmin`），只能管理**低于自己层级**的账号；不能改/删自己。

#### `GET /api/admin/users?keyword=&role=` — 用户列表

可见范围：超级管理员见全部（含管理员）；管理员见校管理员及以下；校管理员见老师/学生。`keyword` 匹配用户名/姓名。
响应 `200`：`{ "items": [ { "id", "username", "name", "role" } ] }`（按层级倒序）。

#### `PATCH /api/admin/users/:id` — 修改账号（姓名 / 口令 / 角色 / 学校归属）

`schoolId` 用于设置学校归属（`null` 表示取消归属）；校管理员只能把账号划入本校。重置口令时会同时吊销该用户已签发的全部会话。

#### `POST /api/admin/users` — 创建账号（管理角色）

请求：`{ "username": "…", "password": "123456", "name": "…", "role": "schooladmin" }`（`role` 必须低于调用者层级）。
响应 `201`：User。错误：`400`（角色越界/参数）、`409 USERNAME_TAKEN`。

#### `PATCH /api/admin/users/:id` — 改名 / 重置密码 / 调整角色

请求（可部分提交）：`{ "name": "…", "password": "…", "role": "student" }`（`role` 必须低于调用者层级）。
响应 `200`：User。错误：`400`（自己/越界）、`403`（同级或更高层）。

#### `DELETE /api/admin/users/:id` — 删除账号（级联清理）

级联清理：项目成员、组成员关系、入组邀请、会话、专注记录、闯关成绩、打卡/反馈/批注；任务认领人置空。
响应 `204`。错误：`400`（自己）、`403`（同级或更高层）、`404`。

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

### 3.13 通知中心与教学总览

#### `GET /api/notifications` — 我的通知

通知**不落新表**：由既有数据（教师批注、被退回的任务、到期任务、等待我验收、待处理邀请、收到的同伴互评、到期错题）按时间派生，因此不会出现"通知与事实不一致"。未读由服务端游标判定。

```json
{ "items": [ { "type": "annotation", "title": "「火星基地能源方案」有新批注",
               "detail": "注意补充数据来源", "createdAt": "…",
               "link": "/project/p1?tab=annotations", "unread": true } ],
  "total": 7, "unread": 2, "seenAt": "…" }
```

`type` 取值：`annotation`（教师批注）、`returned`（任务被**他人**退回，自己认领或撤回不算）、`due`（任务**已逾期**）、`verify`（等待验收）、`invite`（待处理邀请）、`quiz`（错题到期复习）、`peer_review`（收到同伴互评）。`link` 为前端路由，点开即跳转。单次最多返回 50 条，`total` 与 `unread` 都按实际返回的条目统计——徽标上的数字能与列表逐条对上。

`unread` 的语义是「标记已读**之后**新发生的事」，`createdAt` 一律取该事件真正发生的时刻：

- 批注 / 退回 / 互评 / 邀请：记录本身的时间
- 逾期：任务的截止时间（到期那一刻才成为"逾期"这件事）
- 等待验收：任务进入待验收的时间
- 错题：最早一道题的到期时刻（而不是错题的创建时间）

因此已被告知过的旧事项会留在列表里但不再计为未读；「即将到期」不发通知（未来时间会永远清不掉未读），由任务看板与过程评价的逾期指标承担。

#### `POST /api/notifications/seen` — 标记已读

请求可带 `{"seenAt": "<ISO 时间>"}`，省略则用服务端当前时间。只更新已读游标，不改动任何业务数据。

`seenAt` 必须是**带时区**的 ISO 时间（`Z` 或 `+08:00` 均可，服务端先归一化为 UTC 再比较）；且不会超过服务端当前时间——客户端时钟偏快时若照单全收，之后产生的通知都会落在游标之前，用户会被永久静音。

响应 `200`：`{ "seenAt": "…" }`。错误：`400`（非字符串或无法解析的时间）。

#### `GET /api/teacher/analytics` — 教学总览（仅教师/管理角色）

把单项目的过程评价聚合到课堂层面，用于决定先干预哪些项目。可见范围与 `GET /api/teacher/projects` 一致；校管理员限定在本校，普通教师为自己负责的组 + 公共项目。只统计**进行中**的项目。

```json
{ "items": [ { "project": { "id": "p1", "name": "火星基地能源方案", "groupId": "g1", "updatedAt": "…" },
               "summary": { /* 同 assessment.summary */ },
               "warningCount": 1, "infoCount": 1,
               "topRisks": [ { "code": "OVERDUE", "title": "任务已逾期", "level": "warning" } ],
               "memberCount": 3, "activeMembers": 3 } ],
  "total": 1, "withRisks": 1, "asOf": "…", "scopedToSchool": "sch1" }
```

按 `warningCount` 降序、其次按逾期数降序排列。错误：`403`（学生）。

