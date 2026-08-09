<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NCard, NForm, NFormItem, NInput, NButton, NSpace, useMessage } from 'naive-ui'

const router = useRouter()
const route = useRoute()
const message = useMessage()

const formValue = ref({
  username: '',
  password: ''
})

const rules = {
  username: {
    required: true,
    message: '请输入用户名',
    trigger: 'blur'
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: 'blur'
  }
}

const handleLogin = () => {
  if (formValue.value.username === 'admin' && formValue.value.password === '123456') {
    message.success('登录成功')
    localStorage.setItem('isAuthenticated', 'true')
    
    // Redirect to the originally requested URL, or home
    const redirect = route.query.redirect as string || '/'
    router.push(redirect)
  } else {
    message.error('用户名或密码错误 (提示: admin / 123456)')
  }
}
</script>

<template>
  <div class="login-container">
    <n-card title="智创方舟 - 登录" class="login-card" size="large">
      <n-form :model="formValue" :rules="rules" @submit.prevent="handleLogin">
        <n-form-item path="username" label="用户名">
          <n-input v-model:value="formValue.username" placeholder="请输入用户名 (admin)" @keydown.enter="handleLogin" />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input
            v-model:value="formValue.password"
            type="password"
            show-password-on="mousedown"
            placeholder="请输入密码 (123456)"
            @keydown.enter="handleLogin"
          />
        </n-form-item>
        <n-space justify="center" style="margin-top: 24px;">
          <n-button type="primary" attr-type="submit" size="large" block style="width: 100%;">
            登录
          </n-button>
        </n-space>
      </n-form>
    </n-card>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5; /* Light background to contrast with card */
}

/* In dark mode this will be adapted if Naive UI ConfigProvider is used at root */

.login-card {
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
