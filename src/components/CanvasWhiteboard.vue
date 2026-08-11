<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { NButton, NSpace, NColorPicker, NSlider, NIcon, NPopover } from 'naive-ui'
import { BrushOutline, TrashOutline } from '@vicons/ionicons5'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const color = ref('#18a058')
const lineWidth = ref(4)
const erasing = ref(false)

let ctx: CanvasRenderingContext2D | null = null
let drawing = false

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.parentElement!.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  ctx = canvas.getContext('2d')
  ctx!.scale(dpr, dpr)
  ctx!.lineCap = 'round'
  ctx!.lineJoin = 'round'
}

function getPos(e: PointerEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onDown(e: PointerEvent) {
  if (!ctx) return
  drawing = true
  const { x, y } = getPos(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
  canvasRef.value!.setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!drawing || !ctx) return
  const { x, y } = getPos(e)
  ctx.strokeStyle = erasing.value ? '#ffffff' : color.value
  ctx.lineWidth = erasing.value ? lineWidth.value * 4 : lineWidth.value
  ctx.lineTo(x, y)
  ctx.stroke()
}

function onUp() {
  drawing = false
}

function clearBoard() {
  const canvas = canvasRef.value
  ctx?.clearRect(0, 0, canvas!.width, canvas!.height)
}

function onResize() {
  const canvas = canvasRef.value
  const snapshot = canvas?.toDataURL()
  resize()
  if (snapshot && canvas && canvas.width > 0) {
    const img = new Image()
    img.onload = () => ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
    img.src = snapshot
  }
}

onMounted(() => {
  resize()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="whiteboard">
    <n-space align="center" justify="space-between" style="margin-bottom: 10px;">
      <n-space align="center">
        <n-color-picker v-model:value="color" :show-alpha="false" size="small" />
        <n-popover trigger="hover">
          <template #trigger>
            <n-icon size="20" :color="erasing ? '#d03050' : undefined"><brush-outline /></n-icon>
          </template>
          <span>橡皮擦（白色笔迹）</span>
        </n-popover>
        <n-button size="tiny" :type="erasing ? 'error' : 'default'" @click="erasing = !erasing">
          {{ erasing ? '退出橡皮' : '橡皮擦' }}
        </n-button>
        <n-slider v-model:value="lineWidth" :min="1" :max="12" style="width: 120px;" />
        <n-text depth="3" style="font-size: 12px;">粗细 {{ lineWidth }}</n-text>
      </n-space>
      <n-button size="tiny" @click="clearBoard">
        <template #icon><n-icon><trash-outline /></n-icon></template>
        清空
      </n-button>
    </n-space>
    <div class="board-area">
      <canvas ref="canvasRef" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointerleave="onUp" />
    </div>
  </div>
</template>

<style scoped>
.whiteboard {
  width: 100%;
}

.board-area {
  width: 100%;
  height: 420px;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  touch-action: none;
}

canvas {
  display: block;
  cursor: crosshair;
}
</style>
