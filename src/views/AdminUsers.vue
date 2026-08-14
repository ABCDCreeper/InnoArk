<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NCard, NButton, NSpace, NText, NTag, NInput, NModal, NSelect, NAvatar, NEmpty, NIcon, NSpin, useMessage, useDialog,
} from 'naive-ui'
import { AddOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import { fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../api/admin'
import { ROLE_RANK, useAuthStore } from '../stores/auth'
import { ApiError } from '../api/request'
import type { UserBrief } from '../api/types'

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
const loading = ref(true)
const keyword = ref('')
const roleFilter = ref<string | null>(null)

const manageableRoles = computed(() =>
  ALL_ROLES.filter((r) => ROLE_RANK[r as keyof typeof ROLE_RANK] < ROLE_RANK[auth.user?.role ?? 'student']),
)
const roleOptions = computed(() => manageableRoles.value.map((r) => ({ label: ROLE_LABEL[r], value: r })))
const filtered = computed(() =>
  roleFilter.value ? users.value.filter((u) => u.role === roleFilter.value) : users.value,
)

async function load() {
  loading.value = true
  try {
    const res = await fetchAdminUsers(keyword.value.trim() || undefined)
    users.value = res.items
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)

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
        <n-button type="primary" @click="openCreate">
          <template #icon><n-icon><add-outline /></n-icon></template>
          新建账号
        </n-button>
      </n-space>
    </n-card>

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
