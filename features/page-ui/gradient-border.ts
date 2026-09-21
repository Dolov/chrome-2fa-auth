/**
 * 流动渐变边框的两个变体（content script 注入 UI）
 *
 * - `createGradientTextContainer`：文本气泡（OTP 提示 / 恢复码提示）
 * - `createSelectionBox`：拖拽选区盒
 *
 * 两者共用同一套视觉语言（GRADIENT + mask-composite 描边 + 流动动画），
 * 但圆角 / 偏移 / 背景尺寸不同，CSS 暂按变体各写一份，避免视觉回归。
 * prefix 与注入通道统一由 `css-portal` 持有。
 */

import { CSS_ANIMATION_DURATION, CSS_PREFIX, mountStyle } from "./css-portal"
import { GRADIENT } from "~/utils/constants"

/** 渐变容器组件的返回类型 */
export interface GradientTextContainer {
  container: HTMLDivElement
  textElement: HTMLParagraphElement
}

/**
 * 创建一个带渐变边框和文本动画的浮动盒子。
 *
 * 用于 OTP 提示气泡、恢复码提示等场景。
 * 实际样式由 `css-portal` 注入，prefix 由 portal 集中持有。
 */
export const createGradientTextContainer = (
  containerStyle?: Partial<CSSStyleDeclaration>
): GradientTextContainer => {
  const container = document.createElement("div")
  const textElement = document.createElement("p")
  textElement.textContent = "🌈"
  container.appendChild(textElement)

  container.classList.add(`${CSS_PREFIX}-rainbow-border`)
  textElement.classList.add(`${CSS_PREFIX}-rainbow-text`)

  if (containerStyle) {
    for (const key in containerStyle) {
      if (containerStyle[key] !== undefined) {
        container.style[key] = containerStyle[key]
      }
    }
  }

  mountStyle(
    `${CSS_PREFIX}-rainbow-style`,
    `
      @keyframes ${CSS_PREFIX}-rainbowFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      .${CSS_PREFIX}-rainbow-border {
        position: relative;
        padding: 6px 12px;
        background: transparent;
        z-index: 0;
      }

      .${CSS_PREFIX}-rainbow-border::before {
        content: "";
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: ${GRADIENT};
        background-size: 300% 300%;
        animation: ${CSS_PREFIX}-rainbowFlow ${CSS_ANIMATION_DURATION} linear infinite;
        border-radius: 6px;
        z-index: -1;
        padding: 2px;
        mask:
          linear-gradient(#fff 0 0) content-box,
          linear-gradient(#fff 0 0);
        mask-composite: exclude;
        -webkit-mask-composite: destination-out;
      }

      .${CSS_PREFIX}-rainbow-text {
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
        animation: ${CSS_PREFIX}-rainbowFlow ${CSS_ANIMATION_DURATION} ease infinite;
      }
    `
  )

  return { container, textElement }
}

/** 选区盒接口 */
export interface SelectionBox {
  element: HTMLDivElement
  update: (currentX: number, currentY: number) => void
  remove: () => void
}

/**
 * 创建一个带渐变边框的可拖选区盒。
 *
 * 调用方通过 mousedown / mousemove 事件驱动 update()
 * 完成选区后调用 remove() 清理。
 */
export const createSelectionBox = (
  startX: number,
  startY: number,
  zIndex = 9999
): SelectionBox => {
  const className = `${CSS_PREFIX}-selection-box`
  const animationName = `${CSS_PREFIX}-selection-gradient`

  const box = document.createElement("div")
  Object.assign(box.style, {
    position: "fixed",
    top: `${startY}px`,
    left: `${startX}px`,
    zIndex: zIndex.toString(),
    borderRadius: "8px",
    pointerEvents: "none",
    // backdropFilter: "blur(2px)",
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  })
  box.className = className

  mountStyle(
    `${CSS_PREFIX}-selection-style`,
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
