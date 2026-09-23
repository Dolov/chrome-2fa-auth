/**
 * 全局 toast 通知工具。
 *
 * 设计：
 * - 单文件内同时管队列与渲染，不依赖 React、不在 content script 之外使用
 * - 通过 `mountStyle` 单一 host <style> 注入，不污染页面原有 CSS
 * - 自动超期销毁，可手动调 returned.destroy() 提前关闭（幂等）
 *
 * 视觉/位置/CSS 全部交给 `mountStyle` 注入的样式表（架构报告候选 3 收尾）：
 * 切肤 CSS / 颜色 / 过渡只需改 mountStyle 这一段字符串，不用翻 imperative JS。
 * 状态切换走 `data-toast-state` 属性 + CSS transition，自然可被主题 / a11y
 * 工具读取。
 */

import { ContentLayer, CSS_PREFIX, mountStyle } from "./css-portal"

const baseDuration = 5000
const STYLE_ID = `${CSS_PREFIX}-toast-style`
/** 与 CSS `transition` 时长对齐，否则卸载会赶在动画前发生 */
const EXIT_MS = 300
/** 让浏览器完成初态注册的最小延迟（≈ 一帧）；缺省默认就用 `requestAnimationFrame` */

type ToastKind = "info" | "warn" | "error" | "success"

/**
 * 各 kind 的背景 / 前景色。
 *
 * - 扩展页（popup / settings）：命中 daisyUI 主题变量，跟随 `data-theme` 切换
 * - 宿主页（content script）：无主题变量，回退 Material 固定色
 * 前景用配对的 `-content` 变量，避免 wireframe 等浅色主题下文字不可读。
 */
const COLORS: Record<ToastKind, { bg: string; fg: string }> = {
  info: {
    bg: "var(--color-info, #2196F3)",
    fg: "var(--color-info-content, #fff)"
  },
  warn: {
    bg: "var(--color-warning, #FFC107)",
    fg: "var(--color-warning-content, #fff)"
  },
  error: {
    bg: "var(--color-error, #F44336)",
    fg: "var(--color-error-content, #fff)"
  },
  success: {
    bg: "var(--color-success, #4CAF50)",
    fg: "var(--color-success-content, #fff)"
  }
}

const buildCss = (): string => {
  // kindRules 必须在 `${CSS_PREFIX}-toast { ... }` 块外作为顶层规则。
  // 之前塞进块里被浏览器当作原生 CSS 嵌套，子选择器变成
  // `${CSS_PREFIX}-toast ${CSS_PREFIX}-toast[data-testid-toast-kind=…]`
  // （后代选择器），永远命中不到节点自身 → 颜色丢失。
  const kindRules = (Object.keys(COLORS) as ToastKind[])
    .map(
      (kind) =>
        `.${CSS_PREFIX}-toast[data-testid-toast-kind="${kind}"]{background-color:${COLORS[kind].bg};color:${COLORS[kind].fg};}`
    )
    .join("\n      ")
  return `
      .${CSS_PREFIX}-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        font-size: 16px;
        z-index: ${ContentLayer.Surface};
        transform: translateX(100%);
        opacity: 0;
        transition: transform ${EXIT_MS}ms ease, opacity ${EXIT_MS}ms ease;
      }
      ${kindRules}
      .${CSS_PREFIX}-toast[data-toast-state="visible"] {
        transform: translateX(0);
        opacity: 1;
      }
    `
}

interface ToastHandle {
  destroy(): void
}

const showMessage = (
  type: ToastKind,
  text: string,
  duration: number
): ToastHandle => {
  mountStyle(STYLE_ID, buildCss())

  const node = document.createElement("div")
  node.className = `${CSS_PREFIX}-toast`
  node.setAttribute("data-testid", "toast")
  node.setAttribute("data-testid-toast-kind", type)
  node.setAttribute("data-toast-state", "hidden")
  node.textContent = text

  document.body.appendChild(node)

  // 让浏览器先注册初始 hidden 态再切到 visible，否则 transition 不会触发
  window.requestAnimationFrame(() => {
    node.setAttribute("data-toast-state", "visible")
  })

  let destroyed = false
  const destroy = (): void => {
    if (destroyed) return
    destroyed = true
    node.removeAttribute("data-toast-state")
    window.setTimeout(() => node.remove(), EXIT_MS)
  }

  window.setTimeout(destroy, duration)

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
