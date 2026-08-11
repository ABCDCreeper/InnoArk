# 智创方舟 InnoArk

智能跨学科项目式学习协同平台（上海未来工程师大赛 · 软件工程师赛项项目）。

依据《项目申报书：智能跨学科学习平台》实现，面向"虫洞"科创体验中心的中小学生与指导教师，支持团队协同创新、过程性评价与沉浸式学习。

## 核心功能

| 模块 | 说明 |
|---|---|
| 登录与组队 | 学生/教师双角色登录；浏览课题库、发起项目、邀请码加入（≤4 人小队） |
| 星云创意看板 | 多人协同思维导图（SVG 树形布局、节点增删改）+ 灵感便签（拖拽、换色、编辑），5 秒轮询模拟实时同步 |
| PBL 任务看板 | 待认领/进行中/待验收/已完成四列拖拽流转；任务认领、截止日期、项目进度、任务动态（版本记录） |
| 打卡与动态反馈 | 每日打卡；任务完成与打卡自动生成系统反馈（里程碑/思路引导） |
| 跨学科资源导航 | 分类浏览 + 关键词搜索的科创资源库 |
| 沉浸式专注模式 | 番茄钟（25+5）+ 在线白板（Canvas 手绘）+ 近 7 天专注统计 |
| 教师端 | 全部团队进度总览、项目在线批注与点拨 |
| 成果归档 | 项目结题后自动生成完整科创档案（成员贡献、任务清单、打卡与反馈汇总） |

## 技术栈

- 前端：Vue 3.5 + TypeScript + Vite + Naive UI + Pinia + Vue Router
- 后端：**未实现**（预留接口，见下文 API 契约）

## 快速开始

```bash
yarn install
yarn dev        # 启动开发服务器（内置 Mock API，无需后端）
yarn build      # 类型检查 + 生产构建
```

演示账号：

| 身份 | 用户名 | 密码 |
|---|---|---|
| 学生 | `student` | `123456` |
| 学生 2 | `student2` | `123456` |
| 教师 | `teacher` | `123456` |

## 后端 API 契约

- 接口规范（RESTful：状态码、鉴权、错误码、数据模型）：**[docs/api.md](./docs/api.md)**
- 前端 API 层位于 `src/api/`，全部按契约实现
- 开发阶段由 `mock/`（Vite 中间件）提供模拟数据，数据持久化在 `.mock-data/db.json`（不入库）

### 接入真实后端

1. 按 [docs/api.md](./docs/api.md) 实现后端（建议 Flask/Django，见文档第 5 节）；
2. 在 `vite.config.ts` 移除 `mockPlugin()`，并配置代理：

```ts
server: {
  proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } }
}
```

前端代码无需任何改动。

## 项目结构

```
src/
  api/          # API 层（request 封装 + 分模块接口 + 类型定义）
  components/   # Layout / MindMap / StickyNotes / Pomodoro / CanvasWhiteboard / WeeklyBar
  stores/       # Pinia（auth）
  views/        # 页面（Home / Projects / ProjectDetail / Resources / Focus / TeacherBoard …）
mock/           # 开发期 Mock 后端（Vite 中间件）
docs/api.md     # RESTful API 契约文档
```
