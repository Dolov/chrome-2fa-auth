import { contentBaseZindex } from "~/utils/css-portal"
import { createSelectionBox } from "~/utils/selection-overlay"
import { sendCaptureScreenshot } from "~/features/messaging"

import { cropImage } from "./crop"

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
 * 用户按 ESC、再次点击、或者选中区域后 resolve；resolve(null) 表示取消。
 *
 * @param onSelect 完成选区后回调，参数是选区坐标
 */
export const createScreenshotOverlay = (
  onSelect: (area: SelectionArea) => void
): { dismiss: () => void } => {
  const overlay = document.createElement("div")
  overlay.style.position = "fixed"
  overlay.style.top = "0"
  overlay.style.left = "0"
  overlay.style.width = "100vw"
  overlay.style.height = "100vh"
  overlay.style.zIndex = `${contentBaseZindex}`
  overlay.style.cursor = "crosshair"
  overlay.style.background = "rgba(0, 0, 0, 0.5)"
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

    const box = createSelectionBox(startX, startY, contentBaseZindex + 1)
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
    throw new Error("截图失败")
  }

  return cropImage(
    response.image,
    area.startX,
    area.startY,
    area.endX - area.startX,
    area.endY - area.startY
  )
}