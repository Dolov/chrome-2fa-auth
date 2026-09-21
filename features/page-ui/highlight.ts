import { COLORS } from "~/utils/constants"

/**
 * 给目标元素打多色高亮脉冲（彩虹色 box-shadow 循环闪烁）。
 * 常用于 QR 内容识别后的视觉反馈。
 */
export const highlightElement = (element: HTMLElement) => {
  let index = 0
  let count = 0
  const maxBlinks = COLORS.length

  const pulse = () => {
    const color = COLORS[index]
    Object.assign(element.style, {
      boxShadow: `0 0 20px 8px ${color}`,
      transform: "scale(1.05)",
      opacity: "0.9",
      transition: "box-shadow 0.3s ease, transform 0.3s ease, opacity 0.3s ease"
    })

    index = (index + 1) % COLORS.length
    count++

    setTimeout(() => {
      Object.assign(element.style, {
        boxShadow: "none",
        transform: "scale(1)",
        opacity: "1"
      })
    }, 300)

    if (count < maxBlinks) {
      setTimeout(pulse, 400)
    }
  }

  pulse()
}
