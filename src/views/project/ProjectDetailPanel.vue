<script setup lang="ts">
import { ref } from 'vue'
import { NInput, NButton, NCard, NSpace, NText, NEmpty, useMessage } from 'naive-ui'
import { updateProject } from '../../api/project'
import { ApiError } from '../../api/request'

const props = defineProps<{
  projectId: string
  description: string
  editable: boolean
}>()

const emit = defineEmits<{ saved: [] }>()

const message = useMessage()
const text = ref(props.description)
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    await updateProject(props.projectId, { description: text.value })
    message.success('项目简介已保存')
    emit('saved')
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <n-card title="项目简介" size="small">
    <n-space v-if="editable" vertical size="small">
      <n-input
        v-model:value="text"
        type="textarea"
        :rows="5"
        maxlength="2000"
        show-count
        placeholder="介绍一下项目背景、目标与当前进展…"
      />
      <n-space justify="end">
        <n-button type="primary" size="small" :loading="saving" :disabled="text === description" @click="save">
          保存
        </n-button>
      </n-space>
    </n-space>
    <n-empty v-else-if="!description" description="暂无简介" />
    <n-text v-else style="font-size: 14px; line-height: 1.8; white-space: pre-wrap;">{{ description }}</n-text>
  </n-card>
</template>
