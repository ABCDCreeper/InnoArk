<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NCard, NGrid, NGridItem, NButton, NTag, NSpace, NText, NInput, NEmpty, NIcon, NSpin,
} from 'naive-ui'
import { OpenOutline, SearchOutline } from '@vicons/ionicons5'
import { fetchResources } from '../api/resource'
import type { Resource } from '../api/types'

const categories = ['全部', '物理', '工程', '编程', '艺术', '生物', '综合']
const category = ref('全部')
const keyword = ref('')
const resources = ref<Resource[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await fetchResources({
      category: category.value === '全部' ? undefined : category.value,
      keyword: keyword.value.trim() || undefined,
    })
    resources.value = res.items
  } finally {
    loading.value = false
  }
}

onMounted(load)

function selectCategory(value: string) {
  category.value = value
  load()
}
</script>

<template>
  <n-space vertical size="large">
    <n-card size="small">
      <n-space align="center" justify="space-between" wrap>
        <n-space align="center" size="small" wrap>
          <n-text strong>分类：</n-text>
          <n-tag
            v-for="c in categories"
            :key="c"
            size="medium"
            :type="category === c ? 'primary' : 'default'"
            :bordered="category === c"
            checkable
            :checked="category === c"
            style="cursor: pointer;"
            @click="selectCategory(c)"
          >
            {{ c }}
          </n-tag>
        </n-space>
        <n-input v-model:value="keyword" placeholder="搜索资源、标签" clearable style="width: 260px;" @keydown.enter="load">
          <template #prefix><n-icon><search-outline /></n-icon></template>
        </n-input>
      </n-space>
    </n-card>

    <n-spin :show="loading">
      <n-empty v-if="!loading && resources.length === 0" description="没有找到相关资源" />
      <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <n-grid-item v-for="r in resources" :key="r.id" span="4 s:2 l:1">
          <n-card size="small" hoverable style="height: 100%; display: flex; flex-direction: column;">
            <n-space vertical>
              <n-space align="center" justify="space-between">
                <n-text strong style="font-size: 14px;">{{ r.title }}</n-text>
                <n-tag size="small" :bordered="false" type="info">{{ r.category }}</n-tag>
              </n-space>
              <n-text depth="3" style="font-size: 13px; line-height: 1.6; flex: 1;">{{ r.description }}</n-text>
              <n-space size="small">
                <n-tag v-for="t in r.tags" :key="t" size="small" :bordered="false">{{ t }}</n-tag>
              </n-space>
              <n-button size="small" type="primary" tag="a" :href="r.url" target="_blank" rel="noopener">
                <template #icon><n-icon><open-outline /></n-icon></template>
                打开资源
              </n-button>
            </n-space>
          </n-card>
        </n-grid-item>
      </n-grid>
    </n-spin>
  </n-space>
</template>
