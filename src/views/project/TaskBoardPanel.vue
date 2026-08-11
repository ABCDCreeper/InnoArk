<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  NCard, NButton, NTag, NSpace, NText, NProgress, NModal, NInput,
  NDatePicker, NTimeline, NTimelineItem, NIcon, NEmpty, useMessage, useDialog,
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { fetchTasks, createTask, updateTask, deleteTask, fetchTaskLogs } from '../../api/task'
import { ApiError } from '../../api/request'
import type { Task, TaskLog, TaskStatus, User } from '../../api/types'

const props = defineProps<{
  projectId: string
  members: User[]
  editable: boolean
}>()

const message = useMessage()
const dialog = useDialog()

const tasks = ref<Task[]>([])
const logs = ref<TaskLog[]>([])

const COLUMNS: Array<{ status: TaskStatus; title: string; color: 'default' | 'warning' | 'info' | 'success' }> = [
  { status: 'todo', title: '待认领', color: 'default' },
  { status: 'doing', title: '进行中', color: 'warning' },
  { status: 'review', title: '待验收', color: 'info' },
  { status: 'done', title: '已完成', color: 'success' },
]

const nameOf = (userId: string | null) => props.members.find((m) => m.id === userId)?.name ?? '未认领'
const myId = () => JSON.parse(localStorage.getItem('innoark_user') || 'null')?.id as string | undefined

const cardH = ref(130)

async function measureCard() {
  await nextTick()
  const el = document.querySelector('.board-col .task-card')
  if (el) cardH.value = el.getBoundingClientRect().height
}

async function load() {
  const [taskList, logList] = await Promise.all([fetchTasks(props.projectId), fetchTaskLogs(props.projectId)])
  tasks.value = taskList.items
  logs.value = logList.items
  await measureCard()
}

onMounted(load)

const progress = computed(() => {
  const done = tasks.value.filter((t) => t.status === 'done').length
  return { done, total: tasks.value.length, percent: tasks.value.length === 0 ? 0 : Math.round((done / tasks.value.length) * 100) }
})

const tasksOf = (status: TaskStatus) => tasks.value.filter((t) => t.status === status)

let dragId: string | null = null

function onDragStart(taskId: string) {
  dragId = taskId
}

async function onDrop(status: TaskStatus) {
  if (!dragId) return
  const task = tasks.value.find((t) => t.id === dragId)
  dragId = null
  if (!task || task.status === status) return
  try {
    await updateTask(task.id, { status })
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '状态更新失败')
  }
}

const modal = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ title: '', description: '', dueDate: null as number | null })

function openCreate() {
  editingId.value = null
  form.value = { title: '', description: '', dueDate: null }
  modal.value = true
}

function openEdit(task: Task) {
  editingId.value = task.id
  form.value = {
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ? new Date(task.dueDate).getTime() : null,
  }
  modal.value = true
}

async function submit() {
  if (!form.value.title.trim()) return
  try {
    const body = {
      title: form.value.title.trim(),
      description: form.value.description,
      dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : null,
    }
    if (editingId.value) {
      await updateTask(editingId.value, body)
    } else {
      await createTask(props.projectId, body)
    }
    modal.value = false
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '保存失败')
  }
}

async function toggleClaim(task: Task) {
  try {
    await updateTask(task.id, { assigneeId: task.assigneeId ? null : myId() ?? null })
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '操作失败')
  }
}

