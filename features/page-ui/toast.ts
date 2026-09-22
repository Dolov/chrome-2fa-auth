/**
 * 全局 toast 通知工具。
 *
 * 设计：
 * - 单文件内同时管队列与渲染，不依赖 React、不在 content script 之外使用
 * - 通过 `mountStyle` 单一 host <style> 注入，不污染页面原有 CSS
 * - 自动超期销毁，可手动调 returned.destroy() 提前关闭
 */

import { contentBaseZindex } from "./css-portal"

const baseDuration = 3000

type ToastKind = "info" | "warn" | "error" | "success"

const COLORS: Record<ToastKind, string> = {
  info: "#2196F3",
  warn: "#FFC107",
  error: "#F44336",
  success: "#4CAF50"
}

interface ToastHandle {
  destroy(): void
}

const showMessage = (
  type: ToastKind,
  text: string,
  duration: number
): ToastHandle => {
  const node = document.createElement("div")
  node.style.position = "fixed"
  node.style.top = "20px"
  node.style.right = "20px"
  node.style.padding = "10px 20px"
  node.style.borderRadius = "8px"
  node.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)"
  node.style.color = "white"
  node.style.fontSize = "16px"
  node.style.transition = "transform 0.3s ease, opacity 0.3s ease"
  node.style.transform = "translateX(100%)"
  node.style.opacity = "0"
  node.style.zIndex = `${contentBaseZindex + 1}`
  node.style.backgroundColor = COLORS[type]
  node.textContent = text
  // 暴露 testid + 类型，便于 E2E 黑盒断言（i18n 时只断言 kind，文本会变）
  node.setAttribute("data-testid", "toast")
  node.setAttribute("data-testid-toast-kind", type)

  document.body.appendChild(node)

  setTimeout(() => {
    node.style.opacity = "1"
    node.style.transform = "translateX(0)"
  }, 10)

  const destroy = () => {
    node.style.transform = "translateX(100%)"
    node.style.opacity = "0"
    setTimeout(() => node.remove(), 300)
  }

  setTimeout(destroy, duration)

  return { destroy }
}

const message = {
  warning: (text: string, duration = baseDuration) =>
    showMessage("warn", text, duration),
  info: (text: string, duration = baseDuration) =>
    showMessage("info", text, duration),
  error: (text: string, duration = baseDuration) =>
    showMessage("error", text, duration),
  success: (text: string, duration = baseDuration) =>
    showMessage("success", text, duration)
}

export default message
