/**
 * 等待选择器命中页面 DOM（MutationObserver）
 *
 * content script 专用：目标站点是 SPA，元素出现时机不可预期。
 */

/** 等待一个选择器命中 DOM */
export const waitForElement = <T extends Element = Element>(
  selector: string,
  once = false
): Promise<T> => {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector)
    if (existing) {
      resolve(existing as T)
      return
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue

          const target = node.matches?.(selector)
            ? node
            : node.querySelector?.(selector)

          if (target) {
            if (once) observer.disconnect()
            resolve(target as T)
            return
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  })
}
