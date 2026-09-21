import jsQR from "jsqr"

import { contentBaseZindex } from "~/utils/constant"

/** 开发模式下 debug canvas 的 class 名 */
const DEBUG_CANVAS_CLASS =
  "github-2fa-container-1742783738736-debug-canvas"

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
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("无法获取 Canvas 上下文"))

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

      decodeQRCode(canvas.toDataURL("image/png"))
        .then(resolve)
        .catch(reject)

      // 开发模式：把 canvas 显示在页面上供调试
      if (process.env.NODE_ENV === "development") {
        canvas.classList.add(DEBUG_CANVAS_CLASS)
        canvas.style.position = "fixed"
        canvas.style.top = "0"
        canvas.style.left = "0"
        canvas.style.zIndex = `${contentBaseZindex + 1}`
        canvas.style.border = "2px solid #2196F3"
        canvas.addEventListener("click", () => canvas.remove())
        document.body.appendChild(canvas)
      }
    }
    img.onerror = reject
  })
}

/** 解析 Data URL 图片中的二维码内容 */
const decodeQRCode = (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.src = imageDataUrl
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("无法获取 Canvas 上下文"))
      ctx.drawImage(image, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code) resolve(code.data)
      else reject(new Error("无法识别的二维码"))
    }
    image.onerror = () => reject(new Error("图片加载失败"))
  })
}