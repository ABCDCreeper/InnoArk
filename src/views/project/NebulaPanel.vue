<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { NCard, NSpace, useDialog, useMessage, useNotification } from 'naive-ui'
import MindMap from '../../components/MindMap.vue'
import StickyNotes from '../../components/StickyNotes.vue'
import {
  fetchMindNodes, fetchNotes, createMindNode, updateMindNode, deleteMindNode,
  createNote, updateNote, deleteNote,
} from '../../api/kanban'
import { fetchProjectRevision } from '../../api/project'
import { ApiError } from '../../api/request'
import type { MindNode, StickyNote } from '../../api/types'

const props = defineProps<{
  projectId: string
  editable: boolean
}>()

const message = useMessage()
const dialog = useDialog()
const notification = useNotification()
const mindNodes = ref<MindNode[]>([])
const notes = ref<StickyNote[]>([])

let timer: ReturnType<typeof setTimeout> | null = null
let disposed = false
let revision = 0
let mutations = 0
let syncFailed = false
let source: EventSource | null = null
let lastRevision = -1

async function refresh() {
  if (disposed || mutations) return
  const currentRevision = ++revision
  try {
    const [nodes, noteList] = await Promise.all([
      fetchMindNodes(props.projectId),
      fetchNotes(props.projectId),
    ])
    if (disposed || mutations || currentRevision !== revision) return
    syncFailed = false
    mindNodes.value = nodes.items
    notes.value = noteList.items
  } catch (err) {
    if (!disposed && currentRevision === revision && !syncFailed) {
      syncFailed = true
      message.error(err instanceof ApiError ? err.message : '同步失败')
    }
  }
}

/** 修订号变化才重新拉取；相同则整轮省掉两次请求与一次渲染 */
async function refreshIfChanged() {
  if (disposed || mutations) return
  try {
    const { revision: current } = await fetchProjectRevision(props.projectId)
    if (disposed || mutations) return
    if (current === lastRevision) return
    lastRevision = current
    await refresh()
  } catch {
    // 网络异常时退回到直接拉取，保持原本的轮询行为
    await refresh()
  }
}

async function poll() {
  await refreshIfChanged()
  if (!disposed && !source) timer = setTimeout(poll, 5000)
}

/**
 * 优先用 SSE 接收变更通知：服务端在修订号变化时推一个事件，客户端随即拉取。
 * 连接失败或环境不支持时自动退回轮询，因此不影响功能可用性。
 */
function connectStream() {
  if (disposed || typeof EventSource === 'undefined') return
  try {
    source = new EventSource(`/api/projects/${props.projectId}/stream`, { withCredentials: true })
  } catch {
    source = null
    return
  }
  source.addEventListener('revision', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data)
      if (data.revision !== lastRevision) {
        lastRevision = data.revision
        void refresh()
      }
    } catch {
      void refresh()
    }
  })
  source.addEventListener('error', () => {
    // EventSource 会自行重连；若彻底断开则回到轮询，避免静默失去同步
    if (source && source.readyState === EventSource.CLOSED) {
      source.close()
      source = null
      if (!disposed && !timer) timer = setTimeout(poll, 5000)
    }
  })
}
onMounted(() => {
  poll()
  connectStream()
})

onBeforeUnmount(() => {
  disposed = true
  ++revision
  if (timer) clearTimeout(timer)
  if (source) {
    source.close()
    source = null
  }
})

async function run(action: () => Promise<unknown>, successMsg?: string) {
  ++mutations
  ++revision
  let success = false
  try {
    await action()
    success = true
    if (!disposed && successMsg) notification.success({ title: successMsg, duration: 3000 })
  } catch (err) {
    if (!disposed) message.error(err instanceof ApiError ? err.message : '操作失败')
  } finally {
    --mutations
    await refresh()
  }
  return success
}

const onNodeCreate = (parentId: string | null, label: string) =>
  run(() => createMindNode(props.projectId, parentId, label))
const onNodeUpdate = (id: string, label: string) => run(() => updateMindNode(id, label))
const onNodeRemove = (id: string) => run(() => deleteMindNode(id))

const onNoteCreate = (body: Partial<StickyNote>) => run(() => createNote(props.projectId, body))
const onNoteUpdate = (id: string, body: Partial<StickyNote>) => run(() => updateNote(id, body))
const onNoteSave = (id: string, body: Partial<StickyNote>) => run(() => updateNote(id, body), '便签内容已保存')
function onNoteRemove(id: string) {
  dialog.warning({ title: '删除便签', content: '确定删除这条灵感便签？', positiveText: '删除', negativeText: '取消',
    onPositiveClick: () => run(() => deleteNote(id)) })
}
</script>

<template>
  <n-space vertical size="large">
    <n-card title="思维导图" size="small">
      <mind-map :nodes="mindNodes" :editable="editable" @create="onNodeCreate" @update="onNodeUpdate" @remove="onNodeRemove" />
    </n-card>
    <n-card title="灵感便签" size="small">
      <sticky-notes :notes="notes" :editable="editable" @create="onNoteCreate" @update="onNoteUpdate" @save="onNoteSave" @remove="onNoteRemove" />
    </n-card>
  </n-space>
</template>
