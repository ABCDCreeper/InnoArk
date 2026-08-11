<script setup lang="ts">
import { computed } from 'vue'
import { NText } from 'naive-ui'

const props = defineProps<{
  data: Array<{ date: string; count: number; minutes: number }>
}>()

const max = computed(() => Math.max(...props.data.map((d) => d.minutes), 1))

function barHeight(minutes: number) {
  return Math.max((minutes / max.value) * 100, minutes > 0 ? 6 : 2)
}

function shortDate(date: string) {
  const [, m, d] = date.split('-')
  return `${Number(m)}/${Number(d)}`
}
</script>

<template>
  <div class="weekly">
    <div class="bars">
      <div v-for="item in data" :key="item.date" class="bar-col">
        <n-text depth="3" style="font-size: 11px;">{{ item.minutes > 0 ? item.minutes : '' }}</n-text>
        <div class="bar-track">
          <div class="bar" :style="{ height: `${barHeight(item.minutes)}%` }" />
        </div>
        <n-text depth="3" style="font-size: 11px;">{{ shortDate(item.date) }}</n-text>
      </div>
    </div>
  </div>
</template>

<style scoped>
.weekly {
  width: 100%;
}

.bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  height: 140px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  height: 100%;
}

.bar-track {
  width: 100%;
  max-width: 36px;
  flex: 1;
  display: flex;
  align-items: flex-end;
  background: rgba(128, 128, 128, 0.1);
  border-radius: 6px;
  overflow: hidden;
  min-height: 30px;
}

.bar {
  width: 100%;
  background: linear-gradient(180deg, #36ad6a, #18a058);
  border-radius: 6px;
  transition: height 0.3s ease;
}
</style>
