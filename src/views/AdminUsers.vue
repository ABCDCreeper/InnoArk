<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NCard, NButton, NSpace, NText, NTag, NInput, NModal, NSelect, NAvatar, NEmpty, NIcon, NSpin,
  NTabs, NTabPane, NTable, useMessage, useDialog,
} from 'naive-ui'
import { AddOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import {
  fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  fetchAuditLogs, fetchSchools, resetDemoData,
} from '../api/admin'
import { ROLE_RANK, useAuthStore } from '../stores/auth'
import { ApiError } from '../api/request'
import { useAsyncTask } from '../composables/useAsyncTask'
import type { AuditLog, School, UserBrief } from '../api/types'

const message = useMessage()
const dialog = useDialog()
const auth = useAuthStore()

const ROLE_LABEL: Record<string, string> = {
  superadmin: '超级管理员',
  admin: '管理员',
  schooladmin: '校管理员',
  teacher: '教师',
  student: '学生',
}
const ROLE_TAG: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  superadmin: 'error',
  admin: 'warning',
  schooladmin: 'info',
  teacher: 'success',
  student: 'default',
}
const ALL_ROLES = ['superadmin', 'admin', 'schooladmin', 'teacher', 'student']

const users = ref<UserBrief[]>([])
const keyword = ref('')
const roleFilter = ref<string | null>(null)

// 搜索连续触发时只采纳最后一次结果，避免旧响应覆盖新关键词的查询结果
const { loading, run } = useAsyncTask(message, '加载失败')

const manageableRoles = computed(() =>
  ALL_ROLES.filter((r) => ROLE_RANK[r as keyof typeof ROLE_RANK] < ROLE_RANK[auth.user?.role ?? 'student']),
)
const roleOptions = computed(() => manageableRoles.value.map((r) => ({ label: ROLE_LABEL[r], value: r })))
const filtered = computed(() =>
  roleFilter.value ? users.value.filter((u) => u.role === roleFilter.value) : users.value,
)

function load() {
  return run(() => fetchAdminUsers(keyword.value.trim() || undefined), (res) => {
    users.value = res.items
  })
}

const activeTab = ref('users')

onMounted(async () => {
  await load()
  await Promise.all([loadSchools(), loadAudit()])
})

// ---------------------------------------------------------------- 审计日志

const auditLogs = ref<AuditLog[]>([])
const auditLoading = ref(false)
const ACTION_LABEL: Record<string, string> = {
  'user.create': '创建账号',
  'user.rename': '改名',
  'user.reset_password': '重置口令',
  'user.role_change': '调整角色',
  'user.school_change': '调整归属',
  'user.delete': '删除账号',
  'group.delete': '删除分组',
  'group.school_change': '调整分组归属',
  'project.finish': '项目结题',
  'demo.reset': '重置演示数据',
}

async function loadAudit() {
  auditLoading.value = true
  try {
    const res = await fetchAuditLogs(100)
    auditLogs.value = res.items
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '审计日志加载失败')
  } finally {
    auditLoading.value = false
  }
}

// ---------------------------------------------------------------- 学校

const schools = ref<School[]>([])
const schoolOptions = computed(() => schools.value.map((s) => ({ label: s.name, value: s.id })))

async function loadSchools() {
  try {
    schools.value = (await fetchSchools()).items
  } catch {
    // 学校列表取不到时只是少了个可选字段
    schools.value = []
  }
}

async function changeSchool(u: UserBrief, schoolId: string | null) {
  changingId.value = u.id
  try {
    await updateAdminUser(u.id, { schoolId })
    message.success(schoolId ? `${u.name} 已归入所选学校` : `${u.name} 已取消学校归属`)
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '调整失败')
  } finally {
    changingId.value = null
  }
}

// ---------------------------------------------------------------- 重置演示数据

const canResetDemo = computed(() => ROLE_RANK[auth.user?.role ?? 'student'] >= ROLE_RANK.admin)
const resetting = ref(false)

function confirmReset() {
  dialog.error({
    title: '重置为初始演示数据',
    content: '将清空全部账号、项目、任务、批注与成绩，恢复成刚种子的状态。当前登录会失效，需要重新登录。确定继续？',
    positiveText: '重置',
    negativeText: '取消',
    onPositiveClick: async () => {
      resetting.value = true
      try {
        await resetDemoData()
        message.success('已重置为初始演示数据，请重新登录')
        setTimeout(() => {
          localStorage.removeItem('innoark_token')
          localStorage.removeItem('innoark_user')
          location.href = '/login'
        }, 1200)
      } catch (err) {
        message.error(err instanceof ApiError ? err.message : '重置失败')
      } finally {
        resetting.value = false
      }
    },
  })
}

