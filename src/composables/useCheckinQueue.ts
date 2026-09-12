import { ref } from 'vue'
import { createCheckin } from '../api/resource'
import { ApiError } from '../api/request'

const STORAGE_KEY = 'innoark_pending_checkins'

interface PendingCheckin {
  projectId: string
  content: string
  /** 幂等键：同一 clientId 在服务端只会入库一次，重试不会产生重复打卡 */
  clientId: string
  createdAt: string
}

function load(): PendingCheckin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => x && x.projectId && x.clientId) : []
  } catch {
    return []
  }
}

function persist(items: PendingCheckin[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // 存储不可用时仅影响离线补交，不阻断在线打卡
  }
}

/**
 * 离线打卡队列：断网时把打卡记在本地，恢复网络后自动补交。
 *
 * 科创活动常在没有校园网的地方发生，只提示"网络失败"等于丢数据。
 * 补交用客户端生成的 clientId 去重，因此重复点击或反复重试都不会多记一次。
 */
// 队列状态放在模块级：同一页面若有多处调用，不会各自并发补交
const pendingCount = ref(load().length)
const syncing = ref(false)

export function useCheckinQueue() {

  function newClientId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
    return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  function enqueue(projectId: string, content: string): PendingCheckin {
    const item: PendingCheckin = {
      projectId,
      content,
      clientId: newClientId(),
      createdAt: new Date().toISOString(),
    }
    const items = [...load(), item]
    persist(items)
    pendingCount.value = items.length
    return item
  }

  /** 重试也不会成功的状态码：内容或请求本身有问题，留着只会永久堵住后面的打卡 */
  const PERMANENT = new Set([400, 403, 404, 409, 422])

  /**
   * 尝试补交待同步项。
   *
   * 只有"内容有问题"（400/403/404/409/422）才从队列移除；网络不可用（status 0）、
   * 会话过期（401）与服务端故障（5xx）都保留待下次重试——这些情况重试是会成功的，
   * 若当作失败丢弃，学生离线记下的打卡会凭空消失。
   */
  async function flush(): Promise<{ synced: number; failed: number }> {
    if (syncing.value) return { synced: 0, failed: 0 }
    const items = load()
    if (!items.length) return { synced: 0, failed: 0 }
    syncing.value = true
    let synced = 0
    let failed = 0
    const remaining: PendingCheckin[] = []
    try {
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]
        try {
          await createCheckin(item.projectId, item.content, item.clientId)
          synced += 1
        } catch (err) {
          const status = err instanceof ApiError ? err.status : -1
          if (!PERMANENT.has(status)) {
            // 暂时性失败（离线、超时、会话过期、服务端错误）：当前项与后续项都留到下次
            remaining.push(...items.slice(i))
            break
          }
          failed += 1
        }
      }
    } finally {
      // 补交过程中用户可能又存了新的打卡：把这段时间新增的项合并进来，
      // 否则 persist 会用旧快照覆盖存储，用户刚被告知"已保存在本机"的记录就没了
      const snapshot = new Set(items.map((i) => i.clientId))
      const added = load().filter((i) => !snapshot.has(i.clientId))
      const merged = [...remaining, ...added]
      persist(merged)
      pendingCount.value = merged.length
      syncing.value = false
    }
    return { synced, failed }
  }

  return { pendingCount, syncing, enqueue, flush }
}
