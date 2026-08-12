<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { NButton, NSpace, NModal, NInput, NIcon, NEmpty, NText } from 'naive-ui'
import { AddOutline, CreateOutline, TrashOutline, RemoveOutline, RefreshOutline } from '@vicons/ionicons5'
import type { MindNode } from '../api/types'

const props = defineProps<{
  nodes: MindNode[]
  editable: boolean
}>()

const emit = defineEmits<{
  create: [parentId: string | null, label: string]
  update: [id: string, label: string]
  remove: [id: string]
}>()

const LEVEL_GAP = 220
const NODE_H = 34
const LEAF_GAP = 46
const PAD_X = 24

const layout = computed(() => {
  const byParent = new Map<string, MindNode[]>()
  for (const n of props.nodes) {
    const key = n.parentId ?? ''
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(n)
  }
  const pos = new Map<string, { x: number; y: number }>()
  let leafCursor = 0
  let maxDepth = 0
  const build = (node: MindNode, depth: number) => {
    maxDepth = Math.max(maxDepth, depth)
    const children = byParent.get(node.id) ?? []
    children.forEach((c) => build(c, depth + 1))
    let y: number
    if (children.length === 0) {
      y = leafCursor
      leafCursor += 1
    } else {
      const ys = children.map((c) => pos.get(c.id)!.y)
      y = (Math.min(...ys) + Math.max(...ys)) / 2
    }
    pos.set(node.id, { x: depth * LEVEL_GAP + PAD_X, y })
  }
  ;(byParent.get('') ?? []).forEach((root) => build(root, 0))
  return { pos, leafCount: Math.max(leafCursor, 1), maxDepth }
})

const yOf = (id: string) => layout.value.pos.get(id)!.y * LEAF_GAP + 30

const nodeWidth = (label: string) => Math.min(Math.max(label.length * 15 + 28, 64), 260)
const svgWidth = computed(() => layout.value.maxDepth * LEVEL_GAP + PAD_X + 320)
const svgHeight = computed(() => layout.value.leafCount * LEAF_GAP + 40)

const paths = computed(() => {
  const { pos } = layout.value
  const out: string[] = []
  for (const n of props.nodes) {
    const p = pos.get(n.id)!
    for (const c of props.nodes.filter((x) => x.parentId === n.id)) {
      const cp = pos.get(c.id)!
      const x1 = p.x + nodeWidth(n.label)
      const y1 = yOf(n.id) + NODE_H / 2
      const x2 = cp.x
      const y2 = yOf(c.id) + NODE_H / 2
      const mx = (x1 + x2) / 2
      out.push(`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`)
    }
  }
  return out
})

const selectedId = ref<string | null>(null)
const selected = computed(() => props.nodes.find((n) => n.id === selectedId.value) ?? null)

const modal = ref<'add' | 'rename' | null>(null)
const inputValue = ref('')

function openAdd() {
  inputValue.value = ''
  modal.value = 'add'
}

function openRename() {
  if (!selected.value) return
  inputValue.value = selected.value.label
  modal.value = 'rename'
}

function onDblClick(node: MindNode) {
  if (dragMoved || !props.editable) return
  selectedId.value = node.id
  openRename()
}

function confirmModal() {
  const label = inputValue.value.trim()
  if (!label || !modal.value) return
  if (modal.value === 'add') {
    emit('create', selectedId.value, label)
  } else if (selectedId.value) {
    emit('update', selectedId.value, label)
  }
  modal.value = null
}

function confirmRemove() {
  if (selectedId.value) {
    emit('remove', selectedId.value)
    selectedId.value = null
  }
}

const posOf = (id: string) => layout.value.pos.get(id)!

const viewportRef = ref<HTMLDivElement | null>(null)
const pan = ref({ x: 0, y: 0 })
const zoom = ref(1)
const ZOOM_MIN = 0.4
const ZOOM_MAX = 2.5

let dragStart: { x: number; y: number } | null = null
let dragMoved = false

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  dragStart = { x: e.clientX, y: e.clientY }
  dragMoved = false
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!dragStart) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  if (Math.hypot(dx, dy) > 3) dragMoved = true
  if (dragMoved) {
    pan.value = { x: pan.value.x + dx, y: pan.value.y + dy }
    dragStart = { x: e.clientX, y: e.clientY }
  }
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  dragStart = null
}

onBeforeUnmount(onPointerUp)

function onWheel(e: WheelEvent) {
  const factor = Math.exp(-e.deltaY * 0.0015)
  setZoom(zoom.value * factor, e.clientX, e.clientY)
}

