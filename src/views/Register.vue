<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NForm, NFormItem, NInput, NButton, NSpace, NRadioGroup, NRadioButton, NText, NA, useMessage } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { ApiError } from '../api/request'
import type { Role } from '../api/types'

const router = useRouter()
const message = useMessage()
const auth = useAuthStore()

const formValue = ref({
  name: '',
  username: '',
  password: '',
  confirm: '',
  role: 'student' as Role,
})

const rules = {
  name: { required: true, message: '请输入姓名', trigger: 'blur' },
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少 3 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 个字符', trigger: 'blur' },
  ],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string) => value === formValue.value.password,
      message: '两次输入的密码不一致',
      trigger: 'blur',
    },
  ],
}

const loading = ref(false)

const handleRegister = async () => {
  loading.value = true
  try {
    await auth.register({
      name: formValue.value.name.trim(),
      username: formValue.value.username.trim(),
      password: formValue.value.password,
      role: formValue.value.role,
    })
    message.success('注册成功，已自动登录')
    router.push('/')
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : '注册失败，请稍后重试'
    message.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-container">
    <n-card title="注册 InnoArk" subtitle="智能跨学科学习平台" class="register-card" size="large">
      <n-form :model="formValue" :rules="rules" label-placement="top" @submit.prevent="handleRegister">
        <n-form-item path="name" label="姓名">
          <n-input v-model:value="formValue.name" placeholder="请输入真实姓名" />
        </n-form-item>
        <n-form-item path="username" label="用户名">
          <n-input v-model:value="formValue.username" placeholder="至少 3 个字符，用于登录" />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input v-model:value="formValue.password" type="password" show-password-on="mousedown" placeholder="至少 6 个字符" />
        </n-form-item>
        <n-form-item path="confirm" label="确认密码">
          <n-input v-model:value="formValue.confirm" type="password" show-password-on="mousedown" placeholder="再次输入密码" />
        </n-form-item>
        <n-form-item label="身份">
          <n-radio-group v-model:value="formValue.role" style="width: 100%;">
            <n-radio-button value="student" style="flex: 1;">学生</n-radio-button>
            <n-radio-button value="teacher" style="flex: 1;">教师</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-button type="primary" attr-type="submit" size="large" block :loading="loading" style="margin-top: 8px;">
          注册
        </n-button>
      </n-form>
      <n-space justify="center" style="margin-top: 12px;">
        <n-text depth="3" style="font-size: 13px;">
          已有账号？
          <n-a @click="router.push('/login')">去登录</n-a>
        </n-text>
      </n-space>
    </n-card>
  </div>
</template>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.register-card {
  width: 420px;
  max-width: 92vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

@media (max-width: 768px) {
  .register-container {
    background: linear-gradient(160deg, #1a1a2e 0%, #16213e 100%);
  }
  .register-card {
    width: 100%;
    max-width: 100vw;
    margin: 0 12px;
    box-shadow: none;
  }
}
</style>
