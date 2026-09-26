<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NCard, NButton, NTag, NSpace, NText, NStatistic, NGrid, NGridItem, NEmpty, NProgress,
  NTimeline, NTimelineItem, useMessage, useDialog, NTable, NModal,
} from 'naive-ui'
import { fetchArchive } from '../../api/archive'
import { fetchAnnotations } from '../../api/teacher'
import { updateProject } from '../../api/project'
import { ApiError } from '../../api/request'
import type { Archive } from '../../api/types'

const props = defineProps<{
  projectId: string
  editable: boolean
}>()

const message = useMessage()
const dialog = useDialog()
const archive = ref<Archive | null>(null)
const notFinished = ref(false)
const loading = ref(true)
const certShow = ref(false)
const teacherName = ref('')

async function load() {
  loading.value = true
  notFinished.value = false
  archive.value = null
  try {
    archive.value = await fetchArchive(props.projectId)
    loadTeacherName()
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

// 证书落款需要指导教师姓名，批注接口已返回作者名；取最近一条批注的作者
async function loadTeacherName() {
  try {
    const res = await fetchAnnotations(props.projectId)
    teacherName.value = res.items[res.items.length - 1]?.name ?? ''
  } catch {
    teacherName.value = ''
  }
}

onMounted(load)

function openCertificate() {
  if (!archive.value) return
  certShow.value = true
}

function printCertificate() {
  document.body.classList.add('printing-certificate')
  window.print()
  // 打印对话框关闭后恢复页面；setTimeout 确保在 print() 阻塞结束后执行
  window.setTimeout(() => document.body.classList.remove('printing-certificate'), 500)
}

function formatCertDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

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

    <template v-if="archive" #header-extra>
      <n-button size="small" type="primary" ghost @click="openCertificate">🎓 生成结题证书</n-button>
    </template>

    <n-empty v-if="notFinished" description="项目结题后可查看科创档案">
      <n-text depth="3" style="font-size: 13px; display: block; margin-bottom: 16px; text-align: center;">
        结题后系统将自动整合全部过程记录，生成一份完整的电子版科创档案。
      </n-text>
      <n-space justify="center">
        <n-button v-if="editable" type="primary" @click="confirmFinish">结题</n-button>
      </n-space>
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
            :title="a.name ?? '教师'"
            :content="a.content"
            :time="formatTime(a.createdAt)"
            type="warning"
          />
        </n-timeline>
      </n-card>
    </template>
  </n-card>

  <!-- 结题证书 -->
  <n-modal v-model:show="certShow" preset="card" title="结题证书" style="width: 760px; max-width: 94vw;">
    <div v-if="archive" class="cert-area">
      <div class="cert">
        <div class="cert-inner">
          <div class="cert-badge">🏅</div>
          <div class="cert-title">科创实践结题证书</div>
          <div class="cert-sub">CERTIFICATE OF COMPLETION</div>
          <div class="cert-body">
            兹证明 <b>{{ archive.members.map((m) => m.user.name).join('、') }}</b> 团队
            于智创方舟 InnoArk 平台完成跨学科科创项目
          </div>
          <div class="cert-project">《{{ archive.project.name }}》</div>
          <div class="cert-body">
            历时 {{ archive.summary.durationDays }} 天，累计完成任务 {{ archive.summary.taskTotal }} 项
            （完成 {{ archive.summary.doneTotal }} 项）、打卡 {{ archive.summary.checkinTotal }} 次，
            生成过程档案一份，特发此证。
          </div>
          <div class="cert-meta">
            <div class="cert-sign">
              <div class="cert-sign-name">{{ teacherName || '智创方舟平台' }}</div>
              <div class="cert-sign-label">指导教师 / 签发</div>
            </div>
            <div class="cert-seal">智创方舟</div>
            <div class="cert-date">
              <div>{{ archive.project.finishedAt ? formatCertDate(archive.project.finishedAt) : '' }}</div>
              <div class="cert-sign-label">编号 {{ archive.project.inviteCode }}-{{ new Date().getFullYear() }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="cert-actions">
        <n-button type="primary" @click="printCertificate">🖨️ 打印 / 保存为 PDF</n-button>
        <n-text depth="3" style="font-size: 12px;">打印时仅输出证书内容，可在浏览器中选择“另存为 PDF”</n-text>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.cert-area {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cert {
  border: 6px double #b98a2f;
  border-radius: 10px;
  padding: 6px;
  background: linear-gradient(160deg, #fffdf5, #fdf6e3);
  color: #5b4a1f;
}

.cert-inner {
  border: 1px solid rgba(185, 138, 47, 0.5);
  border-radius: 6px;
  padding: 26px 30px 20px;
  text-align: center;
}

.cert-badge {
  font-size: 40px;
}

.cert-title {
  font-size: 30px;
  font-weight: 900;
  letter-spacing: 6px;
  margin: 6px 0 2px;
}

.cert-sub {
  font-size: 11px;
  letter-spacing: 4px;
  opacity: 0.6;
}

.cert-body {
  font-size: 14px;
  line-height: 2;
  margin-top: 12px;
  text-align: left;
  text-indent: 2em;
}

.cert-project {
  font-size: 20px;
  font-weight: 800;
  color: #8a5a00;
  margin: 6px 0;
}

.cert-meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 26px;
  font-size: 13px;
}

.cert-sign-name {
  font-weight: 800;
  font-size: 15px;
}

.cert-sign-label {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 2px;
}

.cert-seal {
  width: 92px;
  height: 92px;
  border: 3px solid rgba(200, 40, 40, 0.75);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(200, 40, 40, 0.85);
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 2px;
  transform: rotate(-12deg);
  align-self: center;
}

.cert-date {
  text-align: right;
}

.cert-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 640px) {
  .cert-meta {
    flex-direction: column;
    align-items: center;
  }
}
</style>

<style>
/* 打印证书：只输出 .cert-area，其余全部隐藏 */
@media print {
  body.printing-certificate * {
    visibility: hidden !important;
  }

  body.printing-certificate .cert-area,
  body.printing-certificate .cert-area * {
    visibility: visible !important;
  }

  body.printing-certificate .cert-area {
    position: fixed;
    inset: 0;
    padding: 12px;
    overflow: visible;
  }
}
</style>
