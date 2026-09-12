<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NAlert, NButton, NEmpty, NIcon, NInput, NInputNumber, NModal, NProgress, NRadioGroup, NRadioButton, NSelect, NSpace, NSpin, NTabPane, NTabs, NTable, NTag, NText, NTooltip, useMessage } from 'naive-ui'
import { RefreshOutline, ChevronForwardOutline } from '@vicons/ionicons5'
import { fetchAssessment, createRiskResponse } from '../../api/project'
import { fetchEvaluations, saveEvaluation } from '../../api/review'
import { fetchCheckins } from '../../api/resource'
import { fetchTasks } from '../../api/task'
import { useAuthStore } from '../../stores/auth'
import { ApiError } from '../../api/request'
import { useAsyncTask } from '../../composables/useAsyncTask'
import type { Evaluation, ProjectAssessment } from '../../api/types'

const props = defineProps<{ projectId: string; editable: boolean; reviewable: boolean }>()
const emit = defineEmits<{ tasks: [] }>()
const message = useMessage()
const auth = useAuthStore()
const data = ref<ProjectAssessment | null>(null)
const error = ref('')
const filter = ref('all')
const risks = computed(() => data.value?.risks.filter(r => filter.value === 'all' || r.level === filter.value) ?? [])
const { loading, run } = useAsyncTask(message, '过程评价加载失败')

function load() {
  return run(() => fetchAssessment(props.projectId), (res) => {
    data.value = res
    error.value = ''
  })
}
const taskTitle = (id: string) => data.value?.tasks.find(t => t.id === id)?.title ?? id

// ---------------------------------------------------------------- 教师量化评分
// 维度固定、分值 1~5：主观判断也要有依据和留痕，而不是只存在于印象里
const evaluations = ref<Evaluation[]>([])
const evalDimensions = ref<Array<{ key: string; label: string }>>([])
const evalMax = ref(5)

async function loadEvaluations() {
  try {
    const res = await fetchEvaluations(props.projectId)
    evaluations.value = res.items
    evalDimensions.value = res.dimensions
    evalMax.value = res.max
  } catch {
    // 评分是附加信息，取不到不影响评价本身
  }
}

const evalTarget = ref<{ id: string; name: string } | null>(null)
const evalForm = ref<Record<string, number>>({})
const evalComment = ref('')
const evalSaving = ref(false)

/** 某成员的评分：多位教师评过时取各自均分，避免只显示其中一条而与汇总矛盾 */
function evalOf(userId: string): { total: number; maxTotal: number; count: number } | null {
  const rows = evaluations.value.filter((e) => e.userId === userId)
  if (!rows.length) return null
  const total = rows.reduce((sum, e) => sum + e.total, 0) / rows.length
  return { total: Math.round(total * 10) / 10, maxTotal: rows[0].maxTotal, count: rows.length }
}

function openEval(member: { user: { id: string; name: string } }) {
  // 维度没拿到就别开表单：否则提交空对象会被后端以"维度需为整数"拒绝，提示很费解
  if (!evalDimensions.value.length) {
    message.error('评分维度加载失败，请刷新后重试')
    return
  }
  evalTarget.value = { id: member.user.id, name: member.user.name }
  // 预填的是"我给出的那条"，不是显示用的均分：均分无法反推出我的分数
  const mine = evaluations.value.find(
    (e) => e.userId === member.user.id && e.evaluatorId === auth.user?.id,
  )
  const base: Record<string, number> = {}
  for (const dim of evalDimensions.value) base[dim.key] = mine?.dimensions?.[dim.key] ?? 3
  evalForm.value = base
  evalComment.value = mine?.comment ?? ''
}

async function submitEval() {
  const target = evalTarget.value
  if (!target) return
  // 清空输入框会得到 null，后端要求四个维度都是整数，这里先挡住并给出可懂的提示
  const missing = evalDimensions.value.filter((d) => typeof evalForm.value[d.key] !== 'number')
  if (missing.length) {
    message.warning(`请填写：${missing.map((d) => d.label).join('、')}`)
    return
  }
  evalSaving.value = true
  try {
    await saveEvaluation(props.projectId, target.id, {
      dimensions: evalForm.value,
      comment: evalComment.value,
    })
    await loadEvaluations()
    await load()
    evalTarget.value = null
    message.success('评分已保存')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '保存失败')
  } finally {
    evalSaving.value = false
  }
}

