<script setup lang="ts">
import { ref } from 'vue'
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
  remove: [id: string]
}>()

const COLORS = ['#fde68a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#ddd6fe']

const dragPos = ref<{ id: string; x: number; y: number } | null>(null)
const editingId = ref<string | null>(null)
const editingText = ref('')
const dragOffset = ref({ dx: 0, dy: 0 })

const posOf = (note: StickyNote) =>
  dragPos.value?.id === note.id ? dragPos.value : { x: note.x, y: note.y }

function onPointerDown(e: PointerEvent, note: StickyNote) {
  if (!props.editable) return
  const rect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect()
  dragOffset.value = { dx: e.clientX - rect.left - note.x, dy: e.clientY - rect.top - note.y }
  dragPos.value = { id: note.id, x: note.x, y: note.y }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragPos.value) return
  const rect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect()
  dragPos.value = {
    id: dragPos.value.id,
    x: Math.max(0, Math.min(e.clientX - rect.left - dragOffset.value.dx, rect.width - 180)),
    y: Math.max(0, Math.min(e.clientY - rect.top - dragOffset.value.dy, rect.height - 120)),
  }
}

function onPointerUp() {
  if (dragPos.value) {
    emit('update', dragPos.value.id, { x: dragPos.value.x, y: dragPos.value.y })
    dragPos.value = null
  }
}

function startEdit(note: StickyNote) {
  if (!props.editable) return
  editingId.value = note.id
  editingText.value = note.content
}

function commitEdit() {
  if (editingId.value) {
    emit('update', editingId.value, { content: editingText.value })
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
</script>

<template>
  <div class="notes">
    <n-space align="center" justify="space-between" style="margin-bottom: 10px;">
      <n-text depth="3" style="font-size: 12px;">便签记录灵感 · 拖拽移动 · 双击编辑</n-text>
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
        @pointerdown="onPointerDown($event, note)"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
      >
        <div v-if="editable" class="note-actions">
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

.note-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  min-height: 18px;
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
