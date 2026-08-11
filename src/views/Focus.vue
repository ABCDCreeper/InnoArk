<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NGrid, NGridItem, NSpace, NText, NStatistic, useMessage } from 'naive-ui'
import Pomodoro from '../components/Pomodoro.vue'
import CanvasWhiteboard from '../components/CanvasWhiteboard.vue'
import WeeklyBar from '../components/WeeklyBar.vue'
import { createFocusSession, fetchFocusStats } from '../api/focus'
import type { FocusStats } from '../api/types'

const message = useMessage()
const stats = ref<FocusStats | null>(null)

async function load() {
  stats.value = await fetchFocusStats(7)
}

onMounted(load)

async function onComplete(mode: 'focus' | 'break', minutes: number) {
  try {
    await createFocusSession(minutes, mode)
    if (mode === 'focus') {
      message.success('完成一个番茄钟，休息一下吧！')
    } else {
      message.info('休息结束，继续加油！')
    }
    await load()
  } catch {
    // 上报失败不影响本地计时
  }
}
</script>

<template>
  <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
    <n-grid-item span="2 l:1">
      <n-space vertical size="large">
        <n-card title="番茄钟">
          <template #header-extra>
            <n-text depth="3" style="font-size: 12px;">25 分钟专注 + 5 分钟休息</n-text>
          </template>
          <pomodoro @complete="onComplete" />
        </n-card>
        <n-card title="专注统计">
          <n-space align="center" justify="space-around" wrap style="margin-bottom: 16px;">
            <n-statistic label="今日专注" :value="stats?.today.count ?? 0" suffix="次" />
            <n-statistic label="今日时长" :value="stats?.today.minutes ?? 0" suffix="分钟" />
            <n-statistic label="近 7 天总时长" :value="(stats?.week ?? []).reduce((s, d) => s + d.minutes, 0)" suffix="分钟" />
          </n-space>
          <weekly-bar :data="stats?.week ?? []" />
        </n-card>
      </n-space>
    </n-grid-item>
    <n-grid-item span="2 l:1">
      <n-card title="在线白板">
        <template #header-extra>
          <n-text depth="3" style="font-size: 12px;">随手画下思路，保持专注</n-text>
        </template>
        <canvas-whiteboard />
      </n-card>
    </n-grid-item>
  </n-grid>
</template>
