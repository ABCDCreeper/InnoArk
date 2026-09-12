<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  NCard, NButton, NTag, NSpace, NText, NProgress, NModal, NInput,
  NDatePicker, NTimeline, NTimelineItem, NIcon, NEmpty, NCheckbox, NCheckboxGroup, NDivider,
  NRadioGroup, NRadioButton, NSpin, useMessage, useDialog, useThemeVars,
} from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import { useAuthStore } from '../../stores/auth'
import { usePomodoroStore } from '../../stores/pomodoro'
import { useRouter } from 'vue-router'
import { fetchTasks, createTask, updateTask, deleteTask, fetchTaskLogs, batchVerifyTasks } from '../../api/task'
import { fetchTaskReviews, createTaskReview } from '../../api/review'
import { ApiError } from '../../api/request'
import { formatDue, formatTime } from '../../utils/format'
import type { Task, TaskCriterion, TaskLog, TaskReview, TaskStatus, User } from '../../api/types'

const props = defineProps<{
  projectId: string
  members: User[]
  editable: boolean
  reviewable: boolean
}>()
const emit = defineEmits<{ changed: [] }>()
const auth = useAuthStore()
const pomodoro = usePomodoroStore()
const router = useRouter()

const message = useMessage()
const dialog = useDialog()
const themeVars = useThemeVars()

const tasks = ref<Task[]>([])
const logs = ref<TaskLog[]>([])

const COLUMNS: Array<{ status: TaskStatus; title: string; color: 'default' | 'warning' | 'info' | 'success' }> = [
  { status: 'todo', title: '待认领', color: 'default' },
  { status: 'doing', title: '进行中', color: 'warning' },
  { status: 'review', title: '待验收', color: 'info' },
  { status: 'done', title: '已完成', color: 'success' },
]

const nameOf = (userId: string | null) => props.members.find((m) => m.id === userId)?.name ?? '未认领'
const myId = () => auth.user?.id
const busy = ref(false)

/** 验收标准存在 criteria 字段里（JSON），解析失败按"没有标准"处理而不是让看板报错 */
function parseCriteria(task: Task): TaskCriterion[] {
  if (!task.criteria) return []
  try {
    const parsed = JSON.parse(task.criteria)
    return Array.isArray(parsed)
      ? parsed.filter((c): c is TaskCriterion => !!c && typeof c.text === 'string')
        .map((c) => ({ text: c.text, done: c.done === true }))
      : []
  } catch {
    return []
  }
}
const criteriaLabel = (task: Task) => {
  const list = parseCriteria(task)
  return list.length ? `${list.filter((c) => c.done).length}/${list.length} 项标准` : '未设验收标准'
}

// 待验收期间内容冻结（后端同样拒绝）：需要修改就先撤回，避免验收对象与提交物不一致
const canEdit = (task: Task) =>
  props.editable && task.status !== 'done' && task.status !== 'review'
  && (!task.assigneeId || task.assigneeId === myId())

function transitions(task: Task): Array<{ status: TaskStatus; label: string }> {
  if (props.reviewable && task.status === 'review') {
    return [{ status: 'done', label: '验收通过' }, { status: 'doing', label: '退回修改' }]
  }
  if (!props.editable || task.status === 'done') return []
  if (task.assigneeId && task.assigneeId !== myId()) return []
  if (task.status === 'review') return props.reviewable ? [] : [{ status: 'doing', label: '撤回修改' }]
  if (!task.assigneeId) return []
  if (task.status === 'todo') return [{ status: 'doing', label: '开始任务' }]
  if (task.status === 'doing') return [{ status: 'review', label: '提交验收' }]
  return []
}

const cardH = ref(130)

async function measureCard() {
  await nextTick()
  const el = document.querySelector('.board-col .task-card')
  if (el) cardH.value = el.getBoundingClientRect().height
}

async function load() {
  try {
    const [taskList, logList] = await Promise.all([fetchTasks(props.projectId), fetchTaskLogs(props.projectId)])
    tasks.value = taskList.items
    logs.value = logList.items
    await measureCard()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '加载任务失败')
  }
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
  if (!transitions(task).some(t => t.status === status)) {
    message.warning('请按任务流程推进，已完成需要教师验收')
    return
  }
  await moveTask(task, status)
}

