<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NGlobalStyle, darkTheme, useOsTheme, NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui'
import { useSettingsStore } from './stores/settings'

const osTheme = useOsTheme()
const settings = useSettingsStore()
const theme = computed(() => {
  if (settings.theme === 'dark') return darkTheme
  if (settings.theme === 'light') return null
  return osTheme.value === 'dark' ? darkTheme : null
})
</script>

<template>
  <n-config-provider :theme="theme">
    <n-global-style />
    <n-message-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <router-view />
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
@media (max-width: 768px) {
  body { font-size: 14px; }
  .n-card { border-radius: 8px !important; }
  .n-layout-content { padding: 12px !important; }
  .n-statistic { --n-label-font-size: 12px !important; --n-value-font-size: 20px !important; }
}
</style>
