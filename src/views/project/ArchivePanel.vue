<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NCard, NButton, NTag, NSpace, NText, NStatistic, NGrid, NGridItem, NEmpty, NProgress,
  NTimeline, NTimelineItem, useMessage, useDialog, NTable,
} from 'naive-ui'
import { fetchArchive } from '../../api/archive'
import { updateProject } from '../../api/project'
import { ApiError } from '../../api/request'
import type { Archive } from '../../api/types'

const props = defineProps<{
  projectId: string
  editable: boolean
  projectName: string
}>()

const message = useMessage()
const dialog = useDialog()
const archive = ref<Archive | null>(null)
const notFinished = ref(false)
const loading = ref(true)

async function load() {
  loading.value = true
  notFinished.value = false
  archive.value = null
  try {
    archive.value = await fetchArchive(props.projectId)
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      notFinished.value = true
    } else {
      message.error(err instanceof ApiError ? err.message : '加载失败')
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)

function confirmFinish() {
  dialog.warning({
    title: '结题确认',
    content: '确定将项目标记为已结题吗？系统将自动生成科创档案，结题后任务和看板将变为只读。',
    positiveText: '结题',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await updateProject(props.projectId, { status: 'finished' })
        message.success('项目已结题，档案已生成')
        await load()
      } catch (err) {
        message.error(err instanceof ApiError ? err.message : '结题失败')
      }
    },
  })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <n-card size="small" :loading="loading">
    <template #header>
      <n-space align="center">
        <n-text strong>科创档案</n-text>
        <n-tag v-if="archive" size="small" type="success" :bordered="false">已结题</n-tag>
        <n-tag v-else size="small" type="default" :bordered="false">未结题</n-tag>
      </n-space>
    </template>

    <n-empty v-if="notFinished" description="项目结题后可查看科创档案">
      <n-text depth="3" style="font-size: 13px; display: block; margin-bottom: 12px;">
        结题后系统将自动整合全部过程记录，生成一份完整的电子版科创档案。
      </n-text>
      <n-button v-if="editable" type="primary" @click="confirmFinish">结题</n-button>
    </n-empty>

    <template v-if="archive">
      <n-grid :cols="5" :x-gap="16" :y-gap="16" style="margin-bottom: 24px;">
        <n-grid-item span="5 m:1">
          <n-statistic label="总任务数" :value="archive.summary.taskTotal" />
        </n-grid-item>
        <n-grid-item span="5 m:1">
          <n-statistic label="已完成" :value="archive.summary.doneTotal" />
        </n-grid-item>
        <n-grid-item span="5 m:1">
          <n-statistic label="打卡次数" :value="archive.summary.checkinTotal" />
        </n-grid-item>
        <n-grid-item span="5 m:1">
          <n-statistic label="系统反馈" :value="archive.summary.feedbackTotal" />
        </n-grid-item>
        <n-grid-item span="5 m:1">
          <n-statistic label="历时" :value="archive.summary.durationDays" suffix="天" />
        </n-grid-item>
      </n-grid>

      <n-card title="成员贡献" size="small" style="margin-bottom: 16px;">
        <n-table :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th>成员</th>
              <th>角色</th>
              <th>认领任务</th>
              <th>已完成</th>
              <th>完成率</th>
              <th>打卡次数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in archive.members" :key="m.user.id">
              <td>{{ m.user.name }}</td>
              <td><n-tag size="small" :type="m.user.role === 'teacher' ? 'warning' : 'success'" :bordered="false">{{ m.user.role === 'teacher' ? '教师' : '学生' }}</n-tag></td>
              <td>{{ m.taskCount }}</td>
              <td>{{ m.doneCount }}</td>
              <td>
                <n-progress type="line" :percentage="m.taskCount === 0 ? 0 : Math.round((m.doneCount / m.taskCount) * 100)" :height="8" />
              </td>
              <td>{{ m.checkinCount }}</td>
            </tr>
          </tbody>
        </n-table>
      </n-card>

      <n-card title="任务清单" size="small" style="margin-bottom: 16px;">
        <n-table :bordered="false" :single-line="false" size="small">
          <thead>
            <tr>
              <th>任务</th>
              <th>认领人</th>
              <th>状态</th>
              <th>截止日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in archive.tasks" :key="t.id">
              <td>{{ t.title }}</td>
              <td>{{ archive.members.find((m) => m.user.id === t.assigneeId)?.user.name ?? '未认领' }}</td>
              <td>
                <n-tag size="small" :type="t.status === 'done' ? 'success' : 'default'" :bordered="false">
                  {{ t.status === 'todo' ? '待认领' : t.status === 'doing' ? '进行中' : t.status === 'review' ? '待验收' : '已完成' }}
                </n-tag>
              </td>
              <td>{{ t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-' }}</td>
            </tr>
          </tbody>
        </n-table>
      </n-card>

      <n-card title="打卡记录" size="small" style="margin-bottom: 16px;">
        <n-timeline v-if="archive.checkins.length > 0">
          <n-timeline-item
            v-for="c in archive.checkins"
            :key="c.id"
            :title="archive.members.find((m) => m.user.id === c.userId)?.user.name ?? ''"
            :content="c.content"
            :time="formatTime(c.createdAt)"
            type="success"
          />
        </n-timeline>
        <n-empty v-else description="无打卡记录" />
      </n-card>

      <n-card title="系统反馈" size="small" style="margin-bottom: 16px;">
        <n-empty v-if="archive.feedbacks.length === 0" description="无反馈" />
        <n-timeline v-else>
          <n-timeline-item
            v-for="f in archive.feedbacks"
            :key="f.id"
            :content="f.content"
            :time="formatTime(f.createdAt)"
            :type="f.type === 'milestone' ? 'success' : 'info'"
          />
        </n-timeline>
      </n-card>

      <n-card title="教师批注" size="small">
        <n-empty v-if="archive.annotations.length === 0" description="无批注" />
        <n-timeline v-else>
          <n-timeline-item
            v-for="a in archive.annotations"
            :key="a.id"
            title="王老师"
            :content="a.content"
            :time="formatTime(a.createdAt)"
            type="warning"
          />
        </n-timeline>
      </n-card>
    </template>
  </n-card>
</template>