<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NCard, NRadioGroup, NRadioButton, NSpin, NText, NEmpty, useMessage } from 'naive-ui'
import { fetchLeaderboard } from '../api/leaderboard'
import { ApiError } from '../api/request'
import { useAuthStore } from '../stores/auth'
import type { LeaderboardItem } from '../api/types'

const auth = useAuthStore()
const message = useMessage()

const scope = ref<'total' | 'week'>('total')
const items = ref<LeaderboardItem[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await fetchLeaderboard(scope.value)
    items.value = res.items
  } catch (err) {
    message.error(err instanceof ApiError ? err.message : '排行榜加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function switchScope(v: 'total' | 'week') {
  scope.value = v
  load()
}

const podium = computed(() => items.value.slice(0, 3))
const rest = computed(() => items.value.slice(3))
const PODIUM_EMOJI = ['🥇', '🥈', '🥉']
const PODIUM_ORDER = [1, 0, 2] // 展示顺序：亚军 / 冠军 / 季军

function isMe(item: LeaderboardItem) {
  return item.userId === auth.user?.id
}

function myRank() {
  const idx = items.value.findIndex(isMe)
  return idx === -1 ? null : idx + 1
}
const myItem = computed(() => items.value.find(isMe) ?? null)
</script>

<template>
  <div class="leaderboard-wrap">
    <n-card size="small">
      <div class="lb-head">
        <div>
          <div class="lb-title">🏆 学霸排行榜</div>
          <n-text depth="3" style="font-size: 12px;">
            综合积分 = 最佳闯关得分×0.5 + 专注分钟 + 打卡×2
            <template v-if="myRank()">· 你当前第 {{ myRank() }} 名</template>
          </n-text>
        </div>
        <n-radio-group :value="scope" size="small" @update:value="switchScope">
          <n-radio-button value="total">总榜</n-radio-button>
          <n-radio-button value="week">本周</n-radio-button>
        </n-radio-group>
      </div>
    </n-card>

    <n-spin :show="loading">
      <n-empty v-if="!loading && items.length === 0" description="还没有上榜数据，先去闯关或专注一波" style="padding: 60px 0;" />

      <template v-else>
        <div v-if="podium.length > 0" class="podium-row">
          <div
            v-for="rank in PODIUM_ORDER.filter((r) => podium[r])"
            :key="rank"
            class="podium-card"
            :class="[`rank-${rank}`, { me: isMe(podium[rank]) }]"
          >
            <div class="podium-emoji">{{ PODIUM_EMOJI[rank] }}</div>
            <div class="podium-name">{{ podium[rank].name }}</div>
            <div class="podium-score">{{ podium[rank].score }} 分</div>
            <div class="podium-sub">⚔️ {{ podium[rank].quizBest }} 分 · 🍅 {{ podium[rank].focusMinutes }} 分钟</div>
          </div>
        </div>

        <n-card v-if="rest.length > 0" size="small" class="rest-card">
          <div v-for="(item, i) in rest" :key="item.userId" class="lb-row" :class="{ me: isMe(item) }">
            <span class="lb-rank">{{ i + 4 }}</span>
            <span class="lb-name">
              {{ item.name }}
              <n-text v-if="isMe(item)" type="primary" style="font-size: 12px;">（我）</n-text>
            </span>
            <span class="lb-stat">⚔️ 最佳 {{ item.quizBest }} 分</span>
            <span class="lb-stat">🍅 {{ item.focusMinutes }} 分钟</span>
            <span class="lb-stat">✅ {{ item.checkinCount }} 次打卡</span>
            <span class="lb-score">{{ item.score }} 分</span>
          </div>
        </n-card>
      </template>
    </n-spin>
    <div v-if="myItem && myRank() && myRank()! > 3" class="my-rank-bar">
      <span class="my-rank-label">我的名次</span>
      <span class="my-rank-num">第 {{ myRank() }} 名</span>
      <span class="my-rank-divider">·</span>
      <span class="my-rank-score">{{ myItem.score }} 分</span>
      <span class="my-rank-sub">⚔️ {{ myItem.quizBest }} · 🍅 {{ myItem.focusMinutes }} · ✅ {{ myItem.checkinCount }}</span>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-wrap {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.lb-title {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 2px;
}

.podium-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 14px;
}

.podium-card {
  flex: 1;
  max-width: 220px;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border-radius: 14px;
  padding: 18px 14px 14px;
  text-align: center;
  background: rgba(128, 128, 128, 0.05);
}

.podium-card.rank-0 {
  padding-bottom: 40px;
  border-color: rgba(240, 160, 32, 0.55);
  background: linear-gradient(180deg, rgba(240, 160, 32, 0.14), rgba(240, 160, 32, 0.04));
}

.podium-card.rank-1,
.podium-card.rank-2 {
  padding-bottom: 26px;
}

.podium-card.me {
  outline: 2px solid #18a058;
  outline-offset: -2px;
}

.podium-emoji {
  font-size: 34px;
}

.podium-name {
  font-weight: 800;
  font-size: 16px;
  margin: 4px 0 2px;
}

.podium-score {
  font-size: 22px;
  font-weight: 800;
  color: #f0a020;
}

.podium-sub {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 4px;
}

.rest-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13px;
}

.lb-row.me {
  background: rgba(24, 160, 88, 0.1);
}

.lb-rank {
  width: 24px;
  text-align: center;
  font-weight: 700;
  opacity: 0.75;
}

.lb-name {
  flex: 1;
  font-weight: 600;
}

.lb-stat {
  opacity: 0.75;
  white-space: nowrap;
}

.lb-score {
  width: 70px;
  text-align: right;
  font-weight: 800;
  color: #f0a020;
  white-space: nowrap;
}

.my-rank-bar {
  position: fixed;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-radius: 999px;
  background: linear-gradient(135deg, #18a058, #2080f0);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 6px 24px rgba(24, 160, 88, 0.4);
  animation: rank-slide-up 0.35s ease;
}

.my-rank-label {
  font-size: 11px;
  opacity: 0.85;
  font-weight: 400;
}

.my-rank-num {
  font-size: 15px;
  font-weight: 800;
}

.my-rank-divider {
  opacity: 0.5;
}

.my-rank-score {
  font-size: 15px;
  font-weight: 800;
  color: #fff3b0;
}

.my-rank-sub {
  font-size: 11px;
  opacity: 0.85;
  font-weight: 400;
}

@keyframes rank-slide-up {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@media (max-width: 640px) {
  .my-rank-sub {
    display: none;
  }

  .my-rank-bar {
    bottom: 80px;
    padding: 8px 16px;
  }

  .lb-stat {
    display: none;
  }
}
</style>
