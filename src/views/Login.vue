<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NCard, NForm, NFormItem, NInput, NButton, NSpace, NText, NA, useMessage } from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { ApiError } from '../api/request'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const auth = useAuthStore()

const formValue = ref({
  username: '',
  password: '',
})

const rules = {
  username: { required: true, message: '请输入用户名', trigger: 'blur' },
  password: { required: true, message: '请输入密码', trigger: 'blur' },
}

const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  try {
    await auth.login(formValue.value.username.trim(), formValue.value.password)
    message.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (err) {
    const msg = err instanceof ApiError ? err.message : '登录失败，请稍后重试'
    message.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <n-card title="智创方舟 InnoArk" subtitle="智能跨学科学习平台" class="login-card" size="large">
      <n-form :model="formValue" :rules="rules" @submit.prevent="handleLogin">
        <n-form-item path="username" label="用户名">
          <n-input v-model:value="formValue.username" placeholder="请输入用户名" @keydown.enter="handleLogin" />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input
            v-model:value="formValue.password"
            type="password"
            show-password-on="mousedown"
            placeholder="请输入密码"
            @keydown.enter="handleLogin"
          />
        </n-form-item>
        <n-button type="primary" attr-type="submit" size="large" block :loading="loading" style="margin-top: 8px;">
          登录
        </n-button>
      </n-form>
      <n-space justify="center" style="margin-top: 12px;">
        <n-text depth="3" style="font-size: 12px;">演示账号：student / teacher / schooladmin / admin / superadmin（密码均 123456）</n-text>
      </n-space>
      <n-space justify="center" style="margin-top: 4px;">
        <n-text depth="3" style="font-size: 13px;">
          没有账号？
          <n-a @click="router.push('/register')">立即注册</n-a>
        </n-text>
      </n-space>
    </n-card>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.login-card {
  width: 420px;
  max-width: 92vw;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

@media (max-width: 768px) {
  .login-container {
    background: linear-gradient(160deg, #1a1a2e 0%, #16213e 100%);
  }
  .login-card {
    width: 100%;
    max-width: 100vw;
    margin: 0 12px;
    box-shadow: none;
  }
}
</style>
