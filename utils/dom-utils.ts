/**
 * 与 DOM/URL 相关的同步等待辅助
 *
 * 全部走 MutationObserver / 轮询，浏览器原生 API，不要在这里混入异步业务。
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

/** 用 `*` 占位的 URL 模板提取动态段 */
export const extractDynamicSegment = (
  url: string,
  template: string | string[]
): string | null => {
  const templates = Array.isArray(template) ? template : [template]

  for (const templateEntry of templates) {
    const templateRegex = templateEntry
      .replace(/\//g, "\\/")
      .replace(/\*/g, "([^/]+)")

    const match = url.match(new RegExp(templateRegex))
    if (match?.[1]) return match[1]
  }

  return null
}
