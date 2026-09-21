import jsQR from "jsqr"

import { highlightElement } from "~/utils/ui"
import { ActionType } from "~/utils/constant"

/**
 * 自动扫描页面上的 canvas / img 元素，识别二维码内容
 *
 * matches: <all_urls>：扫描所有页面，需要持久 listener。
 * cleanup：
 *     chrome.runtime.onMessage 由 ctx.addEventListener 在 context
 *     invalidated 时自动移除（inject-use-ctx-invalidated）。
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: false,
  main(ctx) {
    // 监听消息并确保发送响应（msg-return-true-for-async）
    ctx.addEventListener(browser.runtime.onMessage, (
      message,
      _sender,
      sendResponse
    ) => {
      if (message.action === ActionType.AUTOSCAN) {
        scanQRCode()
          .then((result) => {
            highlightElement(result.element)
            sendResponse({ success: true, data: result.data })
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message })
          })
      }
      return true
    })

    // 🎯 依次尝试解析二维码（canvas > img）
    const scanQRCode = async (): Promise<{
      data: string
      element: HTMLElement
    }> => {
      const canvases = Array.from(document.querySelectorAll("canvas"))
      for (const canvas of canvases) {
        try {
          const data = await readQRCodeFromCanvas(canvas)
          return { data, element: canvas }
        } catch (error) {
          // console.error("解析二维码失败", error)
        }
      }

      const images = Array.from(document.querySelectorAll("img"))
      for (const img of images) {
        try {
          const data = await readQRCodeFromImage(img)
          return { data, element: img }
        } catch (error) {
          // console.error("解析二维码失败", error)
        }
      }

      throw new Error("未找到有效的二维码")
    }

    // 🎯 解析 <canvas> 里的二维码
    const readQRCodeFromCanvas = (canvas: HTMLCanvasElement): Promise<string> => {
      return new Promise((resolve, reject) => {
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("无法获取 Canvas 上下文"))

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        code ? resolve(code.data) : reject(new Error("未找到二维码"))
      })
    }

    // 🎯 解析 <img> 里的二维码
    const readQRCodeFromImage = (img: HTMLImageElement): Promise<string> => {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("无法获取 Canvas 上下文"))

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0, img.width, img.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        code ? resolve(code.data) : reject(new Error("未找到二维码"))
      })
    }
  }
})