async function moveTask(task: Task, status: TaskStatus) {
  if (busy.value) return
  // 有验收标准的任务先逐条核对再验收，避免"一键通过"把依据丢掉
  if (status === 'done' && props.reviewable && parseCriteria(task).length) {
    openVerify(task)
    return
  }
  busy.value = true
  try {
    await updateTask(task.id, { status })
    await load()
    emit('changed')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '状态更新失败')
  } finally {
    busy.value = false
  }
}

// ---------------------------------------------------------------- 专注与互评

/** 把番茄钟关联到该任务并跳到专注页：时长会记到任务上 */
function focusOn(task: Task) {
  pomodoro.linkTask(task.id, task.title)
  router.push('/focus')
}

const reviewTask = ref<Task | null>(null)
const reviews = ref<TaskReview[]>([])
const reviewVerdict = ref<'acknowledge' | 'question'>('acknowledge')
const reviewComment = ref('')
const reviewSaving = ref(false)
const reviewsLoading = ref(false)

async function openReviews(task: Task) {
  reviewTask.value = task
  reviewVerdict.value = 'acknowledge'
  reviewComment.value = ''
  reviewsLoading.value = true
  try {
    reviews.value = (await fetchTaskReviews(task.id)).items
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '互评加载失败')
    reviews.value = []
  } finally {
    reviewsLoading.value = false
  }
}

async function submitReview() {
  const target = reviewTask.value
  if (!target) return
  reviewSaving.value = true
  try {
    await createTaskReview(target.id, { verdict: reviewVerdict.value, comment: reviewComment.value })
    reviews.value = (await fetchTaskReviews(target.id)).items
    reviewComment.value = ''
    await load()
    emit('changed')
    message.success('已提交同伴互评')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '提交失败')
  } finally {
    reviewSaving.value = false
  }
}

// ---------------------------------------------------------------- 验收（逐条核对）

const verifyTask = ref<Task | null>(null)
const verifyCriteria = ref<TaskCriterion[]>([])
const checkedIndexes = ref<number[]>([])
const verifying = ref(false)

function openVerify(task: Task) {
  verifyTask.value = task
  verifyCriteria.value = parseCriteria(task)
  checkedIndexes.value = verifyCriteria.value
    .map((c, i) => (c.done ? i : -1))
    .filter((i) => i >= 0)
}

async function confirmVerify() {
  const target = verifyTask.value
  if (!target) return
  verifying.value = true
  try {
    await updateTask(target.id, {
      status: 'done',
      criteria: verifyCriteria.value.map((c, i) => ({ text: c.text, done: checkedIndexes.value.includes(i) })),
    })
    verifyTask.value = null
    await load()
    emit('changed')
    message.success('已验收')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '验收失败')
  } finally {
    verifying.value = false
  }
}

// ---------------------------------------------------------------- 批量验收

const reviewTasks = computed(() => tasks.value.filter((t) => t.status === 'review'))
const batchVerifying = ref(false)

async function verifyAll() {
  const ids = reviewTasks.value.map((t) => t.id)
  if (!ids.length) return
  dialog.warning({
    title: '批量验收',
    content: `确定一次通过 ${ids.length} 项待验收任务？带验收标准的任务仍建议逐条核对。`,
    positiveText: '全部通过',
    negativeText: '取消',
    onPositiveClick: async () => {
      batchVerifying.value = true
      try {
        const res = await batchVerifyTasks(props.projectId, ids)
        await load()
        emit('changed')
        const skipped = res.results.length - res.verified
        message.success(skipped ? `已验收 ${res.verified} 项，跳过 ${skipped} 项` : `已验收 ${res.verified} 项`)
      } catch (err) {
        message.error(err instanceof ApiError ? err.message : '批量验收失败')
      } finally {
        batchVerifying.value = false
      }
    },
  })
}

const modal = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ title: '', description: '', dueDate: null as number | null, criteria: [] as TaskCriterion[] })

function openCreate() {
  editingId.value = null
  form.value = { title: '', description: '', dueDate: null, criteria: [] }
  modal.value = true
}

function openEdit(task: Task) {
  editingId.value = task.id
  form.value = {
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ? new Date(task.dueDate).getTime() : null,
    criteria: parseCriteria(task),
  }
  modal.value = true
}

function addCriterion() {
  if (form.value.criteria.length >= 10) return
  form.value.criteria.push({ text: '', done: false })
}

