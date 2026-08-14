<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NCard, NButton, NSpace, NText, NTag, NGrid, NGridItem, NEmpty, NIcon, NModal, NInput, NRadioGroup,
  NRadioButton, NRadio, NInputNumber, NSelect, NTabs, NTabPane, NSpin, NAvatar, useMessage, useDialog,
} from 'naive-ui'
import { AddOutline, CreateOutline, TrashOutline, SearchOutline, CloseOutline } from '@vicons/ionicons5'
import {
  fetchGroups, createGroup, updateGroup, deleteGroup,
  fetchGroupMembers, addGroupMember, removeGroupMember,
  fetchGroupQuestions, createGroupQuestion, updateGroupQuestion, deleteGroupQuestion,
  searchUsers, type QuestionBody,
} from '../api/group'
import { ApiError } from '../api/request'
import type { GroupMember, QuizGroup, QuizMode, QuizQuestion, UserBrief } from '../api/types'

const message = useMessage()
const dialog = useDialog()

const groups = ref<QuizGroup[]>([])
const loading = ref(true)
const selectedId = ref<string | null>(null)
const members = ref<GroupMember[]>([])
const questions = ref<QuizQuestion[]>([])
const panelLoading = ref(false)

const selected = computed(() => groups.value.find((g) => g.id === selectedId.value) ?? null)

const MODE_LABEL: Record<QuizMode, string> = {
  group: '只用组内',
  fallback: '回退公共',
  mixed: '组内+公共混合',
}
const CATEGORIES = ['物理', '工程', '编程', '生物', '综合']
const LETTERS = ['A', 'B', 'C', 'D']

async function load() {
  loading.value = true
  try {
    const res = await fetchGroups()
    groups.value = res.items
    if (selectedId.value && !groups.value.some((g) => g.id === selectedId.value)) selectedId.value = null
    if (!selectedId.value && groups.value.length > 0) selectedId.value = groups.value[0].id
    if (selectedId.value) await loadPanel()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadPanel() {
  if (!selectedId.value) return
  panelLoading.value = true
  try {
    const [m, q] = await Promise.all([fetchGroupMembers(selectedId.value), fetchGroupQuestions(selectedId.value)])
    members.value = m.items
    questions.value = q.items
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '加载失败')
  } finally {
    panelLoading.value = false
  }
}

function selectGroup(id: string) {
  selectedId.value = id
  loadPanel()
}

onMounted(load)

// ---------------------------------------------------------------- 分组

const groupModal = ref(false)
const groupEditing = ref<QuizGroup | null>(null)
const groupForm = ref({ name: '', description: '', quizMode: 'group' as QuizMode })
const groupSaving = ref(false)

function openGroupModal(g?: QuizGroup) {
  groupEditing.value = g ?? null
  groupForm.value = {
    name: g?.name ?? '',
    description: g?.description ?? '',
    quizMode: g?.quizMode ?? 'group',
  }
  groupModal.value = true
}

async function saveGroup() {
  const name = groupForm.value.name.trim()
  if (!name) {
    message.warning('请填写组名称')
    return
  }
  groupSaving.value = true
  try {
    if (groupEditing.value) {
      await updateGroup(groupEditing.value.id, groupForm.value)
      message.success('分组已更新')
    } else {
      await createGroup(groupForm.value)
      message.success('分组已创建')
    }
    groupModal.value = false
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '保存失败')
  } finally {
    groupSaving.value = false
  }
}

