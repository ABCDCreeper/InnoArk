<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard, NGrid, NGridItem, NButton, NTag, NSpace, NText, NProgress, NTabs, NTabPane,
  NModal, NInput, NForm, NFormItem, NEmpty, NAvatar, NIcon, useMessage, useDialog,
} from 'naive-ui'
import { RocketOutline } from '@vicons/ionicons5'
import { fetchTopics, fetchProjects, createProject, joinProject, updateProject } from '../api/project'
import { ApiError } from '../api/request'
import type { Project, Topic } from '../api/types'

const AVATAR_COLORS = ['#18a058', '#2080f0', '#d03050', '#f0a020']

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const topics = ref<Topic[]>([])
const projects = ref<Project[]>([])
const loading = ref(false)

const activeTab = ref('mine')

async function load() {
  loading.value = true
  try {
    const [t, p] = await Promise.all([fetchTopics(), fetchProjects()])
    topics.value = t.items
    projects.value = p.items
  } finally {
    loading.value = false
  }
}

onMounted(load)

const isFinished = (p: Project) => p.status === 'finished'

const createModal = ref(false)
const createForm = ref({ topicId: '', name: '' })
const creating = ref(false)
const selectedTopic = computed(() => topics.value.find((t) => t.id === createForm.value.topicId))

function openCreate(topic: Topic) {
  createForm.value = { topicId: topic.id, name: topic.title }
  createModal.value = true
}

async function handleCreate() {
  creating.value = true
  try {
    const project = await createProject(createForm.value.topicId, createForm.value.name.trim())
    message.success('项目创建成功，快去邀请队友吧')
    createModal.value = false
    router.push(`/project/${project.id}`)
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '创建失败')
  } finally {
    creating.value = false
  }
}

const joinModal = ref(false)
const joinCode = ref('')
const joining = ref(false)

async function handleJoin() {
  joining.value = true
  try {
    const project = await joinProject(joinCode.value.trim())
    message.success('已加入团队')
    joinModal.value = false
    router.push(`/project/${project.id}`)
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '加入失败')
  } finally {
    joining.value = false
  }
}

function confirmFinish(p: Project) {
  dialog.warning({
    title: '结题确认',
    content: `确定将「${p.name}」标记为已结题吗？结题后系统将自动生成科创档案。`,
    positiveText: '结题',
    negativeText: '取消',
    onPositiveClick: () => finishProject(p),
  })
}

async function finishProject(p: Project) {
  try {
    await updateProject(p.id, { status: 'finished' })
    message.success('项目已结题，科创档案已生成')
    router.push(`/project/${p.id}?tab=archive`)
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '结题失败')
  }
}
</script>

