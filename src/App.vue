<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NGlobalStyle, darkTheme, useOsTheme, NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'
import { useSettingsStore } from './stores/settings'

const osTheme = useOsTheme()
const settings = useSettingsStore()
const theme = computed(() => {
  if (settings.theme === 'dark') return darkTheme
  if (settings.theme === 'light') return null
  return osTheme.value === 'dark' ? darkTheme : null
})

const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '12px',
    borderRadiusSmall: '8px',
  },
  Card: { borderRadius: '16px' },
  Modal: { borderRadius: '16px' },
  Drawer: { borderRadius: '16px' },
  Dialog: { borderRadius: '16px' },
  Popover: { borderRadius: '12px' },
  Tag: { borderRadius: '8px' },
}
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
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
.member-avatars {
  display: flex;
  align-items: center;
}

.member-avatars .n-avatar {
  margin-left: -8px;
}

.member-avatars .n-avatar:first-child {
  margin-left: 0;
}

@media (max-width: 768px) {
  body { font-size: 14px; }
  .n-card { border-radius: 12px !important; }
  .n-layout-content { padding: 12px !important; }
  .n-statistic { --n-label-font-size: 12px !important; --n-value-font-size: 20px !important; }
}
</style>
