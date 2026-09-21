import { CSS_ANIMATION_DURATION, CSS_PREFIX, mountStyle } from "./css-portal"
import { GRADIENT } from "./constant"

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
