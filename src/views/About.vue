<script setup lang="ts">
import { NCard, NSpace, NText, NGrid, NGridItem, NList, NListItem, NThing } from 'naive-ui'
</script>

<template>
  <n-space vertical size="large">
    <n-card>
      <n-space align="center">
        <n-text style="font-size: 22px; font-weight: 600;">关于智创方舟 InnoArk</n-text>
      </n-space>
      <div style="margin-top: 12px;">
        <n-text depth="3" style="line-height: 1.9;">
          「智创方舟 InnoArk」是面向上海市青少年科创体验中心中小学生的智能跨学科项目式学习（PBL）协同平台。
          针对现有在线学习工具"单向传授、互动不足、反馈滞后"三大痛点，平台以团队协作与过程性评价为核心，
          帮助学生把复杂科创项目拆解为可执行的任务，在创意看板中碰撞灵感，在专注模式中沉浸探索，
          在闯关答题中巩固知识，在动态反馈中持续成长，最终沉淀为一份完整的科创档案。
        </n-text>
      </div>
    </n-card>

    <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
      <n-grid-item span="2 l:1">
        <n-card title="平台功能" size="small">
          <n-list hoverable>
            <n-list-item>
              <n-thing title="星云创意看板" description="多人实时头脑风暴，思维导图 + 电子便签记录灵感" />
            </n-list-item>
            <n-list-item>
              <n-thing title="PBL 里程碑任务管理" description="任务拆解、认领、进度追踪与版本记录，锻炼过程管理能力" />
            </n-list-item>
            <n-list-item>
              <n-thing title="资源导航与动态反馈" description="虫洞特色科创资源库 + 阶段性打卡与自动化思路引导" />
            </n-list-item>
            <n-list-item>
              <n-thing title="沉浸式专注模式" description="番茄钟 + 在线白板 + 数据统计，帮助维持注意力" />
            </n-list-item>
            <n-list-item>
              <n-thing title="知识闯关" description="跨学科趣味答题，即时正误解析；老师按用户组配置题库与抽题机制" />
            </n-list-item>
            <n-list-item>
              <n-thing title="用户组体系" description="按学校/班级分组管理成员与项目，邀请码入组、教师邀请、组间内容隔离" />
            </n-list-item>
          </n-list>
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 l:1">
        <n-card title="角色与权限" size="small">
          <n-list hoverable>
            <n-list-item>
              <n-thing title="学生" description="组队做项目、协作看板、闯关答题，通过邀请码加入分组" />
            </n-list-item>
            <n-list-item>
              <n-thing title="教师" description="负责组的管理：题库出题、邀请成员入组、项目批注与团队总览" />
            </n-list-item>
            <n-list-item>
              <n-thing title="校管理员 / 管理员 / 超级管理员" description="逐级管理账号、角色与权限：校管理员管老师学生，管理员管校管理员，超级管理员管管理员" />
            </n-list-item>
          </n-list>
        </n-card>
        <n-card title="技术架构" size="small" style="margin-top: 16px;">
          <n-list hoverable>
            <n-list-item>
              <n-thing title="前端" description="Vue 3 + TypeScript + Naive UI + Pinia，响应式单页应用" />
            </n-list-item>
            <n-list-item>
              <n-thing title="后端" description="Python Flask + SQLite，RESTful API，详见 docs/api.md" />
            </n-list-item>
            <n-list-item>
              <n-thing title="协作开发" description="VS Code + Git/GitHub 团队版本控制" />
            </n-list-item>
          </n-list>
        </n-card>
      </n-grid-item>
    </n-grid>
  </n-space>
</template>
