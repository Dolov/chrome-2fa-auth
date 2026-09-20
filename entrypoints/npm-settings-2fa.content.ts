import jsQR from "jsqr"

import message from "~/utils/message"
import {
  extractDynamicSegment,
  highlightElement,
  parseOtpAuthUrl,
  saveOTP,
  startOtpMessageUpdater,
  waitForPathMatchStrict
} from "~/utils"

export default defineContentScript({
  matches: [
    "https://www.npmjs.com/settings/*/tfa",
    "https://www.npmjs.com/settings/*/tfa/list",
    // replace
    "https://www.npmjs.com/settings/*/tfa/manageTfa?action=setup-totp"
  ],
  allFrames: false,
  main() {
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

    const init = async () => {
      const href = await waitForPathMatchStrict({
        endsWith: [
          "/settings/*/tfa/",
          "/settings/*/tfa/manageTfa?action=setup-totp"
        ]
      })
      if (!href) return
      const result = await scanQRCode()
      if (!result) return
      const { data, element } = result
      highlightElement(element)
      const parsedData = parseOtpAuthUrl(data)
      const account = extractDynamicSegment(href, "/settings/*/tfa/")
      const input = document.querySelector(
        "input[id='enable_otp']"
      ) as HTMLInputElement
      if (!input) return

      const { secret } = parsedData

      startOtpMessageUpdater(input, secret)

      const submitButton = document.querySelector(
        "button[type='submit']"
      ) as HTMLButtonElement
      if (!submitButton) return

      submitButton.addEventListener("click", async () => {
        if (!input.value) return
        await saveOTP({
          ...parsedData,
          account,
          id: Date.now().toString()
        })
        message.success("添加成功")
      })
    }

    init()
  }
})