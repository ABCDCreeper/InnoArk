<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NCard, NInput, NButton, NSpace, NText, NTimeline, NTimelineItem, NEmpty, NIcon, NTag, NModal,
  NSelect, useMessage,
} from 'naive-ui'
import { SendOutline, AddOutline } from '@vicons/ionicons5'
import { fetchAnnotations, createAnnotation, createTaskFromAnnotation } from '../../api/teacher'
import { ApiError } from '../../api/request'
import { useAsyncTask } from '../../composables/useAsyncTask'
import { formatTime } from '../../utils/format'
import type { Annotation, TaskStatus, User } from '../../api/types'

const props = defineProps<{
  projectId: string
  isTeacher: boolean
  members: User[]
}>()

const message = useMessage()
const annotations = ref<Annotation[]>([])
const content = ref('')
const submitting = ref(false)

const { run } = useAsyncTask(message, '批注加载失败')

function load() {
  return run(() => fetchAnnotations(props.projectId), (res) => {
    annotations.value = res.items
  })
}

onMounted(load)

async function submit() {
  const text = content.value.trim()
  if (!text) return
  submitting.value = true
  try {
    await createAnnotation(props.projectId, text)
    content.value = ''
    await load()
    message.success('批注已添加')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '添加失败')
  } finally {
    submitting.value = false
  }
}

// ---------------------------------------------------------------- 批注转任务

const converting = ref<Annotation | null>(null)
const taskForm = ref({ title: '', assigneeId: null as string | null })
const saving = ref(false)

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '待认领', doing: '进行中', review: '待验收', done: '已完成',
}

function openConvert(annotation: Annotation) {
  converting.value = annotation
  taskForm.value = { title: annotation.content.slice(0, 60), assigneeId: null }
}

async function convert() {
  const target = converting.value
  if (!target) return
  const title = taskForm.value.title.trim()
  if (!title) {
    message.warning('请填写任务标题')
    return
  }
  saving.value = true
  try {
    await createTaskFromAnnotation(target.id, { title, assigneeId: taskForm.value.assigneeId })
    converting.value = null
    await load()
    message.success('已生成任务，学生可在任务看板中处理')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '生成任务失败')
  } finally {
    saving.value = false
  }
}


</script>

<template>
  <n-card size="small">
    <template #header>
      <n-space align="center">
        <n-text strong>教师批注与点拨</n-text>
        <n-text depth="3" style="font-size: 12px;">{{ isTeacher ? '在线批注，实时同步给学生' : '教师批注实时同步，请注意查看' }}</n-text>
      </n-space>
    </template>

    <n-space v-if="isTeacher" style="margin-bottom: 16px;">
      <n-input
        v-model:value="content"
        type="textarea"
        :rows="2"
        placeholder="输入批注，为学生提供点拨…"
        @keydown.enter.exact.prevent="submit"
      />
      <n-button type="primary" :loading="submitting" :disabled="!content.trim()" @click="submit">
        <template #icon><n-icon><send-outline /></n-icon></template>
        发送批注
      </n-button>
    </n-space>

    <n-empty v-if="annotations.length === 0" description="暂无批注" />
    <n-timeline v-else>
      <n-timeline-item
        v-for="a in annotations"
        :key="a.id"
        :title="a.userName ?? '教师'"
        :content="a.content"
        :time="formatTime(a.createdAt)"
        type="warning"
      >
        <template #footer>
          <n-space vertical size="small">
            <n-space v-if="a.linkedTasks.length" align="center" size="small">
              <n-text depth="3" style="font-size: 12px;">已转为任务：</n-text>
              <n-tag v-for="t in a.linkedTasks" :key="t.id" size="tiny" :bordered="false" type="success">
                {{ t.title }} · {{ STATUS_LABEL[t.status] }}
              </n-tag>
            </n-space>
            <n-button v-if="isTeacher" size="tiny" quaternary type="primary" @click="openConvert(a)">
              <template #icon><n-icon><add-outline /></n-icon></template>
              转为任务
            </n-button>
          </n-space>
        </template>
      </n-timeline-item>
    </n-timeline>

    <n-modal
      :show="converting !== null"
      preset="card"
      title="把批注转为任务"
      style="width: 520px; max-width: 92vw;"
      @update:show="(v: boolean) => { if (!v) converting = null }"
    >
      <n-space vertical>
        <n-text depth="3" style="font-size: 12px;">
          任务会记录来源批注，学生完成后经教师验收即进入结题档案。
        </n-text>
        <n-input v-model:value="taskForm.title" placeholder="任务标题" />
        <n-select
          v-model:value="taskForm.assigneeId"
          :options="members.map((m) => ({ label: m.name, value: m.id }))"
          placeholder="负责人（可留空，由学生认领）"
          clearable
        />
        <n-space justify="end">
          <n-button @click="converting = null">取消</n-button>
          <n-button type="primary" :loading="saving" @click="convert">生成任务</n-button>
        </n-space>
      </n-space>
    </n-modal>
  </n-card>
</template>