<template>
  <n-card title="项目">
    <n-tabs v-model:value="activeTab" type="line">
      <n-tab-pane name="mine" tab="我的项目">
        <n-space vertical size="large">
          <n-space justify="space-between">
            <n-text depth="3">{{ projects.length }} 个项目</n-text>
            <n-space>
              <n-button @click="joinModal = true">邀请码加入</n-button>
              <n-button type="primary" @click="activeTab = 'topics'">发起项目</n-button>
            </n-space>
          </n-space>

          <n-empty v-if="!loading && projects.length === 0" description="还没有参与的项目">
            <template #extra>
              <n-button type="primary" @click="activeTab = 'topics'">去课题库发起项目</n-button>
            </template>
          </n-empty>

          <n-space vertical v-else size="small">
            <n-card v-for="p in projects" :key="p.id" size="small" hoverable @click="router.push(`/project/${p.id}`)" style="cursor: pointer;">
              <n-space align="center" justify="space-between" wrap>
                <n-space align="center" size="small">
                  <n-text strong>{{ p.name }}</n-text>
                  <n-tag size="small" :type="isFinished(p) ? 'default' : 'success'" :bordered="false">
                    {{ isFinished(p) ? '已结题' : '进行中' }}
                  </n-tag>
                  <n-tag size="small" :bordered="false" type="primary">邀请码 {{ p.inviteCode }}</n-tag>
                </n-space>
                <n-space align="center">
                  <div class="member-avatars">
                    <n-avatar
                      v-for="(m, i) in p.members"
                      :key="m.id"
                      round
                      size="small"
                      :style="{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }"
                    >
                      {{ m.name.slice(0, 1) }}
                    </n-avatar>
                  </div>
                  <n-progress type="line" :percentage="p.progress.total === 0 ? 0 : Math.round((p.progress.done / p.progress.total) * 100)" :height="8" style="width: 120px;" />
                  <n-text depth="3" style="font-size: 12px;">{{ p.progress.done }}/{{ p.progress.total }}</n-text>
                  <n-button size="small" type="primary" ghost @click.stop="router.push(`/project/${p.id}`)">进入</n-button>
                  <n-button v-if="!isFinished(p)" size="small" @click.stop="confirmFinish(p)">结题</n-button>
                </n-space>
              </n-space>
            </n-card>
          </n-space>
        </n-space>
      </n-tab-pane>

      <n-tab-pane name="topics" tab="课题库">
        <n-space vertical size="large">
          <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
            <n-grid-item v-for="topic in topics" :key="topic.id" span="4 s:2 l:1">
              <n-card size="small" hoverable style="height: 100%; display: flex; flex-direction: column;">
                <n-space vertical>
                  <n-text strong style="font-size: 15px;">{{ topic.title }}</n-text>
                  <n-space size="small">
                    <n-tag v-for="s in topic.subjects" :key="s" size="small" :bordered="false" type="info">{{ s }}</n-tag>
                    <n-tag
                      size="small"
                      :bordered="false"
                      :type="topic.difficulty === '挑战' ? 'error' : topic.difficulty === '进阶' ? 'warning' : 'success'"
                    >
                      {{ topic.difficulty }}
                    </n-tag>
                  </n-space>
                  <n-text depth="3" style="font-size: 13px; line-height: 1.6; flex: 1;">{{ topic.summary }}</n-text>
                  <n-button type="primary" block size="small" @click="openCreate(topic)">
                    <template #icon><n-icon><rocket-outline /></n-icon></template>
                    以此课题发起项目
                  </n-button>
                </n-space>
              </n-card>
            </n-grid-item>
          </n-grid>
        </n-space>
      </n-tab-pane>
    </n-tabs>
  </n-card>

  <n-modal v-model:show="createModal" preset="card" title="发起项目" style="width: 480px; max-width: 92vw;">
    <n-form label-placement="top">
      <n-form-item label="课题">
        <n-text>{{ selectedTopic?.title }}</n-text>
      </n-form-item>
      <n-form-item label="项目名称">
        <n-input v-model:value="createForm.name" placeholder="给项目起个名字" />
      </n-form-item>
      <n-text depth="3" style="font-size: 12px;">创建后将生成邀请码，可邀请最多 4 名同学组队。</n-text>
      <n-space justify="end" style="margin-top: 16px;">
        <n-button @click="createModal = false">取消</n-button>
        <n-button type="primary" :loading="creating" :disabled="!createForm.name.trim()" @click="handleCreate">创建</n-button>
      </n-space>
    </n-form>
  </n-modal>

  <n-modal v-model:show="joinModal" preset="card" title="通过邀请码加入" style="width: 400px; max-width: 92vw;">
    <n-input v-model:value="joinCode" placeholder="请输入邀请码，如 P1-7F3A" @keydown.enter="handleJoin" />
    <n-space justify="end" style="margin-top: 16px;">
      <n-button @click="joinModal = false">取消</n-button>
      <n-button type="primary" :loading="joining" :disabled="!joinCode.trim()" @click="handleJoin">加入</n-button>
    </n-space>
  </n-modal>
</template>