// 趋势里各指标的中文名（后端只给字段名）
const TREND_LABEL: Record<string, string> = {
  done: '已完成', total: '任务总数', overdue: '逾期', review: '待验收',
  unassigned: '未认领', activeMembers: '活跃成员',
}

// 补充说明可以引用一条自己的打卡或一项任务作为证据，让回应不止是一句话
const evidenceOptions = ref<Array<{ label: string; value: string }>>([])
const pickedEvidence = ref<Record<string, string | null>>({})

async function loadEvidence() {
  if (!props.editable) return
  try {
    const [checkins, tasks] = await Promise.all([
      fetchCheckins(props.projectId),
      fetchTasks(props.projectId),
    ])
    const mine = checkins.items.filter((c) => c.userId === auth.user?.id)
    evidenceOptions.value = [
      ...mine.map((c) => ({ label: `打卡：${c.content.slice(0, 24)}`, value: `checkin:${c.id}` })),
      ...tasks.items.map((t) => ({ label: `任务：${t.title.slice(0, 24)}`, value: `task:${t.id}` })),
    ]
  } catch {
    // 取不到可引用项时只是少了个便利功能，不影响提交说明
    evidenceOptions.value = []
  }
}

onMounted(() => {
  load()
  loadEvidence()
  loadEvaluations()
})

// 成员对预警的补充说明：把「与成员核实线下工作」从单向建议变成可回应的过程记录
const drafts = ref<Record<string, string>>({})
const savingCode = ref<string | null>(null)

async function respond(code: string) {
  const content = (drafts.value[code] ?? '').trim()
  if (!content) return
  const picked = pickedEvidence.value[code]
  const evidence = picked
    ? { evidenceType: picked.split(':')[0] as 'checkin' | 'task', evidenceId: picked.split(':')[1] }
    : null
  savingCode.value = code
  try {
    await createRiskResponse(props.projectId, code, content, evidence)
    drafts.value[code] = ''
    pickedEvidence.value[code] = null
    await load()
    message.success('补充说明已记录')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '提交失败')
  } finally {
    savingCode.value = null
  }
}
</script>

