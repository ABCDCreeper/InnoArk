<script setup lang="ts">
import { computed, ref } from 'vue'
import { NInput, NButton, NCard, NSpace, NText, NEmpty, NGrid, NGridItem, useMessage } from 'naive-ui'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
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

const previewHtml = computed(() =>
  text.value ? DOMPurify.sanitize(marked.parse(text.value, { async: false }) as string) : '',
)

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
    <template v-if="editable">
      <n-grid :cols="2" :x-gap="16" responsive="screen" item-responsive>
        <n-grid-item span="2 m:1">
          <n-input
            v-model:value="text"
            type="textarea"
            :rows="10"
            maxlength="2000"
            show-count
            placeholder="支持 Markdown 语法，右侧实时预览…"
          />
        </n-grid-item>
        <n-grid-item span="2 m:1">
          <div v-if="previewHtml" class="md-preview" v-html="previewHtml" />
          <div v-else class="md-preview">
            <n-text depth="3" style="font-size: 12px;">预览区域</n-text>
          </div>
        </n-grid-item>
      </n-grid>
      <n-space justify="end" style="margin-top: 12px;">
        <n-button type="primary" size="small" :loading="saving" :disabled="text === description" @click="save">
          保存
        </n-button>
      </n-space>
    </template>
    <div v-else-if="description" class="md-preview" v-html="previewHtml" />
    <n-empty v-else description="暂无简介" />
  </n-card>
</template>

<style scoped>
.md-preview {
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
  min-height: 240px;
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: break-word;
  color: var(--n-text-color);
}

.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3) {
  margin: 12px 0 8px;
  line-height: 1.3;
}

.md-preview :deep(h1) {
  font-size: 20px;
}

.md-preview :deep(h2) {
  font-size: 17px;
}

.md-preview :deep(h3) {
  font-size: 15px;
}

.md-preview :deep(p) {
  margin: 6px 0;
}

.md-preview :deep(ul),
.md-preview :deep(ol) {
  margin: 6px 0;
  padding-left: 22px;
}

.md-preview :deep(code) {
  background: rgba(128, 128, 128, 0.12);
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 12px;
}

.md-preview :deep(pre) {
  background: rgba(128, 128, 128, 0.1);
  border-radius: 10px;
  padding: 8px 10px;
  overflow-x: auto;
}

.md-preview :deep(pre code) {
  background: transparent;
  padding: 0;
}

.md-preview :deep(blockquote) {
  margin: 6px 0;
  padding-left: 10px;
  border-left: 3px solid rgba(128, 128, 128, 0.4);
  color: var(--n-text-color-3);
}

.md-preview :deep(a) {
  color: #18a058;
}

.md-preview :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
}

.md-preview :deep(th),
.md-preview :deep(td) {
  border: 1px solid rgba(128, 128, 128, 0.3);
  padding: 4px 8px;
}

.md-preview :deep(hr) {
  border: none;
  border-top: 1px solid rgba(128, 128, 128, 0.3);
  margin: 12px 0;
}
</style>