// ---------------------------------------------------------------- 新建账号

const createModal = ref(false)
const createForm = ref({ username: '', password: '', name: '', role: 'teacher' })
const creating = ref(false)

function openCreate() {
  const defaultRole = manageableRoles.value.includes('teacher') ? 'teacher' : manageableRoles.value[0] ?? 'student'
  createForm.value = { username: '', password: '', name: '', role: defaultRole }
  createModal.value = true
}

async function handleCreate() {
  creating.value = true
  try {
    const u = await createAdminUser(createForm.value)
    message.success(`已创建账号 ${u.username}`)
    createModal.value = false
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '创建失败')
  } finally {
    creating.value = false
  }
}

// ---------------------------------------------------------------- 角色调整

const changingId = ref<string | null>(null)

async function changeRole(u: UserBrief, role: string) {
  if (role === u.role) return
  changingId.value = u.id
  try {
    await updateAdminUser(u.id, { role })
    message.success(`${u.name} 已调整为 ${ROLE_LABEL[role]}`)
    await load()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '调整失败')
  } finally {
    changingId.value = null
  }
}

// ---------------------------------------------------------------- 重置密码

const pwdModal = ref(false)
const pwdTarget = ref<UserBrief | null>(null)
const pwdValue = ref('')
const pwdSaving = ref(false)

function openPwd(u: UserBrief) {
  pwdTarget.value = u
  pwdValue.value = ''
  pwdModal.value = true
}

async function handleResetPwd() {
  if (!pwdTarget.value) return
  if (pwdValue.value.length < 6) {
    message.warning('密码至少 6 个字符')
    return
  }
  pwdSaving.value = true
  try {
    await updateAdminUser(pwdTarget.value.id, { password: pwdValue.value })
    message.success(`已重置 ${pwdTarget.value.name} 的密码`)
    pwdModal.value = false
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '重置失败')
  } finally {
    pwdSaving.value = false
  }
}

// ---------------------------------------------------------------- 删除

