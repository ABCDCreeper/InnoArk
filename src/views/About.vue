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
          在动态反馈中持续成长，最终沉淀为一份完整的科创档案。
        </n-text>
      </div>
    </n-card>

    <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
      <n-grid-item span="2 l:1">
        <n-card title="四大核心功能" size="small">
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
          </n-list>
        </n-card>
      </n-grid-item>
      <n-grid-item span="2 l:1">
        <n-card title="技术架构" size="small">
          <n-list hoverable>
            <n-list-item>
              <n-thing title="前端" description="Vue 3 + TypeScript + Naive UI + Pinia，响应式单页应用" />
            </n-list-item>
            <n-list-item>
              <n-thing title="后端（预留）" description="Python Flask / Django，RESTful API，详见 docs/api.md" />
            </n-list-item>
            <n-list-item>
              <n-thing title="数据库" description="MySQL / SQLite：用户、项目进度、团队协作内容" />
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
