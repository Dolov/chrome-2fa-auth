/**
 * 全局 CSS 注入的单一入口。
 *
 * 把原本硬编码在 `utils/ui.ts` 里的 `"github-2fa-1746543013856"` 前缀换成
 * 一个稳定、可读、不带构建时间戳的命名空间；并保证整个页面内只有一个 `<style>`。
 */

const PREFIX = "g2fa-portal" as const
const STYLE_NODE_ID = `${PREFIX}-style-sheet`
const ANIMATION_DURATION = "6s"

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
