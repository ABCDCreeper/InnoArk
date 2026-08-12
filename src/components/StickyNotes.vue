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

const dragPos = ref<{ id: string; x: number; y: number } | null>(null)
const editingId = ref<string | null>(null)
const editingText = ref('')
const dragOffset = ref({ dx: 0, dy: 0 })

let dragStart: { x: number; y: number } | null = null
let dragging = false

const posOf = (note: StickyNote) =>
  dragPos.value?.id === note.id ? dragPos.value : { x: note.x, y: note.y }

function onPointerDown(e: PointerEvent, note: StickyNote) {
  if (!props.editable) return
  const rect = (e.currentTarget as HTMLElement).closest('.notes-area')!.getBoundingClientRect()
  dragOffset.value = { dx: e.clientX - rect.left - note.x, dy: e.clientY - rect.top - note.y }
  dragPos.value = { id: note.id, x: note.x, y: note.y }
  dragStart = { x: e.clientX, y: e.clientY }
  dragging = false
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!dragPos.value || !dragStart) return
  if (!dragging) {
    if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) < 3) return
    dragging = true
  }
  const rect = (document.querySelector('.notes-area') as HTMLElement).getBoundingClientRect()
  dragPos.value = {
    id: dragPos.value.id,
    x: Math.max(0, Math.min(e.clientX - rect.left - dragOffset.value.dx, rect.width - 180)),
    y: Math.max(0, Math.min(e.clientY - rect.top - dragOffset.value.dy, rect.height - 120)),
  }
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (dragPos.value && dragging) {
    emit('update', dragPos.value.id, { x: dragPos.value.x, y: dragPos.value.y })
  }
  dragStart = null
  dragPos.value = null
  dragging = false
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
        :style="{ left: `${posOf(note).x}px`, top: `${posOf(note).y}px`, background: note.color }"
      >
        <div
          v-if="editable"
          class="note-header"
          @pointerdown="onPointerDown($event, note)"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
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
  width: 180px;
  min-height: 110px;
  border-radius: 4px;
  padding: 10px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  cursor: grab;
  touch-action: none;
  display: flex;
  flex-direction: column;
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
