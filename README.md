# 智创方舟 InnoArk

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
- 后端：**ArkEngine**（Flask + SQLite）— 仓库：[https://github.com/ABCDCreeper/ArkEngine](https://github.com/ABCDCreeper/ArkEngine)

## 运行与部署

```bash
yarn install
yarn dev        # 开发服务器（/api 代理到 ArkEngine 后端）
yarn build      # 类型检查 + 生产构建
```

演示账号：学生 `student/123456`、教师 `teacher/123456`。接口契约见 [docs/api.md](./docs/api.md)。