function setZoom(next: number, sx?: number, sy?: number) {
  const rect = viewportRef.value?.getBoundingClientRect()
  if (!rect) return
  const mx = sx === undefined ? rect.width / 2 : sx - rect.left
  const my = sy === undefined ? rect.height / 2 : sy - rect.top
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next))
  pan.value = {
    x: mx - ((mx - pan.value.x) * clamped) / zoom.value,
    y: my - ((my - pan.value.y) * clamped) / zoom.value,
  }
  zoom.value = clamped
}

function resetView() {
  pan.value = { x: 0, y: 0 }
  zoom.value = 1
}

function selectNode(id: string) {
  if (dragMoved) return
  selectedId.value = id
}
</script>

<template>
  <div class="mindmap">
    <n-space align="center" justify="space-between" style="margin-bottom: 10px;">
      <n-text depth="3" style="font-size: 12px;">{{ editable ? '拖拽平移 · 滚轮缩放 · 双击节点重命名' : '拖拽平移 · 滚轮缩放 · 只读模式' }}</n-text>
      <n-space v-if="editable">
        <n-button v-if="!selectedId" size="small" @click="openAdd">
          <template #icon><n-icon><add-outline /></n-icon></template>
          添加根节点
        </n-button>
        <template v-else>
          <n-button size="small" @click="openAdd">
            <template #icon><n-icon><add-outline /></n-icon></template>
            添加子节点
          </n-button>
          <n-button size="small" @click="openRename">
            <template #icon><n-icon><create-outline /></n-icon></template>
            重命名
          </n-button>
          <n-button size="small" type="error" ghost @click="confirmRemove">
            <template #icon><n-icon><trash-outline /></n-icon></template>
            删除（含子节点）
          </n-button>
        </template>
      </n-space>
    </n-space>

    <n-empty v-if="nodes.length === 0" description="暂无节点" style="padding: 40px 0;" />

    <div v-else ref="viewportRef" class="map-viewport" @pointerdown="onPointerDown" @wheel.prevent="onWheel">
      <div class="map-canvas" :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }">
        <svg :width="svgWidth" :height="svgHeight">
          <path v-for="(p, i) in paths" :key="`p${i}`" :d="p" fill="none" stroke="rgba(128,128,128,0.45)" stroke-width="1.5" />
          <g
            v-for="node in nodes"
            :key="node.id"
            :transform="`translate(${posOf(node.id).x} ${yOf(node.id)})`"
            style="cursor: pointer;"
            @click="selectNode(node.id)"
            @dblclick="onDblClick(node)"
          >
            <rect
              :width="nodeWidth(node.label)"
              :height="NODE_H"
              rx="7"
              :fill="selectedId === node.id ? 'rgba(24,160,88,0.15)' : 'rgba(128,128,128,0.10)'"
              :stroke="selectedId === node.id ? '#18a058' : 'rgba(128,128,128,0.35)'"
              stroke-width="1.5"
            />
            <text
              :x="nodeWidth(node.label) / 2"
              :y="NODE_H / 2 + 5"
              text-anchor="middle"
              style="fill: var(--n-text-color); font-size: 13px;"
            >
              {{ node.label }}
            </text>
          </g>
        </svg>
      </div>
      <div class="zoom-controls" @pointerdown.stop>
        <n-button size="tiny" quaternary @click="setZoom(zoom * 1.25)">
          <template #icon><n-icon><add-outline /></n-icon></template>
        </n-button>
        <n-button size="tiny" quaternary @click="setZoom(zoom / 1.25)">
          <template #icon><n-icon><remove-outline /></n-icon></template>
        </n-button>
        <n-button size="tiny" quaternary @click="resetView">
          <template #icon><n-icon><refresh-outline /></n-icon></template>
        </n-button>
        <n-text depth="3" style="font-size: 11px; align-self: center; padding: 0 4px;">{{ Math.round(zoom * 100) }}%</n-text>
      </div>
    </div>

    <n-modal :show="modal !== null" preset="card" :title="modal === 'add' ? (selectedId ? '添加子节点' : '添加根节点') : '重命名节点'" style="width: 380px;" @update:show="(v: boolean) => { if (!v) modal = null }">
      <n-input v-model:value="inputValue" placeholder="节点内容" @keydown.enter="confirmModal" />
      <n-space justify="end" style="margin-top: 16px;">
        <n-button @click="modal = null">取消</n-button>
        <n-button type="primary" :disabled="!inputValue.trim()" @click="confirmModal">确定</n-button>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped>
.mindmap {
  width: 100%;
}

.map-viewport {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 8px;
  max-height: 520px;
  background: rgba(128, 128, 128, 0.03);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.map-viewport:active {
  cursor: grabbing;
}

.map-canvas {
  transform-origin: 0 0;
}

.zoom-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 6px;
  background: var(--n-color, rgba(255, 255, 255, 0.85));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

svg {
  display: block;
}
</style>