function removeCriterion(index: number) {
  form.value.criteria.splice(index, 1)
}

async function submit() {
  if (!form.value.title.trim()) return
  try {
    // 空白行直接丢弃，避免存下无意义的验收标准
    const criteria = form.value.criteria
      .map((c) => ({ text: c.text.trim(), done: c.done }))
      .filter((c) => c.text)
    const body = {
      title: form.value.title.trim(),
      description: form.value.description,
      dueDate: form.value.dueDate === null ? null : new Date(new Date(form.value.dueDate).setHours(23, 59, 59, 999)).toISOString(),
      criteria,
    }
    if (editingId.value) {
      await updateTask(editingId.value, body)
    } else {
      await createTask(props.projectId, body)
    }
    modal.value = false
    await load()
    emit('changed')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '保存失败')
  }
}

async function toggleClaim(task: Task) {
  if (busy.value) return // 与状态流转共用守卫：连点两次会先认领再取消，静默撤销认领
  busy.value = true
  try {
    await updateTask(task.id, { assigneeId: task.assigneeId ? null : myId() ?? null })
    await load()
    emit('changed')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '操作失败')
  } finally {
    busy.value = false
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
        modal.value = false
        await load()
        emit('changed')
      } catch (err) {
        message.error(err instanceof ApiError ? err.message : '删除失败')
      }
    },
  })
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
          <n-button
            v-if="col.status === 'review' && reviewable && reviewTasks.length > 1"
            size="tiny"
            text
            type="primary"
            style="margin-left: 8px;"
            :loading="batchVerifying"
            @click="verifyAll"
          >全部通过</n-button>
        </n-text>
        <div class="task-list">
          <n-empty v-if="tasksOf(col.status).length === 0" description="" size="small" style="padding: 12px 0;" />
          <div
            v-for="task in tasksOf(col.status)"
            :key="task.id"
            class="task-card"
            :style="{ background: themeVars.cardColor }"
            :draggable="!busy && transitions(task).length > 0"
            @dragstart="onDragStart(task.id)"
            @click="canEdit(task) && openEdit(task)"
          >
            <n-text style="font-size: 13px; font-weight: 500;">{{ task.title }}</n-text>
            <n-text v-if="task.description" depth="3" style="font-size: 12px;">{{ task.description }}</n-text>
            <n-space v-if="parseCriteria(task).length" align="center" size="small">
              <n-tag size="tiny" :bordered="false" :type="task.status === 'done' ? 'success' : 'default'">
                {{ criteriaLabel(task) }}
              </n-tag>
              <n-text v-if="task.status === 'done' && task.verifiedAt" depth="3" style="font-size: 11px;">
                {{ task.verifiedByName ?? '负责教师' }} 验收于 {{ formatTime(task.verifiedAt) }}
              </n-text>
            </n-space>
            <n-space align="center" justify="space-between" style="margin-top: 8px;">
              <n-tag size="tiny" :bordered="false" :type="task.assigneeId ? 'success' : 'default'">{{ nameOf(task.assigneeId) }}</n-tag>
              <n-text v-if="task.dueDate" depth="3" style="font-size: 11px;">截止 {{ formatDue(task.dueDate) }}</n-text>
            </n-space>
            <n-space v-if="task.focusMinutes || task.peerReviewCount" align="center" size="small">
              <n-tag v-if="task.focusMinutes" size="tiny" :bordered="false" type="info">专注 {{ task.focusMinutes }} 分钟</n-tag>
              <n-tag v-if="task.peerReviewCount" size="tiny" :bordered="false">同伴互评 {{ task.peerReviewCount }}</n-tag>
            </n-space>
            <n-button
              v-if="canEdit(task) && task.status === 'todo'"
              size="tiny"
              text
              type="primary"
              :disabled="busy"
              @click.stop="toggleClaim(task)"
            >
              {{ task.assigneeId ? '取消认领' : '认领任务' }}
            </n-button>
            <n-space size="small">
              <n-button
                v-if="task.assigneeId === myId() && task.status !== 'done'"
                size="tiny"
                text
                type="info"
                @click.stop="focusOn(task)"
              >专注</n-button>
              <n-button
                v-if="task.status === 'review' || task.status === 'done'"
                size="tiny"
                text
                @click.stop="openReviews(task)"
              >互评</n-button>
              <n-button v-for="action in transitions(task)" :key="action.status" size="tiny"
                :disabled="busy" :type="action.status === 'done' ? 'success' : 'primary'"
                @click.stop="moveTask(task, action.status)">{{ action.label }}</n-button>
            </n-space>
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
          :title="`${log.userName || logName(log.userId)} ${log.detail}`"
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
        <n-divider style="margin: 4px 0;">验收标准（教师验收时逐条核对）</n-divider>
        <n-space v-for="(c, i) in form.criteria" :key="`c${i}`" align="center">
          <n-input v-model:value="c.text" size="small" placeholder="例如：有量化数据与误差范围" />
          <n-button size="small" quaternary type="error" @click="removeCriterion(i)">删除</n-button>
        </n-space>
        <n-button size="small" dashed :disabled="form.criteria.length >= 10" @click="addCriterion">添加一条标准</n-button>
        <n-space justify="end">
          <n-button v-if="editingId && tasks.find(t => t.id === editingId)?.status === 'todo'" type="error" ghost @click="confirmDelete(tasks.find((t) => t.id === editingId)!)">删除</n-button>
          <n-button @click="modal = false">取消</n-button>
          <n-button type="primary" :disabled="!form.title.trim()" @click="submit">保存</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal
      :show="reviewTask !== null"
      preset="card"
      title="同伴互评"
      style="width: 520px; max-width: 92vw;"
      @update:show="(v: boolean) => { if (!v) reviewTask = null }"
    >
      <n-space v-if="reviewTask" vertical size="medium">
        <n-text strong>{{ reviewTask.title }}</n-text>
        <n-text depth="3" style="font-size: 12px;">
          互评记录过程判断，不替代教师验收；提出疑问时请写清具体问题。
        </n-text>
        <n-spin :show="reviewsLoading">
          <n-empty v-if="!reviewsLoading && !reviews.length" description="还没有同伴互评" />
          <n-timeline v-else>
            <n-timeline-item
              v-for="r in reviews"
              :key="r.id"
              :title="`${r.reviewerName ?? '成员'}${r.verdict === 'question' ? ' 提出疑问' : ' 表示认可'}`"
              :content="r.comment || '（无评语）'"
              :time="formatTime(r.createdAt)"
              :type="r.verdict === 'question' ? 'warning' : 'success'"
            />
          </n-timeline>
        </n-spin>
        <template v-if="reviewTask.assigneeId !== myId() && editable">
          <n-radio-group v-model:value="reviewVerdict" size="small">
            <n-radio-button value="acknowledge">认可</n-radio-button>
            <n-radio-button value="question">提出疑问</n-radio-button>
          </n-radio-group>
          <n-input
            v-model:value="reviewComment"
            type="textarea"
            :rows="2"
            :placeholder="reviewVerdict === 'question' ? '说明具体问题（必填）' : '评语（可选）'"
          />
          <n-space justify="end">
            <n-button @click="reviewTask = null">关闭</n-button>
            <n-button
              type="primary"
              :loading="reviewSaving"
              :disabled="reviewVerdict === 'question' && !reviewComment.trim()"
              @click="submitReview"
            >提交互评</n-button>
          </n-space>
        </template>
        <n-space v-else justify="end">
          <n-button @click="reviewTask = null">关闭</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal
      :show="verifyTask !== null"
      preset="card"
      title="验收：逐条核对标准"
      style="width: 520px; max-width: 92vw;"
      @update:show="(v: boolean) => { if (!v) verifyTask = null }"
    >
      <n-space v-if="verifyTask" vertical>
        <n-text strong>{{ verifyTask.title }}</n-text>
        <n-text depth="3" style="font-size: 12px;">
          勾选确认达标的标准。未勾选的会记为未达标，但仍可通过验收——记录的是核对结果，不是通过条件。
        </n-text>
        <n-checkbox-group v-model:value="checkedIndexes">
          <n-space vertical size="small">
            <n-checkbox
              v-for="(c, i) in verifyCriteria"
              :key="`v${i}`"
              :value="i"
            >{{ c.text }}</n-checkbox>
          </n-space>
        </n-checkbox-group>
        <n-space justify="end">
          <n-button @click="verifyTask = null">取消</n-button>
          <n-button type="primary" :loading="verifying" @click="confirmVerify">验收通过</n-button>
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
