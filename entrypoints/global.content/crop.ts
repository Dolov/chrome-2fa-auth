import { ContentLayer, CSS_PREFIX, mountStyle } from "~/features/page-ui/css-portal"
import { i18n } from "#i18n"
import { readFromCanvas } from "~/utils/qr-decode"

/** 开发模式下 debug 浮层的 class 名（容器 / 删除按钮） */
const DEBUG_CANVAS_CLASS = `${CSS_PREFIX}-debug-canvas`
const DEBUG_CLOSE_CLASS = `${CSS_PREFIX}-debug-canvas-close`
const DEBUG_CANVAS_STYLE_ID = `${CSS_PREFIX}-debug-canvas-style`

/**
 * 调试浮层样式：容器固定左上角，右上角是删除按钮。
 *
 * 只有开发模式会注入，但类名与 z-index 仍按注入 UI 约定走
 * （`CSS_PREFIX` + `ContentLayer.Surface`），避免与宿主页面样式撞名、避免多开一层。
 */
const buildDebugCanvasCss = (): string => `
  .${DEBUG_CANVAS_CLASS} {
    position: fixed;
    top: 0;
    left: 0;
    z-index: ${ContentLayer.Surface};
    border: 2px solid #2196f3;
  }

  .${DEBUG_CANVAS_CLASS} canvas {
    display: block;
  }

  .${DEBUG_CLOSE_CLASS} {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    width: 20px;
    height: 20px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: #2196f3;
    color: #fff;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
  }
`

/**
 * 把裁剪结果画到页面左上角供调试（仅开发模式）。
 * 右上角删除按钮移除整块浮层，不再靠点 canvas 本身关闭。
 */
const mountDebugCanvas = (canvas: HTMLCanvasElement): void => {
  mountStyle(DEBUG_CANVAS_STYLE_ID, buildDebugCanvasCss())

  const container = document.createElement("div")
  container.className = DEBUG_CANVAS_CLASS

  const closeButton = document.createElement("button")
  closeButton.type = "button"
  closeButton.className = DEBUG_CLOSE_CLASS
  closeButton.textContent = "×"
  closeButton.setAttribute("aria-label", i18n.t("common_action_close"))
  closeButton.addEventListener("click", () => container.remove())

  container.append(canvas, closeButton)
  document.body.appendChild(container)
}
/**
 * 裁剪截图区域并解析其中的二维码。
 *
 * 处理 devicePixelRatio：原始坐标是 CSS 像素，Canvas 实际像素按 dpr 缩放。
 * 开发模式下额外把中间 canvas 画到页面上，方便调试。
 */
export const cropImage = (
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = dataUrl
    img.addEventListener("load", () => {
      const dpr = window.devicePixelRatio || 1

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error(i18n.t("global_content_error_canvas")))

      canvas.width = width * dpr
      canvas.height = height * dpr

      ctx.drawImage(
        img,
        x * dpr,
        y * dpr,
        width * dpr,
        height * dpr,
        0,
        0,
        width * dpr,
        height * dpr
      )

      readFromCanvas(canvas).then(resolve).catch(reject)

      // 开发模式：把 canvas 显示在页面上供调试
      if (process.env.NODE_ENV === "development") {
        mountDebugCanvas(canvas)
      }
    })
    img.addEventListener("error", reject)
  })
}
