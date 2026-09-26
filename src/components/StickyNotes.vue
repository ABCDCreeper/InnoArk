<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { NButton, NIcon, NPopover, NSpace, NText } from 'naive-ui'
import { AddOutline, CloseOutline } from '@vicons/ionicons5'
import type { StickyNote } from '../api/types'

const props = defineProps<{
  notes: StickyNote[]
  editable: boolean
}>()

const emit = defineEmits<{
  create: [body: Partial<StickyNote>]
  update: [id: string, body: Partial<StickyNote>]
  save: [id: string, body: Partial<StickyNote>]
  remove: [id: string]
}>()

const COLORS = ['#fde68a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#ddd6fe']

const editingId = ref<string | null>(null)
const editingText = ref('')
const dragOffset = ref({ dx: 0, dy: 0 })

// 拖拽期间用普通变量追踪，不走 Vue 响应式
let dragId: string | null = null
let dragX = 0
let dragY = 0
let dragEl: HTMLElement | null = null
let dragStart: { x: number; y: number } | null = null
let dragging = false
let cachedRect: DOMRect | null = null

const posOf = (note: StickyNote) => {
  if (dragId === note.id) return { x: dragX, y: dragY }
  return { x: note.x, y: note.y }
}

function onPointerDown(e: PointerEvent, note: StickyNote) {
  if (!props.editable) return
  e.preventDefault()
  const header = e.currentTarget as HTMLElement
  const areaEl = header.closest('.notes-area') as HTMLElement | null
  const noteEl = header.closest('.note') as HTMLElement | null
  if (!areaEl || !noteEl) return
  const rect = areaEl.getBoundingClientRect()
  cachedRect = rect
  dragEl = noteEl
  dragOffset.value = { dx: e.clientX - rect.left - note.x, dy: e.clientY - rect.top - note.y }
  dragId = note.id
  dragX = note.x
  dragY = note.y
  dragStart = { x: e.clientX, y: e.clientY }
  dragging = false
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!dragId || !dragStart || !cachedRect || !dragEl) return
  if (!dragging) {
    if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) < 2) return
    dragging = true
  }
  const rect = cachedRect
  dragX = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.value.dx, rect.width - 180))
  dragY = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.value.dy, rect.height - 120))
  // 拖拽中直接写 DOM，避免每帧触发响应式重排
  dragEl.style.transform = `translate(${dragX}px, ${dragY}px)`
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (dragId && dragging) {
    emit('update', dragId, { x: dragX, y: dragY })
  }
  dragId = null
  dragEl = null
  dragStart = null
  dragging = false
  cachedRect = null
}

function startEdit(note: StickyNote) {
  if (!props.editable) return
  editingId.value = note.id
  editingText.value = note.content
}

function commitEdit() {
  if (editingId.value) {
    emit('save', editingId.value, { content: editingText.value })
  }
  editingId.value = null
}

function addNote() {
  const count = props.notes.length
  emit('create', {
    content: '新灵感…双击编辑',
    color: COLORS[count % COLORS.length],
    x: 20 + ((count % 5) * 30),
    y: 20 + ((count % 4) * 40),
  })
}

onBeforeUnmount(onPointerUp)
</script>

<template>
  <div class="notes">
    <n-space align="center" justify="space-between" style="margin-bottom: 10px;">
      <n-text depth="3" style="font-size: 12px;">{{ editable ? '便签记录灵感 · 拖拽移动 · 双击编辑' : '只读模式' }}</n-text>
      <n-button v-if="editable" size="small" @click="addNote">
        <template #icon><n-icon><add-outline /></n-icon></template>
        添加便签
      </n-button>
    </n-space>

    <div class="notes-area">
      <div
        v-for="note in notes"
        :key="note.id"
        class="note"
        :style="{ transform: `translate(${posOf(note).x}px, ${posOf(note).y}px)`, background: note.color }"
      >
        <div
          v-if="editable"
          class="note-header"
          @pointerdown="onPointerDown($event, note)"
        >
          <n-popover trigger="hover">
            <template #trigger>
              <span class="dot" :style="{ background: note.color }" />
            </template>
            <n-space size="small">
              <span
                v-for="c in COLORS"
                :key="c"
                class="dot"
                :style="{ background: c, cursor: 'pointer' }"
                @click="emit('update', note.id, { color: c })"
              />
            </n-space>
          </n-popover>
          <span class="note-hint">{{ editingId === note.id ? '编辑中' : '双击编辑' }}</span>
          <n-icon size="14" class="close" @click="emit('remove', note.id)"><close-outline /></n-icon>
        </div>
        <textarea
          v-if="editingId === note.id"
          v-model="editingText"
          class="note-text"
          rows="3"
          @blur="commitEdit"
          @keydown.enter.prevent="commitEdit"
        />
        <p v-else class="note-text" @dblclick="startEdit(note)">{{ note.content }}</p>
        <n-button
          v-if="editingId === note.id"
          size="tiny"
          type="primary"
          style="margin-top: 6px; align-self: flex-end;"
          @click="commitEdit"
        >
          保存
        </n-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notes {
  width: 100%;
}

.notes-area {
  position: relative;
  height: 480px;
  border: 1px dashed rgba(128, 128, 128, 0.35);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(128, 128, 128, 0.03);
}

.note {
  position: absolute;
  top: 0;
  left: 0;
  width: 180px;
  min-height: 110px;
  border-radius: 6px;
  padding: 10px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: grab;
  touch-action: none;
  display: flex;
  flex-direction: column;
  will-change: transform;
}

.note:active {
  cursor: grabbing;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.note-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.note-hint {
  flex: 1;
  text-align: right;
  font-size: 11px;
  color: rgba(51, 51, 51, 0.55);
  white-space: nowrap;
  overflow: hidden;
}

.dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.close {
  cursor: pointer;
  opacity: 0.6;
}

.close:hover {
  opacity: 1;
}

.note-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1;
  outline: none;
  border: none;
  background: transparent;
  resize: none;
  font-family: inherit;
}
</style>