function removeGroup(g: QuizGroup) {
  dialog.warning({
    title: '删除分组',
    content: `确定删除「${g.name}」？组内 ${g.questionCount} 道题目与成员关系将一并删除。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteGroup(g.id)
        message.success('分组已删除')
        await load()
      } catch (err) {
        message.error(err instanceof ApiError ? err.message : '删除失败')
      }
    },
  })
}

// ---------------------------------------------------------------- 成员

const memberModal = ref(false)
const memberRole = ref<'member' | 'teacher'>('member')
const memberKeyword = ref('')
const memberResults = ref<UserBrief[]>([])
const memberSearching = ref(false)
const memberAdding = ref(false)

const memberIds = computed(() => new Set(members.value.map((m) => m.userId)))

async function search() {
  memberSearching.value = true
  try {
    const res = await searchUsers(memberKeyword.value.trim())
    memberResults.value = res.items
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '搜索失败')
  } finally {
    memberSearching.value = false
  }
}

function openMemberModal() {
  memberResults.value = []
  memberKeyword.value = ''
  memberModal.value = true
  search()
}

async function addMember(u: UserBrief) {
  if (!selectedId.value) return
  memberAdding.value = true
  try {
    await addGroupMember(selectedId.value, u.id, memberRole.value)
    message.success(`已添加 ${u.name}`)
    await loadPanel()
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '添加失败')
  } finally {
    memberAdding.value = false
  }
}

function removeMember(m: GroupMember) {
  if (!selectedId.value) return
  dialog.warning({
    title: '移除成员',
    content: `确定将「${m.name}」移出分组？`,
    positiveText: '移除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await removeGroupMember(selectedId.value!, m.userId)
        message.success('已移除')
        await loadPanel()
        await load()
      } catch (err) {
        message.error(err instanceof ApiError ? err.message : '移除失败')
      }
    },
  })
}

// ---------------------------------------------------------------- 题目

const qModal = ref(false)
const qEditing = ref<QuizQuestion | null>(null)
const qForm = ref({
  question: '', category: '物理', difficulty: 1,
  options: ['', '', '', ''] as string[], answer: 0, explanation: '',
})
const qSaving = ref(false)

function openQModal(q?: QuizQuestion) {
  qEditing.value = q ?? null
  qForm.value = q
    ? {
        question: q.question, category: q.category, difficulty: q.difficulty,
        options: [...q.options], answer: q.answer, explanation: q.explanation,
      }
    : { question: '', category: '物理', difficulty: 1, options: ['', '', '', ''], answer: 0, explanation: '' }
  qModal.value = true
}

async function saveQuestion() {
  if (!selectedId.value) return
  const f = qForm.value
  if (!f.question.trim()) {
    message.warning('请填写题目')
    return
  }
  if (f.options.some((o) => !o.trim())) {
    message.warning('请填写全部 4 个选项')
    return
  }
  if (!f.explanation.trim()) {
    message.warning('请填写答案解析')
    return
  }
  qSaving.value = true
  try {
    const body: QuestionBody = {
      question: f.question.trim(),
      category: f.category,
      difficulty: f.difficulty,
      options: f.options.map((o) => o.trim()),
      answer: f.answer,
      explanation: f.explanation.trim(),
    }
    if (qEditing.value) {
      await updateGroupQuestion(selectedId.value, qEditing.value.id, body)
      message.success('题目已更新')
    } else {
      await createGroupQuestion(selectedId.value, body)
      message.success('题目已添加')
    }
    qModal.value = false
    await loadPanel()
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '保存失败')
  } finally {
    qSaving.value = false
  }
}

function removeQuestion(q: QuizQuestion) {
  if (!selectedId.value) return
  dialog.warning({
    title: '删除题目',
    content: '确定删除这道题？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteGroupQuestion(selectedId.value!, q.id)
        message.success('题目已删除')
        await loadPanel()
        await load()
      } catch (err) {
        message.error(err instanceof ApiError ? err.message : '删除失败')
      }
    },
  })
}
</script>

<template>
  <n-space vertical size="large">
    <n-card>
      <n-space align="center" justify="space-between" wrap>
        <div>
          <n-text style="font-size: 20px; font-weight: 600;">题库管理</n-text>
          <div style="margin-top: 4px;"><n-text depth="3">按用户组维护闯关题库：配置抽题机制、管理成员与题目。</n-text></div>
        </div>
        <n-button type="primary" @click="openGroupModal()">
          <template #icon><n-icon><add-outline /></n-icon></template>
          新建分组
        </n-button>
      </n-space>
    </n-card>

    <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
      <n-grid-item span="2 m:1">
        <n-card size="small" title="我的分组">
          <template #header-extra>
            <n-text depth="3" style="font-size: 12px;">共 {{ groups.length }} 个</n-text>
          </template>
          <n-spin :show="loading">
            <n-empty v-if="groups.length === 0" description="还没有分组，先新建一个吧" style="padding: 24px 0;" />
            <n-card
              v-for="g in groups"
              :key="g.id"
              size="small"
              class="group-card"
              :class="{ active: g.id === selectedId }"
              @click="selectGroup(g.id)"
            >
              <n-space align="center" justify="space-between">
                <n-space vertical size="small">
                  <n-space align="center" size="small">
                    <n-text strong>{{ g.name }}</n-text>
                    <n-tag size="tiny" :bordered="false" type="info">{{ MODE_LABEL[g.quizMode] }}</n-tag>
                  </n-space>
                  <n-text depth="3" style="font-size: 12px;">👥 {{ g.memberCount }} 人 · 📝 {{ g.questionCount }} 题</n-text>
                  <n-text v-if="g.description" depth="3" style="font-size: 12px;">{{ g.description }}</n-text>
                </n-space>
                <n-space>
                  <n-button size="tiny" quaternary @click.stop="openGroupModal(g)">
                    <template #icon><n-icon><create-outline /></n-icon></template>
                  </n-button>
                  <n-button size="tiny" quaternary type="error" @click.stop="removeGroup(g)">
                    <template #icon><n-icon><trash-outline /></n-icon></template>
                  </n-button>
                </n-space>
              </n-space>
            </n-card>
          </n-spin>
        </n-card>
      </n-grid-item>

      <n-grid-item span="2 m:1">
        <n-card size="small" :title="selected ? selected.name : '分组管理'">
          <template #header-extra v-if="selected">
            <n-tag size="small" :bordered="false" type="info">{{ MODE_LABEL[selected.quizMode] }}</n-tag>
          </template>
          <n-empty v-if="!selected" description="在左侧选择一个分组开始管理" style="padding: 40px 0;" />
          <n-spin v-else :show="panelLoading">
            <n-tabs type="line" animated>
              <n-tab-pane name="members" tab="成员管理">
                <n-space justify="space-between" align="center" style="margin-bottom: 10px;">
                  <n-text depth="3" style="font-size: 12px;">共 {{ members.length }} 人</n-text>
                  <n-button size="small" type="primary" ghost @click="openMemberModal">
                    <template #icon><n-icon><add-outline /></n-icon></template>
                    添加成员
                  </n-button>
                </n-space>
                <n-empty v-if="members.length === 0" description="暂无成员" style="padding: 16px 0;" />
                <div v-for="m in members" :key="m.id" class="member-row">
                  <n-avatar round size="small" :style="{ backgroundColor: m.role === 'teacher' ? '#f0a020' : '#18a058' }">
                    {{ m.name.slice(0, 1) }}
                  </n-avatar>
                  <div class="member-info">
                    <n-text strong style="font-size: 13px;">{{ m.name }}</n-text>
                    <n-text depth="3" style="font-size: 12px;">@{{ m.username }}</n-text>
                  </div>
                  <n-tag size="tiny" :type="m.role === 'teacher' ? 'warning' : 'success'" :bordered="false">
                    {{ m.role === 'teacher' ? '负责老师' : '学生' }}
                  </n-tag>
                  <n-button size="tiny" quaternary type="error" @click="removeMember(m)">
                    <template #icon><n-icon><close-outline /></n-icon></template>
                  </n-button>
                </div>
              </n-tab-pane>

              <n-tab-pane name="questions" tab="题库管理">
                <n-space justify="space-between" align="center" style="margin-bottom: 10px;">
                  <n-text depth="3" style="font-size: 12px;">共 {{ questions.length }} 题</n-text>
                  <n-button size="small" type="primary" ghost @click="openQModal()">
                    <template #icon><n-icon><add-outline /></n-icon></template>
                    新增题目
                  </n-button>
                </n-space>
                <n-empty v-if="questions.length === 0" description="还没有题目，学生玩不到哦" style="padding: 16px 0;" />
                <n-card v-for="q in questions" :key="q.id" size="small" :bordered="false" class="q-card">
                  <n-space align="center" justify="space-between" wrap>
                    <n-space align="center" size="small" style="flex: 1; min-width: 0;">
                      <n-tag size="tiny" :bordered="false" type="primary">{{ q.category }}</n-tag>
                      <n-text strong style="font-size: 13px;">{{ q.question }}</n-text>
                      <n-text depth="3" style="font-size: 12px;">{{ '★'.repeat(q.difficulty) }}</n-text>
                    </n-space>
                    <n-space>
                      <n-button size="tiny" quaternary @click="openQModal(q)">
                        <template #icon><n-icon><create-outline /></n-icon></template>
                      </n-button>
                      <n-button size="tiny" quaternary type="error" @click="removeQuestion(q)">
                        <template #icon><n-icon><trash-outline /></n-icon></template>
                      </n-button>
                    </n-space>
                  </n-space>
                  <n-text depth="3" style="font-size: 12px; display: block; margin-top: 4px;">
                    {{ q.options.map((o, i) => `${LETTERS[i]}. ${o}`).join('　') }}
                  </n-text>
                  <n-text style="font-size: 12px; display: block; margin-top: 6px; color: #18a058;">
                    ✅ {{ q.options[q.answer] }} — {{ q.explanation }}
                  </n-text>
                </n-card>
              </n-tab-pane>
            </n-tabs>
          </n-spin>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-modal
      :show="groupModal"
      preset="card"
      :title="groupEditing ? '编辑分组' : '新建分组'"
      style="width: 480px;"
      @update:show="(v: boolean) => { if (!v) groupModal = false }"
    >
      <n-space vertical size="medium">
        <n-input v-model:value="groupForm.name" placeholder="组名称（如：火星能源课题小组）" :maxlength="50" show-count />
        <n-input v-model:value="groupForm.description" placeholder="组描述（可选）" :maxlength="200" show-count />
        <div>
          <n-text depth="3" style="font-size: 13px; display: block; margin-bottom: 6px;">抽题机制</n-text>
          <n-radio-group v-model:value="groupForm.quizMode">
            <n-space>
              <n-radio-button value="group">只用组内</n-radio-button>
              <n-radio-button value="fallback">组内为空回退公共</n-radio-button>
              <n-radio-button value="mixed">组内+公共混合</n-radio-button>
            </n-space>
          </n-radio-group>
        </div>
        <n-space justify="end">
          <n-button @click="groupModal = false">取消</n-button>
          <n-button type="primary" :loading="groupSaving" @click="saveGroup">保存</n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal
      :show="memberModal"
      preset="card"
      title="添加成员"
      style="width: 480px;"
      @update:show="(v: boolean) => { if (!v) memberModal = false }"
    >
      <n-space vertical size="medium">
        <n-space align="center" wrap>
          <n-radio-group v-model:value="memberRole">
            <n-radio-button value="member">学生</n-radio-button>
            <n-radio-button value="teacher">负责老师</n-radio-button>
          </n-radio-group>
          <n-input v-model:value="memberKeyword" placeholder="按用户名/姓名搜索" clearable style="flex: 1; min-width: 160px;" @keydown.enter="search" />
          <n-button :loading="memberSearching" @click="search">
            <template #icon><n-icon><search-outline /></n-icon></template>
          </n-button>
        </n-space>
        <div class="member-results">
          <div v-for="u in memberResults" :key="u.id" class="member-row">
            <n-avatar round size="small" :style="{ backgroundColor: u.role === 'teacher' ? '#f0a020' : '#18a058' }">
              {{ u.name.slice(0, 1) }}
            </n-avatar>
            <div class="member-info">
              <n-text strong style="font-size: 13px;">{{ u.name }}</n-text>
              <n-text depth="3" style="font-size: 12px;">@{{ u.username }} · {{ u.role === 'teacher' ? '老师' : '学生' }}</n-text>
            </div>
            <n-button size="tiny" type="primary" ghost :disabled="memberIds.has(u.id)" @click="addMember(u)">
              {{ memberIds.has(u.id) ? '已在组内' : '添加' }}
            </n-button>
          </div>
          <n-empty v-if="memberResults.length === 0" description="没有匹配的用户" style="padding: 16px 0;" />
        </div>
      </n-space>
    </n-modal>

    <n-modal
      :show="qModal"
      preset="card"
      :title="qEditing ? '编辑题目' : '新增题目'"
      style="width: 560px;"
      @update:show="(v: boolean) => { if (!v) qModal = false }"
    >
      <n-space vertical size="medium">
        <n-input v-model:value="qForm.question" type="textarea" :rows="2" placeholder="题目内容" :maxlength="200" show-count />
        <n-space align="center">
          <n-select v-model:value="qForm.category" :options="CATEGORIES.map((c) => ({ label: c, value: c }))" style="width: 120px;" />
          <n-text depth="3" style="font-size: 13px;">难度</n-text>
          <n-input-number v-model:value="qForm.difficulty" :min="1" :max="3" style="width: 90px;" />
        </n-space>
        <div v-for="i in 4" :key="i" class="option-input-row">
          <n-text style="font-size: 13px; font-weight: 700; width: 22px;">{{ LETTERS[i - 1] }}</n-text>
          <n-input v-model:value="qForm.options[i - 1]" :placeholder="`选项 ${LETTERS[i - 1]}`" />
          <n-radio-group v-model:value="qForm.answer">
            <n-radio :value="i - 1">正确</n-radio>
          </n-radio-group>
        </div>
        <n-input v-model:value="qForm.explanation" type="textarea" :rows="2" placeholder="答案解析（正误原因，学生答完会看到）" />
        <n-space justify="end">
          <n-button @click="qModal = false">取消</n-button>
          <n-button type="primary" :loading="qSaving" @click="saveQuestion">保存</n-button>
        </n-space>
      </n-space>
    </n-modal>
  </n-space>
</template>

<style scoped>
.group-card {
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.group-card.active {
  border-color: #18a058 !important;
  box-shadow: 0 2px 10px rgba(24, 160, 88, 0.25);
}

.member-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px dashed rgba(128, 128, 128, 0.2);
}

.member-row:last-child {
  border-bottom: none;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-results {
  max-height: 320px;
  overflow-y: auto;
}

.q-card {
  margin-bottom: 10px;
  background: rgba(128, 128, 128, 0.04);
}

.option-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