<template>
  <section class="assessment">
    <n-space justify="space-between" align="center" wrap>
      <div><h2>项目过程评价</h2><n-text depth="3">{{ data?.status === 'finished' ? '结题时的过程记录' : '项目进行中' }}</n-text></div>
      <n-tooltip><template #trigger><n-button circle quaternary aria-label="刷新评价" :loading="loading" @click="load"><template #icon><n-icon><refresh-outline /></n-icon></template></n-button></template>刷新评价</n-tooltip>
    </n-space>
    <n-alert v-if="error" type="error" style="margin-top: 16px">{{ error }}<n-button text @click="load">重试</n-button></n-alert>
    <n-spin :show="loading">
      <template v-if="data">
        <div class="metrics">
          <div><span>验收完成</span><strong>{{ data.summary.done }} / {{ data.summary.total }}</strong><n-progress :percentage="data.summary.completionRate ?? 0" :height="6" :show-indicator="false" /></div>
          <div><span>逾期任务</span><strong class="warning">{{ data.summary.overdue }}</strong></div>
          <div><span>等待验收</span><strong class="review">{{ data.summary.review }}</strong></div>
          <div><span>近 7 天活跃成员</span><strong>{{ data.summary.activeMembers }} / {{ data.summary.memberCount }}</strong></div>
        </div>
        <n-alert v-if="data.trend" type="info" :show-icon="false" class="trend">
          <n-text strong>与 {{ data.trend.baseDate }} 相比</n-text>
          <n-space align="center" size="small" wrap style="margin-top: 6px;">
            <n-tag
              v-for="(v, key) in data.trend.metrics"
              :key="key"
              size="small"
              :bordered="false"
              :type="v.delta === 0 ? 'default' : v.delta > 0 ? 'success' : 'warning'"
            >{{ TREND_LABEL[key] ?? key }} {{ v.before }} → {{ v.now }}</n-tag>
            <n-tag v-if="data.trend.risksAdded.length" size="small" :bordered="false" type="warning">
              新增预警 {{ data.trend.risksAdded.length }}
            </n-tag>
            <n-tag v-if="data.trend.risksResolved.length" size="small" :bordered="false" type="success">
              已消除 {{ data.trend.risksResolved.length }}
            </n-tag>
          </n-space>
        </n-alert>
        <n-text v-else depth="3" class="trend-hint">
          今天首次查看，明天起这里会显示与上一次统计的对比（不编造历史趋势）。
        </n-text>
        <n-tabs type="line" animated>
          <n-tab-pane name="members" tab="成员过程记录">
            <n-empty v-if="!data.members.length" description="暂无成员记录" />
            <div v-else class="table-scroll"><n-table :bordered="false" size="small">
              <thead><tr><th>成员</th><th>认领任务</th><th>验收完成</th><th>完成任务占比</th><th>近 7 天活跃天数</th><th>关联专注</th><th>教师评分</th><th>最近记录</th></tr></thead>
              <tbody>
                <tr v-for="m in data.members" :key="m.user.id">
                  <td>{{ m.user.name }}</td>
                  <td>{{ m.assigned }}</td>
                  <td>{{ m.completed }}</td>
                  <td>{{ m.completionShare === null ? '暂无完成记录' : `${m.completionShare}%` }}</td>
                  <td>{{ m.activeDays }}</td>
                  <td>{{ m.focusMinutes ? `${m.focusMinutes} 分钟` : '暂无记录' }}</td>
                  <td>
                    <n-space align="center" size="small">
                      <n-tag v-if="evalOf(m.user.id)" size="tiny" :bordered="false" type="success">
                        {{ evalOf(m.user.id)!.total }} / {{ evalOf(m.user.id)!.maxTotal }}
                      </n-tag>
                      <!-- 学生只看得到自己的评分；别人的分数对他是不可见，而不是"未评分" -->
                      <n-text v-else-if="reviewable || m.user.id === auth.user?.id" depth="3" style="font-size: 12px;">未评分</n-text>
                      <n-text v-else depth="3" style="font-size: 12px;">—</n-text>
                      <n-button v-if="reviewable" size="tiny" text type="primary" @click="openEval(m)">评分</n-button>
                    </n-space>
                  </td>
                  <td>{{ m.lastActiveAt ? new Date(m.lastActiveAt).toLocaleDateString() : '暂无记录' }}</td>
                </tr>
              </tbody>
            </n-table></div>
            <n-space size="small" style="margin-top: 12px;" wrap>
              <n-tag size="small" :bordered="false">
                同伴互评 {{ data.peerReview.total }} 条（认可 {{ data.peerReview.acknowledge }} / 疑问 {{ data.peerReview.question }}）
              </n-tag>
              <n-tag v-if="data.evaluation.members" size="small" :bordered="false" type="success">
                教师评分均分 {{ data.evaluation.avgTotal }}（{{ data.evaluation.members }} 人）
              </n-tag>
              <n-tag v-else size="small" :bordered="false">教师尚未评分</n-tag>
            </n-space>
            <n-alert type="info" :show-icon="false" class="note">统计依据为任务数量、任务操作、打卡与关联到任务的专注时长。任务难度和线下工作未纳入，完成任务占比与专注时长都不等于个人能力或最终贡献。</n-alert>
          </n-tab-pane>
          <n-tab-pane name="risks" :tab="`风险预警 (${data.risks.length})`">
            <n-radio-group v-model:value="filter" size="small" style="margin-bottom: 16px"><n-radio-button value="all">全部</n-radio-button><n-radio-button value="warning">需处理</n-radio-button><n-radio-button value="info">待核实</n-radio-button></n-radio-group>
            <n-empty v-if="!risks.length" :description="data.status === 'finished' ? '项目已结题' : '当前没有匹配的预警'" />
            <article v-for="risk in risks" :key="risk.code" class="risk">
              <n-space align="center"><n-tag size="small" :type="risk.level" :bordered="false">{{ risk.level === 'warning' ? '需处理' : '待核实' }}</n-tag><h3>{{ risk.title }}</h3></n-space>
              <p>{{ risk.evidence }}</p><p class="action">{{ risk.action }}</p>
              <ul v-if="risk.taskIds.length"><li v-for="id in risk.taskIds" :key="id">{{ taskTitle(id) }}</li></ul>
              <div v-if="risk.responses.length" class="responses">
                <div v-for="r in risk.responses" :key="r.id" class="response">
                  <n-text depth="3" style="font-size: 12px;">{{ r.userName ?? '成员' }} · {{ new Date(r.createdAt).toLocaleString() }}</n-text>
                  <n-text>{{ r.content }}</n-text>
                  <n-tag v-if="r.evidenceLabel" size="tiny" :bordered="false" type="info">
                    证据（{{ r.evidenceType === 'checkin' ? '打卡' : '任务' }}）：{{ r.evidenceLabel }}
                  </n-tag>
                </div>
              </div>
              <n-space v-if="editable" vertical size="small" style="margin-top: 10px;">
                <n-space align="start">
                  <n-input
                    v-model:value="drafts[risk.code]"
                    size="small"
                    style="max-width: 420px;"
                    placeholder="补充说明（例如：线下已完成，证据稍后补录）"
                    @keydown.enter.exact.prevent="respond(risk.code)"
                  />
                  <n-button size="small" :loading="savingCode === risk.code" :disabled="!(drafts[risk.code] ?? '').trim()" @click="respond(risk.code)">回应</n-button>
                </n-space>
                <n-select
                  v-if="evidenceOptions.length"
                  v-model:value="pickedEvidence[risk.code]"
                  size="small"
                  style="max-width: 420px;"
                  :options="evidenceOptions"
                  placeholder="引用一条证据（可选）"
                  clearable
                />
              </n-space>
              <n-button size="small" text type="primary" @click="emit('tasks')">查看任务<template #icon><n-icon><chevron-forward-outline /></n-icon></template></n-button>
            </article>
          </n-tab-pane>
        </n-tabs>
        <n-text depth="3" class="timestamp">统计时间 {{ new Date(data.asOf).toLocaleString() }}</n-text>

        <n-modal
          :show="evalTarget !== null"
          preset="card"
          :title="`教师评分：${evalTarget?.name ?? ''}`"
          style="width: 480px; max-width: 92vw;"
          @update:show="(v: boolean) => { if (!v) evalTarget = null }"
        >
          <n-space vertical size="medium">
            <n-text depth="3" style="font-size: 12px;">
              四个维度各 1~{{ evalMax }} 分。评分是教师判断的记录，会随结题档案留档。
            </n-text>
            <n-space v-for="dim in evalDimensions" :key="dim.key" align="center" justify="space-between">
              <n-text>{{ dim.label }}</n-text>
              <n-input-number v-model:value="evalForm[dim.key]" :min="1" :max="evalMax" size="small" style="width: 120px;" />
            </n-space>
            <n-input v-model:value="evalComment" type="textarea" :rows="2" placeholder="评语（可选）" />
            <n-space justify="end">
              <n-button @click="evalTarget = null">取消</n-button>
              <n-button type="primary" :loading="evalSaving" @click="submitEval">保存评分</n-button>
            </n-space>
          </n-space>
        </n-modal>
      </template>
    </n-spin>
  </section>
