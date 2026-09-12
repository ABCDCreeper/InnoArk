<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NCard, NButton, NSpace, NText, NTag, NGrid, NGridItem, NEmpty, NInput, NIcon, useMessage,
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { fetchMyGroups, joinGroupByCode } from '../api/group'
import { ApiError } from '../api/request'
import type { MyGroup } from '../api/group'
import type { QuizMode } from '../api/types'

const message = useMessage()

const groups = ref<MyGroup[]>([])
const loading = ref(true)
const inviteCode = ref('')
const joining = ref(false)

const MODE_LABEL: Record<QuizMode, string> = {
  group: '只用组内',
  fallback: '回退公共',
  mixed: '组内+公共混合',
}

async function load() {
  loading.value = true
  try {
    const res = await fetchMyGroups()
    groups.value = res.items
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function join() {
  const code = inviteCode.value.trim()
  if (!code) return
  joining.value = true
  try {
    const g = await joinGroupByCode(code)
    message.success(`已加入「${g.name}」`)
    inviteCode.value = ''
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '加入失败')
  } finally {
    joining.value = false
  }
}

onMounted(load)
</script>

<template>
  <n-space vertical size="large">
    <n-card>
      <n-space align="center" justify="space-between" wrap>
        <div>
          <n-text style="font-size: 20px; font-weight: 600;">我的分组</n-text>
          <div style="margin-top: 4px;"><n-text depth="3">一个学生可以同时在多个组，组内题目与项目对本组成员开放。</n-text></div>
        </div>
        <n-space align="center">
          <n-input v-model:value="inviteCode" placeholder="输入组邀请码，如 G1-KM3X" style="width: 220px;" @keydown.enter="join" />
          <n-button type="primary" :loading="joining" :disabled="!inviteCode.trim()" @click="join">
            <template #icon><n-icon><add-outline /></n-icon></template>
            加入分组
          </n-button>
        </n-space>
      </n-space>
    </n-card>

    <n-card :loading="loading">
      <n-empty v-if="!loading && groups.length === 0" description="还没有加入任何分组，输入邀请码加入吧" style="padding: 32px 0;" />
      <n-grid v-else :cols="3" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <n-grid-item v-for="g in groups" :key="g.id" span="3 s:2 m:1">
          <n-card size="small" hoverable style="height: 100%;">
            <n-space vertical size="small">
              <n-space align="center" justify="space-between">
                <n-text strong style="font-size: 15px;">👥 {{ g.name }}</n-text>
                <n-tag size="tiny" :bordered="false" type="info">{{ MODE_LABEL[g.quizMode] }}</n-tag>
              </n-space>
              <n-text v-if="g.description" depth="3" style="font-size: 12px;">{{ g.description }}</n-text>
              <n-text depth="3" style="font-size: 12px;">👥 {{ g.memberCount }} 人 · 📝 {{ g.questionCount }} 题 · 📁 {{ g.projectCount }} 项目</n-text>
            </n-space>
          </n-card>
        </n-grid-item>
      </n-grid>
    </n-card>
  </n-space>
</template>
