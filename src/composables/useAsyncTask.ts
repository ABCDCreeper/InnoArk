import { ref } from 'vue'
import { ApiError } from '../api/request'

type Notifier = { error: (content: string) => void }

/**
 * 统一的异步加载：捕获失败并提示，同时只采纳最后一次调用的结果。
 *
 * 列表切换或筛选连点时，先发出的请求可能后返回；不做守卫就会用旧数据覆盖新选择
 * （面板标题是 B、内容却是 A）。每次调用递增 revision，只有仍是最新的一次才会写入。
 */
export function useAsyncTask(notify: Notifier, fallbackMessage = '加载失败') {
  const loading = ref(false)
  let revision = 0

  /** 返回本次调用是否成功，便于调用方决定后续动作（例如失败时不要再发联动请求）。 */
  async function run<T>(task: () => Promise<T>, apply: (value: T) => void): Promise<boolean> {
    const current = ++revision
    loading.value = true
    try {
      const value = await task()
      if (current !== revision) return false
      apply(value)
      return true
    } catch (err) {
      if (current === revision) notify.error(err instanceof ApiError ? err.message : fallbackMessage)
      return false
    } finally {
      if (current === revision) loading.value = false
    }
  }

  return { loading, run }
}