</template>

<style scoped>
.assessment { min-height: 280px; letter-spacing: 0; }
h2 { font-size: 20px; margin: 0 0 6px; } h3 { font-size: 15px; margin: 0; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; padding: 24px 0; border-bottom: 1px solid #8883; margin-bottom: 16px; }
.metrics span { display: block; font-size: 13px; margin-bottom: 8px; }
.metrics strong { display: block; font-size: 25px; font-weight: 600; margin-bottom: 10px; }
.warning { color: #bd3745; } .review { color: #168577; }
.table-scroll { overflow-x: auto; } table { min-width: 660px; }
.risk { border-bottom: 1px solid #8883; padding: 16px 0; overflow-wrap: anywhere; }
.responses { margin: 8px 0; padding-left: 10px; border-left: 2px solid #8883; }
.response { margin-bottom: 8px; }
.response .n-text { display: block; }
.trend { margin-top: 12px; }
.trend-hint { display: block; margin-top: 10px; font-size: 12px; }
.risk:first-of-type { padding-top: 0; } p { margin: 10px 0; } .action { font-weight: 500; }
.note { margin-top: 20px; } .timestamp { display: block; margin-top: 24px; font-size: 12px; }
@media (max-width: 650px) { .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 12px; } h2 { font-size: 18px; } }
</style>
