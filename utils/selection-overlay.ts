import { CSS_ANIMATION_DURATION, CSS_PREFIX, mountStyle } from "./css-portal"
import { GRADIENT } from "./constant"

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
