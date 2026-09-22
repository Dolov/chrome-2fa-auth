/**
 * 等待选择器命中页面 DOM（MutationObserver）
 *
 * content script 专用：目标站点是 SPA，元素出现时机不可预期。
 *
 * 生命周期：`once=false` 的 observer 会持续观察，直到调用
 * `disposeAllElementObservers()`。SPA 路由切换由 `dispatch.ts` 调用此函数，
 * 避免旧 observer 持续盯着已被替换的 DOM 子树。
 */

/** 单次等待的超时（毫秒） */
const WAIT_TIMEOUT_MS = 30_000

const activeObservers = new Set<MutationObserver>()

/** 停掉所有仍存活的 wait-element observer（content script SPA cleanup 入口） */
export const disposeAllElementObservers = (): void => {
  for (const observer of activeObservers) observer.disconnect()
  activeObservers.clear()
}

/** 等待一个选择器命中 DOM */
export const waitForElement = <T extends Element = Element>(
  selector: string,
  once = false
): Promise<T> => {
  return new Promise((resolve, reject) => {
    // document_idle 时目标元素往往已在初始 DOM 里；只靠 observer 的
    // addedNodes 会永远等不到「新增」事件，必须同步先查一次。
    const existing = document.querySelector<T>(selector)
    if (existing != null) {
      resolve(existing)
      return
    }

    const timer = setTimeout(() => {
      observer.disconnect()
      activeObservers.delete(observer)
      reject(
        new Error(
          `waitForElement(${selector}) timed out after ${WAIT_TIMEOUT_MS}ms`
        )
      )
    }, WAIT_TIMEOUT_MS)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue

          const target = node.matches?.(selector)
            ? node
            : node.querySelector?.(selector)

          if (target) {
            clearTimeout(timer)
            if (once) {
              observer.disconnect()
            } else {
              activeObservers.add(observer)
            }
            resolve(target as T)
            return
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  })
}
