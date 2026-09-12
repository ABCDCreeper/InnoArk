<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { NButton, NSpace, NSlider, NIcon, NTooltip, NText, useDialog, useMessage } from 'naive-ui'
import { BrushOutline, TrashOutline, ArrowUndoOutline, ArrowRedoOutline, DownloadOutline, SaveOutline } from '@vicons/ionicons5'
import { useAuthStore } from '../stores/auth'

const COLORS = ['#18a058', '#2080f0', '#d03050', '#f0a020', '#8a2be2', '#333333']
const WIDTH = 1200
const HEIGHT = 800
const canvasRef = ref<HTMLCanvasElement | null>(null)
const color = ref(COLORS[0])
const lineWidth = ref(4)
const erasing = ref(false)
const restoring = ref(false)
const saved = ref(true)
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])
const auth = useAuthStore()
const dialog = useDialog()
const message = useMessage()
let drawing: number | null = null
let storageKey = ''
let restoreVersion = 0
let previous = { x: 0, y: 0 }

function snapshot() { return canvasRef.value!.toDataURL('image/png') }
function remember() {
  undoStack.value = [...undoStack.value.slice(-15), snapshot()]
  redoStack.value = []
}
function save() {
  if (!storageKey || restoring.value) return
  try {
    localStorage.setItem(storageKey, snapshot())
    saved.value = true
  } catch {
    saved.value = false
    message.error('本机保存失败，请导出图片保留笔迹')
  }
}
function clearCanvas() { canvasRef.value?.getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT) }
async function restore(data: string) {
  const version = ++restoreVersion
  restoring.value = true
  try {
    const img = new Image()
    img.src = data
    await img.decode()
    if (version !== restoreVersion || !canvasRef.value) return
    clearCanvas()
    canvasRef.value.getContext('2d')!.drawImage(img, 0, 0, WIDTH, HEIGHT)
  } catch {
    if (version === restoreVersion) message.error('白板记录无法读取')
  } finally {
    if (version === restoreVersion) restoring.value = false
  }
}
async function loadUser() {
  ++restoreVersion
  drawing = null
  restoring.value = false
  undoStack.value = []
  redoStack.value = []
  saved.value = true
  clearCanvas()
  storageKey = auth.user ? `innoark_whiteboard_v1_${auth.user.id}` : ''
  try {
    const data = storageKey ? localStorage.getItem(storageKey) : null
    if (data) await restore(data)
  } catch { message.error('无法读取本机白板记录') }
}
function position(e: PointerEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  return { x: (e.clientX - rect.left) * WIDTH / rect.width, y: (e.clientY - rect.top) * HEIGHT / rect.height }
}
function draw(from: { x: number; y: number }, to: { x: number; y: number }) {
  const ctx = canvasRef.value!.getContext('2d')!
  ctx.globalCompositeOperation = erasing.value ? 'destination-out' : 'source-over'
  ctx.strokeStyle = color.value
  ctx.fillStyle = color.value
  ctx.lineWidth = erasing.value ? lineWidth.value * 4 : lineWidth.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (from.x === to.x && from.y === to.y) {
    ctx.arc(to.x, to.y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
function onDown(e: PointerEvent) {
  if (restoring.value || drawing !== null || e.button !== 0) return
  remember()
  drawing = e.pointerId
  previous = position(e)
  draw(previous, previous)
  saved.value = false
  canvasRef.value!.setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (drawing !== e.pointerId) return
  const point = position(e)
  draw(previous, point)
  previous = point
}
function onUp(e?: PointerEvent) {
  if (drawing === null || (e && e.pointerId !== drawing)) return
  drawing = null
  save()
}
async function undo(redo = false) {
  if (restoring.value || drawing !== null) return
  const source = redo ? redoStack : undoStack
  const target = redo ? undoStack : redoStack
  const data = source.value.pop()
  if (!data) return
  target.value.push(snapshot())
  await restore(data)
  save()
}
function clearBoard() {
  dialog.warning({ title: '清空白板', content: '确定清空当前白板？清空后仍可撤销。', positiveText: '清空', negativeText: '取消',
    onPositiveClick: () => { remember(); clearCanvas(); save() } })
}
function download() {
  const exported = document.createElement('canvas')
  exported.width = WIDTH
  exported.height = HEIGHT
  const ctx = exported.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.drawImage(canvasRef.value!, 0, 0)
  const a = document.createElement('a')
  a.download = 'innoark-whiteboard.png'
  a.href = exported.toDataURL('image/png')
  a.click()
}
onMounted(() => { loadUser(); window.addEventListener('pagehide', flush) })
function flush() { if (!saved.value) save() }
watch(() => auth.user?.id, loadUser)
onBeforeUnmount(() => { flush(); ++restoreVersion; window.removeEventListener('pagehide', flush) })
</script>

<template>
  <div class="whiteboard">
    <n-space align="center" wrap class="toolbar">
      <button v-for="c in COLORS" :key="c" type="button" class="swatch" :aria-label="`画笔颜色 ${c}`"
        :aria-pressed="color === c" :style="{ background: c, outline: color === c ? '2px solid #666' : 'none' }" @click="color = c; erasing = false" />
      <n-tooltip><template #trigger><n-button circle size="small" aria-label="橡皮擦" :type="erasing ? 'primary' : 'default'" @click="erasing = !erasing"><template #icon><n-icon><brush-outline /></n-icon></template></n-button></template>橡皮擦</n-tooltip>
      <n-slider v-model:value="lineWidth" :min="1" :max="12" style="width: 95px" aria-label="画笔粗细" />
      <n-text depth="3">{{ lineWidth }}</n-text>
    </n-space>
    <n-space align="center" justify="space-between" wrap class="toolbar">
      <n-space size="small">
        <n-tooltip><template #trigger><n-button circle size="small" aria-label="撤销" :disabled="!undoStack.length || restoring" @click="undo()"><template #icon><n-icon><arrow-undo-outline /></n-icon></template></n-button></template>撤销</n-tooltip>
        <n-tooltip><template #trigger><n-button circle size="small" aria-label="重做" :disabled="!redoStack.length || restoring" @click="undo(true)"><template #icon><n-icon><arrow-redo-outline /></n-icon></template></n-button></template>重做</n-tooltip>
        <n-tooltip><template #trigger><n-button circle size="small" aria-label="保存白板" :disabled="restoring" @click="save"><template #icon><n-icon><save-outline /></n-icon></template></n-button></template>保存白板</n-tooltip>
        <n-tooltip><template #trigger><n-button circle size="small" aria-label="导出白板" :disabled="restoring" @click="download"><template #icon><n-icon><download-outline /></n-icon></template></n-button></template>导出 PNG</n-tooltip>
        <n-tooltip><template #trigger><n-button circle size="small" aria-label="清空白板" :disabled="restoring" @click="clearBoard"><template #icon><n-icon><trash-outline /></n-icon></template></n-button></template>清空白板</n-tooltip>
      </n-space>
      <n-text depth="3" style="font-size: 12px">{{ restoring ? '恢复中' : saved ? '本机已保存' : '尚未保存' }}</n-text>
    </n-space>
    <div class="board-area">
      <canvas ref="canvasRef" :width="WIDTH" :height="HEIGHT" aria-label="科创白板" @pointerdown="onDown" @pointermove="onMove"
        @pointerup="onUp" @pointercancel="onUp" @lostpointercapture="onUp" />
    </div>
  </div>
</template>

<style scoped>
.whiteboard { width: 100%; min-width: 0; }
.toolbar { margin-bottom: 10px; }
.swatch { width: 22px; height: 22px; padding: 0; border: 2px solid #fff; border-radius: 50%; cursor: pointer; outline-offset: 1px; }
.board-area { width: 100%; aspect-ratio: 3 / 2; border: 1px solid #8885; border-radius: 8px; overflow: hidden; background: #fff; touch-action: none; }
canvas { display: block; width: 100%; height: 100%; cursor: crosshair; }
</style>
