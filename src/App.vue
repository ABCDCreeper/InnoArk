<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NGlobalStyle, darkTheme, useOsTheme, NMessageProvider } from 'naive-ui'

const osTheme = useOsTheme()
const theme = computed(() => (osTheme.value === 'dark' ? darkTheme : null))
</script>

<template>
  <n-config-provider :theme="theme">
    <n-global-style />
    <n-message-provider>
      <router-view />
    </n-message-provider>
  </n-config-provider>
</template>