function removeUser(u: UserBrief) {
  dialog.warning({
    title: '删除账号',
    content: `确定删除「${u.name}」？其成员关系、记录与会话将一并清理。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteAdminUser(u.id)
        message.success('账号已删除')
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
          <n-text style="font-size: 20px; font-weight: 600;">用户管理</n-text>
          <div style="margin-top: 4px;"><n-text depth="3">管理低层级账号：调整角色、重置密码、删除账号。</n-text></div>
        </div>
        <n-space align="center">
          <n-button v-if="canResetDemo" :loading="resetting" @click="confirmReset">重置演示数据</n-button>
          <n-button type="primary" @click="openCreate">
            <template #icon><n-icon><add-outline /></n-icon></template>
            新建账号
          </n-button>
        </n-space>
      </n-space>
    </n-card>

    <n-tabs v-model:value="activeTab" type="line" animated>
    <n-tab-pane name="users" tab="账号管理">
    <n-card>
      <n-space align="center" style="margin-bottom: 14px;" wrap>
        <n-input v-model:value="keyword" placeholder="按用户名/姓名搜索" clearable style="width: 220px;" @keydown.enter="load" />
        <n-button @click="load">
          <template #icon><n-icon><refresh-outline /></n-icon></template>
          搜索
        </n-button>
        <n-select
          v-model:value="roleFilter"
          clearable
          placeholder="全部角色"
          :options="Object.entries(ROLE_LABEL).map(([v, label]) => ({ label, value: v }))"
          style="width: 150px;"
        />
      </n-space>

      <n-spin :show="loading">
        <n-empty v-if="!loading && filtered.length === 0" description="没有匹配的用户" style="padding: 24px 0;" />
        <div v-for="u in filtered" :key="u.id" class="user-row">
          <n-avatar round size="small" :style="{ backgroundColor: u.role === 'superadmin' ? '#d03050' : u.role === 'admin' ? '#f0a020' : u.role === 'schooladmin' ? '#2080f0' : u.role === 'teacher' ? '#18a058' : '#888' }">
            {{ u.name.slice(0, 1) }}
          </n-avatar>
          <div class="user-info">
            <n-text strong style="font-size: 13px;">{{ u.name }}</n-text>
            <n-text depth="3" style="font-size: 12px;">@{{ u.username }}</n-text>
          </div>
          <n-tag size="tiny" :type="ROLE_TAG[u.role]" :bordered="false">{{ ROLE_LABEL[u.role] }}</n-tag>
          <n-select
            :value="u.role"
            size="small"
            :options="roleOptions"
            :disabled="changingId === u.id"
            style="width: 130px;"
            @update:value="(v: string) => changeRole(u, v)"
          />
          <n-select
            v-if="schools.length && u.role !== 'superadmin'"
            :value="u.schoolId ?? null"
            size="small"
            clearable
            placeholder="未归属学校"
            :options="schoolOptions"
            :disabled="changingId === u.id"
            style="width: 150px;"
            @update:value="(v: string | null) => changeSchool(u, v)"
          />
          <n-button size="tiny" quaternary @click="openPwd(u)">
            <template #icon><n-icon><refresh-outline /></n-icon></template>
            重置密码
          </n-button>
          <n-button size="tiny" quaternary type="error" @click="removeUser(u)">
            <template #icon><n-icon><trash-outline /></n-icon></template>
          </n-button>
        </div>
      </n-spin>
    </n-card>

    <n-modal
      :show="createModal"
      preset="card"
      title="新建账号"
      style="width: 440px;"
      @update:show="(v: boolean) => { if (!v) createModal = false }"
    >
      <n-space vertical size="medium">
        <n-input v-model:value="createForm.name" placeholder="姓名" :maxlength="20" show-count />
        <n-input v-model:value="createForm.username" placeholder="用户名（至少 3 个字符，用于登录）" />
        <n-input v-model:value="createForm.password" type="password" show-password-on="mousedown" placeholder="初始密码（至少 6 个字符）" />
        <n-select v-model:value="createForm.role" :options="roleOptions" />
        <n-space justify="end">
          <n-button @click="createModal = false">取消</n-button>
          <n-button type="primary" :loading="creating" :disabled="!createForm.name.trim() || createForm.username.trim().length < 3 || createForm.password.length < 6" @click="handleCreate">
            创建
          </n-button>
        </n-space>
      </n-space>
    </n-modal>

    <n-modal
      :show="pwdModal"
      preset="card"
      title="重置密码"
      style="width: 400px;"
      @update:show="(v: boolean) => { if (!v) pwdModal = false }"
    >
      <n-space vertical size="medium">
        <n-text depth="3" style="font-size: 13px;">为「{{ pwdTarget?.name }}」设置新密码</n-text>
        <n-input v-model:value="pwdValue" type="password" show-password-on="mousedown" placeholder="新密码（至少 6 个字符）" @keydown.enter="handleResetPwd" />
        <n-space justify="end">
          <n-button @click="pwdModal = false">取消</n-button>
          <n-button type="primary" :loading="pwdSaving" :disabled="pwdValue.length < 6" @click="handleResetPwd">确定</n-button>
        </n-space>
      </n-space>
    </n-modal>
    </n-tab-pane>

    <n-tab-pane name="audit" tab="操作审计">
      <n-card>
        <template #header>
          <n-space align="center" justify="space-between">
            <n-text strong>管理操作审计</n-text>
            <n-button size="small" :loading="auditLoading" @click="loadAudit">
              <template #icon><n-icon><refresh-outline /></n-icon></template>
              刷新
            </n-button>
          </n-space>
        </template>
        <n-text depth="3" style="font-size: 12px; display: block; margin-bottom: 12px;">
          记录谁在何时对哪个对象做了什么；平台管理员可见全部，校管理员只见自己的操作。
        </n-text>
        <n-empty v-if="!auditLogs.length" description="暂无操作记录" />
        <n-table v-else :bordered="false" size="small">
          <thead>
            <tr><th>时间</th><th>操作者</th><th>动作</th><th>详情</th></tr>
          </thead>
          <tbody>
            <tr v-for="log in auditLogs" :key="log.id">
              <td>{{ new Date(log.createdAt).toLocaleString() }}</td>
              <td>{{ log.actorName ?? log.actorId }}</td>
              <td><n-tag size="tiny" :bordered="false">{{ ACTION_LABEL[log.action] ?? log.action }}</n-tag></td>
              <td>{{ log.detail }}</td>
            </tr>
          </tbody>
        </n-table>
      </n-card>
    </n-tab-pane>
    </n-tabs>
  </n-space>
</template>

<style scoped>
.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px dashed rgba(128, 128, 128, 0.2);
}

.user-row:last-child {
  border-bottom: none;
}

.user-info {
  flex: 1;
  min-width: 0;
}
</style>
