<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard, NButton, NTag, NSpace, NText, NProgress, NTabs, NTabPane, NAvatar, NIcon, useMessage, NSpin, NEmpty,
} from 'naive-ui'
import { ChevronBackOutline, CopyOutline } from '@vicons/ionicons5'
import { useAuthStore } from '../stores/auth'
import { fetchProject } from '../api/project'
import { ApiError } from '../api/request'
import type { Project } from '../api/types'
import NebulaPanel from './project/NebulaPanel.vue'
import ProjectDetailPanel from './project/ProjectDetailPanel.vue'
import TaskBoardPanel from './project/TaskBoardPanel.vue'
import CheckinPanel from './project/CheckinPanel.vue'
import AnnotationPanel from './project/AnnotationPanel.vue'
import ArchivePanel from './project/ArchivePanel.vue'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const auth = useAuthStore()

const project = ref<Project | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    project.value = await fetchProject(props.id)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.id, load)

const isTeacher = computed(() => auth.isTeacher)
const editable = computed(() => {
  if (!project.value) return false
  return !isTeacher.value && project.value.status === 'active'
})

const AVATAR_COLORS = ['#18a058', '#2080f0', '#d03050', '#f0a020']

const tabKey = ref(route.query.tab as string || 'nebula')

function onTabChange(key: string) {
  tabKey.value = key
}

watch(() => route.query.tab, (val) => {
  if (val && val !== tabKey.value) tabKey.value = val as string
})

const tabs = computed(() => {
  const list = [
    { key: 'details', label: '项目详情', disabled: false },
    { key: 'nebula', label: '星云看板', disabled: false },
    { key: 'tasks', label: '任务看板', disabled: false },
    { key: 'checkins', label: '打卡与反馈', disabled: false },
    { key: 'annotations', label: '教师批注', disabled: false },
    { key: 'archive', label: '成果档案', disabled: false },
  ]
  return list
})

async function copyInvite() {
  if (!project.value) return
  try {
    await navigator.clipboard.writeText(project.value.inviteCode)
    message.success('邀请码已复制：' + project.value.inviteCode)
  } catch {
    message.error('复制失败')
  }
}
</script>

<template>
  <n-spin :show="loading" size="large">
    <n-empty v-if="error" :description="error" style="padding: 40px 0;">
      <template #extra>
        <n-button @click="router.push('/projects')">返回项目列表</n-button>
      </template>
    </n-empty>

    <template v-if="project">
      <n-space vertical size="large">
        <!-- 项目头部 -->
        <n-card size="small">
          <n-space align="center" justify="space-between" wrap>
            <n-space align="center" size="small">
              <n-button text @click="router.push('/projects')">
                <n-icon size="20"><chevron-back-outline /></n-icon>
              </n-button>
              <n-text style="font-size: 18px; font-weight: 600;">{{ project.name }}</n-text>
              <n-tag size="small" :type="project.status === 'finished' ? 'default' : 'success'" :bordered="false">
                {{ project.status === 'finished' ? '已结题' : '进行中' }}
              </n-tag>
            </n-space>
            <n-space align="center" size="small">
              <div class="member-avatars">
                <n-avatar
                  v-for="(m, i) in project.members"
                  :key="m.id"
                  round
                  size="small"
                  :style="{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }"
                >
                  {{ m.name.slice(0, 1) }}
                </n-avatar>
              </div>
              <n-text depth="3" style="font-size: 12px;">{{ project.members.length }}/4 人</n-text>
              <n-button size="tiny" quaternary @click="copyInvite">
                <template #icon><n-icon><copy-outline /></n-icon></template>
                {{ project.inviteCode }}
              </n-button>
            </n-space>
          </n-space>
          <n-space align="center" style="margin-top: 8px;">
            <n-text depth="3" style="font-size: 13px;">课题：{{ project.topic?.title }}</n-text>
            <n-progress type="line" :percentage="project.progress.total === 0 ? 0 : Math.round((project.progress.done / project.progress.total) * 100)" :height="8" style="width: 200px;" />
            <n-tag size="small" :bordered="false" type="primary">{{ project.progress.done }}/{{ project.progress.total }} 任务</n-tag>
          </n-space>
        </n-card>

        <n-card size="small">
          <n-tabs :value="tabKey" @update:value="onTabChange" type="line" animated>
            <n-tab-pane v-for="t in tabs" :key="t.key" :name="t.key" :tab="t.label" :disabled="t.disabled">
            <project-detail-panel
              v-if="t.key === 'details'"
              :project-id="project.id"
              :description="project.description"
              :editable="editable || isTeacher"
              @saved="load"
            />
            <nebula-panel v-else-if="t.key === 'nebula'" :project-id="project.id" :editable="editable" />
            <task-board-panel
              v-else-if="t.key === 'tasks'"
              :project-id="project.id"
              :members="project.members"
              :editable="editable"
            />
            <checkin-panel
              v-else-if="t.key === 'checkins'"
              :project-id="project.id"
              :editable="editable"
              :members="project.members"
            />
            <annotation-panel
              v-else-if="t.key === 'annotations'"
              :project-id="project.id"
              :is-teacher="isTeacher"
            />
            <archive-panel
              v-else-if="t.key === 'archive'"
              :project-id="project.id"
              :editable="editable"
              :project-name="project.name"
            />
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </n-space>
    </template>
  </n-spin>
</template>