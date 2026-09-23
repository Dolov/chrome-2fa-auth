/**
 * 注入到宿主页面的 CSS 单一入口（content script + popup 的 DOM UI 共用）。
 *
 * ## 命名约定
 *
 * 所有由 content script 注入到宿主页面的 DOM / 动画 / 类名都必须走 `CSS_PREFIX`：
 *
 * - 类 / 伪元素 / 动画名：`${CSS_PREFIX}-<element|role>`（如 `g2fa-portal-callout`）
 * - mountStyle 的去重 key：`${CSS_PREFIX}-<element|role>-style`（如 `g2fa-portal-callout-style`）
 * - data 属性：`data-<role>`，与 `CSS_PREFIX` 解耦以避免页面样式误撞
 *
 * ## z-index 分层
 *
 * 注入元素分两层（`ContentLayer`），同层内靠 DOM 顺序决定谁画在上面：
 *
 * | 层级 | z-index | 用途 |
 * |---|---|---|
 * | `Background` | `contentBaseZindex` | 全屏遮罩 / 截图背景（最底） |
 * | `Surface`    | `contentBaseZindex + 1` | Toast、Selection Box、Callout Text、Debug Canvas（最顶） |
 *
 * 历史备忘：先前有过 `Reserved` 占位层（base + 2，预留给 staged-modal），但无人调用
 * —— 真正需要第三层时再开，不预留。
 */

const PREFIX = "g2fa-portal" as const
const STYLE_NODE_ID = `${PREFIX}-style-sheet`
const ANIMATION_DURATION = "6s"

/** content script 注入元素 z-index 基线（手动 1000w，给页面顶层 chrome 留偏移空间） */
export const contentBaseZindex = 10_000_000

/**
 * 内容脚本注入 UI 的层级。同一层级 DOM 顺序决定谁画在上面。
 *
 * 见文件头「z-index 分层」表格。
 */
export const ContentLayer = {
  /** 选区拖拽的全屏背景遮罩；同 Selection Box 等浮层共存时它永远在最底 */
  Background: contentBaseZindex,
  /** 浮层：Toast、Selection Box、Callout Text、Debug Canvas（最顶） */
  Surface: contentBaseZindex + 1
} as const

export type ContentLayerValue = (typeof ContentLayer)[keyof typeof ContentLayer]

export const CSS_PREFIX = PREFIX
export const CSS_ANIMATION_DURATION = ANIMATION_DURATION

/**
 * 用 id 幂等注入一段 CSS。已有同 id 的 `<style>` 直接返回，不再追加。
 * 模块级单例：所有特性共用同一个 host style 节点。
 *
 * 去重 key 是 `/* ${styleId} *\/` —— 调用方传的 `styleId` 必须本身不同。
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