function confirmDelete(task: Task) {
  dialog.warning({
    title: '删除任务',
    content: `确定删除任务「${task.title}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteTask(task.id)
        await load()
      } catch (err) {
        message.error(err instanceof ApiError ? err.message : '删除失败')
      }
    },
  })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDue(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const logName = (userId: string) => props.members.find((m) => m.id === userId)?.name ?? userId
</script>

<template>
  <n-space vertical size="large">
    <n-card size="small">
      <n-space align="center" justify="space-between" wrap>
        <n-space align="center">
          <n-text strong>项目进度</n-text>
          <n-progress type="line" :percentage="progress.percent" :height="10" style="width: 260px;" />
          <n-tag :bordered="false" size="small">{{ progress.done }}/{{ progress.total }}</n-tag>
        </n-space>
        <n-button v-if="editable" type="primary" size="small" @click="openCreate">
          <template #icon><n-icon><add-outline /></n-icon></template>
          新建任务
        </n-button>
      </n-space>
    </n-card>

    <div class="board" :style="{ '--card-h': cardH + 'px' }">
      <div
        v-for="col in COLUMNS"
        :key="col.status"
        class="board-col"
        @dragover.prevent
        @drop="onDrop(col.status)"
      >
        <n-text strong style="margin-bottom: 10px; display: block;">
          {{ col.title }}
          <n-tag size="small" :bordered="false" :type="col.color" style="margin-left: 6px;">{{ tasksOf(col.status).length }}</n-tag>
        </n-text>
        <div class="task-list">
          <n-empty v-if="tasksOf(col.status).length === 0" description="" size="small" style="padding: 12px 0;" />
          <div
            v-for="task in tasksOf(col.status)"
            :key="task.id"
            class="task-card"
            draggable="true"
            @dragstart="onDragStart(task.id)"
            @click="editable && openEdit(task)"
          >
            <n-text style="font-size: 13px; font-weight: 500;">{{ task.title }}</n-text>
            <n-text v-if="task.description" depth="3" style="font-size: 12px;">{{ task.description }}</n-text>
            <n-space align="center" justify="space-between" style="margin-top: 8px;">
              <n-tag size="tiny" :bordered="false" :type="task.assigneeId ? 'success' : 'default'">{{ nameOf(task.assigneeId) }}</n-tag>
              <n-text v-if="task.dueDate" depth="3" style="font-size: 11px;">截止 {{ formatDue(task.dueDate) }}</n-text>
            </n-space>
            <n-button
              v-if="editable && task.status !== 'done'"
              size="tiny"
              text
              type="primary"
              @click.stop="toggleClaim(task)"
            >
              {{ task.assigneeId ? '取消认领' : '认领任务' }}
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <n-card title="任务动态" size="small">
      <n-empty v-if="logs.length === 0" description="暂无动态" />
      <n-timeline v-else>
        <n-timeline-item
          v-for="log in logs"
          :key="log.id"
          :title="`${logName(log.userId)} ${log.detail}`"
          :content="formatTime(log.createdAt)"
          :type="log.action === 'delete' ? 'error' : log.action === 'create' ? 'info' : 'success'"
        />
      </n-timeline>
    </n-card>

    <n-modal v-model:show="modal" preset="card" :title="editingId ? '编辑任务' : '新建任务'" style="width: 480px; max-width: 92vw;">
      <n-space vertical>
        <n-input v-model:value="form.title" placeholder="任务标题" />
        <n-input v-model:value="form.description" type="textarea" placeholder="任务描述" :rows="3" />
        <n-space align="center">
          <n-text depth="3" style="font-size: 13px;">截止日期</n-text>
          <n-date-picker v-model:value="form.dueDate" type="date" clearable style="width: 200px;" />
        </n-space>
        <n-space justify="end">
          <n-button v-if="editingId" type="error" ghost @click="confirmDelete(tasks.find((t) => t.id === editingId)!)">删除</n-button>
          <n-button @click="modal = false">取消</n-button>
          <n-button type="primary" :disabled="!form.title.trim()" @click="submit">保存</n-button>
        </n-space>
      </n-space>
    </n-modal>
  </n-space>
</template>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.board-col {
  background: rgba(128, 128, 128, 0.06);
  border-radius: 10px;
  padding: 12px;
  min-height: 200px;
}

.task-list {
  min-height: var(--card-h, 130px);
  max-height: calc(var(--card-h, 130px) * 2.5);
  overflow-y: auto;
}

.task-card {
  background: var(--n-card-color, #fff);
  border: 1px solid rgba(128, 128, 128, 0.18);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.task-card:active {
  cursor: grabbing;
}

@media (max-width: 900px) {
  .board {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
