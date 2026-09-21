/**
 * 全局 CSS 注入的单一入口。
 *
 * 把原本硬编码在 `utils/ui.ts` 里的 `"github-2fa-1746543013856"` 前缀换成
 * 一个稳定、可读、不带构建时间戳的命名空间；并保证整个页面内只有一个 `<style>`。
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

/**
 * 把剩余秒数映射到 daisyUI progress 颜色类名
 *
 * 从 utils/auth.ts 搬到此处：候选 D（auth.ts 应聚焦 OTP 领域，不再含 UI 助手）。
 */
export const getProgressColor = (timeRemaining: number): string => {
  if (timeRemaining > 10) return "progress-primary"
  if (timeRemaining > 3) return "progress-warning"
  return "progress-error"
}
