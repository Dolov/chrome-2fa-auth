import { ContentLayer, CSS_PREFIX, mountStyle } from "~/features/page-ui/css-portal"
import { createSelectionBox } from "~/features/page-ui/gradient-border"
import { sendCaptureScreenshot } from "~/features/messaging"
import { i18n } from "#i18n"

import { cropImage } from "./crop"

const OVERLAY_STYLE_ID = `${CSS_PREFIX}-screenshot-overlay-style`

const buildOverlayCss = (): string => `
  .${CSS_PREFIX}-screenshot-overlay {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    cursor: crosshair;
    z-index: ${ContentLayer.Background};
  }
`

export interface SelectionArea {
  startX: number
  startY: number
  endX: number
  endY: number
}

export type SelectionResolve = (area: SelectionArea | null) => void

/**
 * 在页面上创建全屏选区遮罩 + 选区框，等待用户拖选完成后 resolve。
 *
 * - 遮罩恒为 `ContentLayer.Background`（最底）
 * - 选区框恒为 `ContentLayer.Surface`（最顶，与 Toast / Callout 同层，DOM 顺序决定）
 * - 用户按 ESC、再次点击、或者选中区域后 resolve；resolve(null) 表示取消
 *
 * @param onSelect 完成选区后回调，参数是选区坐标
 */
export const createScreenshotOverlay = (
  onSelect: (area: SelectionArea) => void
): { dismiss: () => void } => {
  mountStyle(OVERLAY_STYLE_ID, buildOverlayCss())

  const overlay = document.createElement("div")
  overlay.className = `${CSS_PREFIX}-screenshot-overlay`
  document.body.appendChild(overlay)

  let startX = 0
  let startY = 0
  let endX = 0
  let endY = 0
  let selectionBox: HTMLElement | null = null
  let isMouseDown = false

  const handleMouseMove = (e: MouseEvent) => {
    if (!selectionBox || !isMouseDown) return
    endX = e.clientX
    endY = e.clientY
    selectionBox.style.left = Math.min(startX, endX) + "px"
    selectionBox.style.top = Math.min(startY, endY) + "px"
    selectionBox.style.width = Math.abs(endX - startX) + "px"
    selectionBox.style.height = Math.abs(endY - startY) + "px"
  }

  const handleMouseUp = () => {
    isMouseDown = false
    document.removeEventListener("mousemove", handleMouseMove)
    if (!selectionBox) return

    // 区域太小视为误触，忽略
    if (Math.abs(endX - startX) < 5 || Math.abs(endY - startY) < 5) return

    onSelect({ startX, startY, endX, endY })
    dismiss()
  }

  const handleEsc = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return
    dismiss()
  }

  overlay.addEventListener("mousedown", (e) => {
    startX = e.clientX
    startY = e.clientY
    isMouseDown = true

    // createSelectionBox 内部已固定到 ContentLayer.Surface
    const box = createSelectionBox(startX, startY)
    selectionBox?.remove()
    selectionBox = box.element
    document.body.appendChild(selectionBox)
    document.addEventListener("mousemove", handleMouseMove)
  })

  document.addEventListener("mouseup", handleMouseUp)
  document.addEventListener("keydown", handleEsc)

  function dismiss() {
    overlay.remove()
    selectionBox?.remove()
    document.removeEventListener("keydown", handleEsc)
    document.removeEventListener("mouseup", handleMouseUp)
    document.removeEventListener("mousemove", handleMouseMove)
  }

  return { dismiss }
}

/**
 * 调用 background 截图并裁剪识别 QR 码。
 * 失败抛 Error，由调用方处理 UI 提示。
 */
export const captureAndDecode = async (
  area: SelectionArea
): Promise<string> => {
  const response = await sendCaptureScreenshot()
  if (!response?.success || !response.image) {
    throw new Error(i18n.t("global_content_error_screenshot"))
  }

  return cropImage(
    response.image,
    area.startX,
    area.startY,
    area.endX - area.startX,
    area.endY - area.startY
  )
}
