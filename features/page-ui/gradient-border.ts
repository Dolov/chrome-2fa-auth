/**
 * 邻元素浮动提示（Callout）与选区盒（Selection Box）的两个 content 注入 UI。
 *
 * 命名解释：以前叫 `rainbow-*`，因为视觉上是彩虹渐变 —— 但视觉终归可能换皮，
 * 功能才是契约。`callout` 直接说明「这是浮在页面元素旁的提示气泡」，未来换
 * 皮肤时无需跟类名商量。
 *
 * - `createCalloutContainer` / 旧名 `createGradientTextContainer`：文本气泡
 *   （OTP 提示 / 恢复码提示 / 自动填充卡）
 * - `createSelectionBox`：拖拽选区盒
 *
 * 两者都依赖 `ContentLayer.Surface`，调用方不用关心 z-index；CSS 的注入通道统一
 * 由 `css-portal` 持有（mountStyle 单 host）。
 */

import { ContentLayer, CSS_ANIMATION_DURATION, CSS_PREFIX, mountStyle } from "./css-portal"
import { GRADIENT } from "~/utils/constants"

/** Callout 容器的返回类型 */
export interface CalloutContainer {
  container: HTMLDivElement
  textElement: HTMLParagraphElement
}

const calloutStyleId = `${CSS_PREFIX}-callout-style`

/**
 * Callout 用的样式（包括 border 渐变流动 + 文本渐变 + 内嵌 gradient-link）。
 *
 * 该样式表与 `createCalloutContainer` 同步挂载：`startOtpMessageUpdater`、
 * `displayRecoveryCodeSaveMessage` 都只调 `createCalloutContainer`，不再各自
 * mount 自己的样式表。
 */
const buildCalloutCss = (): string => `
  @keyframes ${CSS_PREFIX}-callout-shimmer {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .${CSS_PREFIX}-callout {
    position: relative;
    padding: 6px 12px;
    background: transparent;
    z-index: ${ContentLayer.Surface};
  }
  .${CSS_PREFIX}-callout::before {
    content: "";
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: ${GRADIENT};
    background-size: 300% 300%;
    animation: ${CSS_PREFIX}-callout-shimmer ${CSS_ANIMATION_DURATION} linear infinite;
    border-radius: 6px;
    z-index: -1;
    padding: 2px;
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: destination-out;
  }

  .${CSS_PREFIX}-callout-text {
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    margin: 0;
    padding: 0;
    color: transparent;
    background: ${GRADIENT};
    background-clip: text;
    -webkit-background-clip: text;
    background-size: 300% 300%;
    animation: ${CSS_PREFIX}-callout-shimmer ${CSS_ANIMATION_DURATION} ease infinite;
  }

  .${CSS_PREFIX}-callout-link {
    color: inherit;
    text-decoration: none;
  }
  .${CSS_PREFIX}-callout-link:hover {
    text-decoration: underline;
    text-decoration-color: #00d3bb;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }
`

/**
 * 创建一个 Callout 容器（带 callout 描边 + 渐变文本动画）。
 *
 * 用于 OTP 提示气泡、恢复码提示等场景。挂载的样式表一次性把后续嵌入元素
 * （含 `callout-link`）的样式都注入好了，调用方不用再 mount。
 */
export const createCalloutContainer = (
  containerStyle?: Partial<CSSStyleDeclaration>
): CalloutContainer => {
  const container = document.createElement("div")
  const textElement = document.createElement("p")
  textElement.textContent = "🌈"
  container.appendChild(textElement)

  container.classList.add(`${CSS_PREFIX}-callout`)
  textElement.classList.add(`${CSS_PREFIX}-callout-text`)

  if (containerStyle) {
    for (const key in containerStyle) {
      if (containerStyle[key] !== undefined) {
        container.style[key] = containerStyle[key]
      }
    }
  }

  mountStyle(calloutStyleId, buildCalloutCss())

  return { container, textElement }
}

/** 向后兼容 alias —— 别处可能还在 import createGradientTextContainer */
export const createGradientTextContainer = createCalloutContainer

/** 选区盒接口 */
export interface SelectionBox {
  element: HTMLDivElement
  update: (currentX: number, currentY: number) => void
  remove: () => void
}

/**
 * 创建一个带 callout 同款渐变描边的可拖选区盒（content 层）。
 *
 * z-index 由内部固定到 `ContentLayer.Surface`，调用方不再传入：
 * - 旧版本有 `zIndex = 9999` 默认参数，曾与 `contentBaseZindex + 1` 撞车
 * - 截图遮罩 (`ContentLayer.Background`) 与本盒同框时，永远是后者画在上面
 */
export const createSelectionBox = (
  startX: number,
  startY: number
): SelectionBox => {
  const className = `${CSS_PREFIX}-selection-box`
  const animationName = `${CSS_PREFIX}-selection-gradient`
  const styleId = `${CSS_PREFIX}-selection-style`

  const box = document.createElement("div")
  box.className = className
  Object.assign(box.style, {
    position: "fixed",
    top: `${startY}px`,
    left: `${startX}px`,
    zIndex: ContentLayer.Surface.toString(),
    borderRadius: "8px",
    pointerEvents: "none",
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  })

  mountStyle(
    styleId,
    `
      @keyframes ${animationName} {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      .${className}::before {
        content: "";
        position: absolute;
        top: -3px;
        left: -3px;
        right: -3px;
        bottom: -3px;
        border-radius: 10px;
        background: ${GRADIENT};
        background-size: 400% 400%;
        animation: ${animationName} ${CSS_ANIMATION_DURATION} linear infinite;
        z-index: -1;
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: exclude;
        -webkit-mask-composite: destination-out;
        padding: 3px;
      }
    `
  )

  return {
    element: box,
    update: (currentX, currentY) => {
      const width = currentX - startX
      const height = currentY - startY
      Object.assign(box.style, {
        width: `${Math.abs(width)}px`,
        height: `${Math.abs(height)}px`,
        left: `${width < 0 ? currentX : startX}px`,
        top: `${height < 0 ? currentY : startY}px`
      })
    },
    remove: () => box.remove()
  }
}
