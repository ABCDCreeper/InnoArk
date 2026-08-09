<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NGlobalStyle, darkTheme, useOsTheme, NMessageProvider } from 'naive-ui'
import Layout from './components/Layout.vue'

const osTheme = useOsTheme()
const theme = computed(() => (osTheme.value === 'dark' ? darkTheme : null))
</script>

<template>
  <n-config-provider :theme="theme">
    <n-global-style />
    <n-message-provider>
      <Layout />
    </n-message-provider>
  </n-config-provider>
</template>
