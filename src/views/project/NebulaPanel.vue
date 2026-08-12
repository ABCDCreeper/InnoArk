<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { NCard, NSpace, useMessage } from 'naive-ui'
import MindMap from '../../components/MindMap.vue'
import StickyNotes from '../../components/StickyNotes.vue'
import {
  fetchMindNodes, fetchNotes, createMindNode, updateMindNode, deleteMindNode,
  createNote, updateNote, deleteNote,
} from '../../api/kanban'
import { ApiError } from '../../api/request'
import type { MindNode, StickyNote } from '../../api/types'

const props = defineProps<{
  projectId: string
  editable: boolean
}>()

const message = useMessage()
const mindNodes = ref<MindNode[]>([])
const notes = ref<StickyNote[]>([])

let timer: ReturnType<typeof setInterval> | null = null

async function refresh() {
  try {
    const [nodes, noteList] = await Promise.all([
      fetchMindNodes(props.projectId),
      fetchNotes(props.projectId),
    ])
    mindNodes.value = nodes.items
    notes.value = noteList.items
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '同步失败')
  }
}

onMounted(() => {
  refresh()
  timer = setInterval(refresh, 5000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

async function run(action: () => Promise<unknown>) {
  try {
    await action()
    await refresh()
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '操作失败')
  }
}

const onNodeCreate = (parentId: string | null, label: string) =>
  run(() => createMindNode(props.projectId, parentId, label))
const onNodeUpdate = (id: string, label: string) => run(() => updateMindNode(id, label))
const onNodeRemove = (id: string) => run(() => deleteMindNode(id))

const onNoteCreate = (body: Partial<StickyNote>) => run(() => createNote(props.projectId, body))
const onNoteUpdate = (id: string, body: Partial<StickyNote>) => run(() => updateNote(id, body))
const onNoteRemove = (id: string) => run(() => deleteNote(id))
</script>

<template>
  <n-space vertical size="large">
    <n-card title="思维导图" size="small">
      <mind-map :nodes="mindNodes" :editable="editable" @create="onNodeCreate" @update="onNodeUpdate" @remove="onNodeRemove" />
    </n-card>
    <n-card title="灵感便签" size="small">
      <sticky-notes :notes="notes" :editable="editable" @create="onNoteCreate" @update="onNoteUpdate" @remove="onNoteRemove" />
    </n-card>
  </n-space>
</template>
