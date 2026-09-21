/**
 * 注入到宿主页面的 CSS 单一入口（content script + popup 的 DOM UI 共用）。
 *
 * - 全文档只有一个 host `<style>`，按 dedupe key 幂等注入
 * - prefix 是稳定常量，不带构建时间戳，避免每次构建换命名空间
 * - 禁止在调用方直接 `appendChild(<style>)`
 */

const PREFIX = "g2fa-portal" as const
const STYLE_NODE_ID = `${PREFIX}-style-sheet`
const ANIMATION_DURATION = "6s"

/** content script 注入元素的 z-index 基线（手动 1000w 给 toast 留 1 偏移） */
export const contentBaseZindex = 10_000_000

export const CSS_PREFIX = PREFIX
export const CSS_ANIMATION_DURATION = ANIMATION_DURATION

/**
 * 用 id 幂等注入一段 CSS。已有同 id 的 `<style>` 直接返回，不再追加。
 * 模块级单例：所有特性共用同一个 style 节点。
 */
export const mountStyle = (styleId: string, cssBody: string) => {
  let hostStyle = document.getElementById(STYLE_NODE_ID)

  if (!hostStyle) {
    hostStyle = document.createElement("style")
    hostStyle.id = STYLE_NODE_ID
    document.head.appendChild(hostStyle)
  }

  const dedupeKey = `/* ${styleId} */`
  if (hostStyle.textContent?.includes(dedupeKey)) {
    return hostStyle
  }

  hostStyle.appendChild(
    document.createTextNode(`${dedupeKey}\n${cssBody}\n`)
  )
  return hostStyle
}
