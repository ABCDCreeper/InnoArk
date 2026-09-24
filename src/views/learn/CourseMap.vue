<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NIcon, NProgress, NText } from 'naive-ui'
import { ArrowBackOutline, CheckmarkOutline } from '@vicons/ionicons5'
import type { LearnCourse } from '../../data/courses'
import { useLearnStore } from '../../stores/learn'

const props = defineProps<{ course: LearnCourse }>()
const emit = defineEmits<{ exit: []; start: [index: number] }>()

const learn = useLearnStore()

const stats = computed(() => learn.courseStats(props.course))

type NodeState = 'done' | 'current' | 'locked'

function stateOf(index: number): NodeState {
  const record = learn.recordOf(props.course.lessons[index].id)
  if (record) return 'done'
  if (learn.isLessonUnlocked(props.course, index)) return 'current'
  return 'locked'
}

const nodes = computed(() => props.course.lessons.map((lesson, index) => ({
  lesson,
  index,
  state: stateOf(index),
  record: learn.recordOf(lesson.id),
})))

function clickNode(index: number) {
  const state = stateOf(index)
  if (state === 'locked') return
  emit('start', index)
}
</script>

<template>
  <div class="map-wrap">
    <n-card size="small">
      <div class="map-header">
        <n-button quaternary circle size="small" @click="emit('exit')">
          <template #icon><n-icon><arrow-back-outline /></n-icon></template>
        </n-button>
        <div class="map-title">
          <span class="map-name">{{ course.emoji }} {{ course.title }}</span>
          <n-text depth="3" style="font-size: 12px;">{{ course.desc }}</n-text>
        </div>
        <div v-if="stats.crowned" class="crown">👑</div>
      </div>

      <div class="map-progress">
        <n-progress
          type="line"
          :percentage="Math.round((stats.done / stats.total) * 100)"
          :height="10"
          :color="course.color"
          :rail-color="`${course.color}22`"
          :show-indicator="false"
        />
        <n-text depth="3" style="font-size: 12px;">
          ⭐ {{ stats.stars }} / {{ stats.maxStars }} · 已完成 {{ stats.done }} / {{ stats.total }} 课时
        </n-text>
      </div>

      <div v-if="stats.crowned" class="crown-banner">
        🎉👑🎊 全部课时 3 星达成，这门课被你点亮啦！
      </div>

      <div class="map-path">
        <div class="path-line" :style="{ background: `repeating-linear-gradient(to bottom, ${course.color}55 0 8px, transparent 8px 16px)` }"></div>
        <div
          v-for="node in nodes"
          :key="node.lesson.id"
          class="node-row"
          :class="{ odd: node.index % 2 === 1 }"
        >
          <button
            class="node"
            :class="[node.state, { bounce: node.state === 'current' }]"
            :style="node.state === 'locked' ? {} : { borderColor: course.color, background: node.state === 'done' ? course.color : '' }"
            :disabled="node.state === 'locked'"
            @click="clickNode(node.index)"
          >
            <template v-if="node.state === 'done'">
              <n-icon size="20" color="#fff"><checkmark-outline /></n-icon>
            </template>
            <template v-else-if="node.state === 'current'">▶</template>
            <template v-else>🔒</template>
          </button>
          <div class="node-info">
            <span class="node-name" :class="{ locked: node.state === 'locked' }">{{ node.lesson.title }}</span>
            <span class="node-stars">
              <template v-if="node.record">⭐ x{{ node.record.stars }}</template>
              <template v-else-if="node.state === 'current'">开始挑战！</template>
              <template v-else>完成上一课解锁</template>
            </span>
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.map-wrap {
  max-width: 780px;
  margin: 0 auto;
}

.map-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.map-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.map-name {
  font-size: 18px;
  font-weight: 800;
}

.crown {
  font-size: 30px;
  animation: pop 0.5s ease;
}

.map-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 14px 0 4px;
}

.crown-banner {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(240, 160, 32, 0.12);
  border: 1px solid rgba(240, 160, 32, 0.4);
  text-align: center;
  font-weight: 700;
  font-size: 14px;
}

.map-path {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 28px 0 12px;
}

.path-line {
  position: absolute;
  left: 47px;
  top: 20px;
  bottom: 20px;
  width: 6px;
  border-radius: 3px;
  opacity: 0.5;
}

.node-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 0;
  transition: transform 0.2s ease;
  z-index: 1;
}

.node-row.odd {
  transform: translateX(120px);
}

.node {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: 3px solid rgba(128, 128, 128, 0.3);
  background: rgba(128, 128, 128, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.node:hover:not(:disabled) {
  transform: scale(1.08);
}

.node:disabled {
  cursor: default;
}

.node.current {
  background: #fff;
  animation: pulse 1.6s ease infinite;
}

.node.bounce {
  animation: bounce-in 0.5s ease, pulse 1.6s ease 0.5s infinite;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-name {
  font-weight: 700;
  font-size: 15px;
}

.node-name.locked {
  opacity: 0.5;
}

.node-stars {
  font-size: 12px;
  opacity: 0.75;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(24, 160, 88, 0.45);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(24, 160, 88, 0);
  }
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  60% {
    transform: scale(1.12);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.35); }
  100% { transform: scale(1); }
}
</style>
