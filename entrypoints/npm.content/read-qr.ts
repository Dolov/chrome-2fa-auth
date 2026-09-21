import jsQR from "jsqr"

import message from "~/utils/message"
import { parseOtpAuthUrl } from "~/utils/auth"
import { saveOTP } from "~/utils/storage"
import { highlightElement, startOtpMessageUpdater } from "~/utils/ui"
import {
  extractDynamicSegment,
  waitForPathMatchStrict
} from "~/utils/dom-utils"

import { NPM_OTP_VERIFY_INPUT_SELECTOR } from "./helpers"

/**
 * NPM 启用 2FA 页：扫描页面 QR → 填验证码 → 保存到本地
 * 适用 URL：www.npmjs.com/settings/<user>/tfa/...
 */
export const setupNpmReadQR = async (): Promise<void> => {
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
    NPM_OTP_VERIFY_INPUT_SELECTOR
  ) as HTMLInputElement
  if (!input) return

  startOtpMessageUpdater(input, parsedData.secret)

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

// 依次尝试解析 canvas > img 中的二维码
const scanQRCode = async (): Promise<
  { data: string; element: HTMLElement } | null
> => {
  for (const canvas of Array.from(document.querySelectorAll("canvas"))) {
    try {
      const data = await readQRCodeFromCanvas(canvas)
      return { data, element: canvas }
    } catch {
      // 继续尝试下一个元素
    }
  }

  for (const img of Array.from(document.querySelectorAll("img"))) {
    try {
      const data = await readQRCodeFromImage(img)
      return { data, element: img }
    } catch {
      // 继续尝试下一个元素
    }
  }

  return null
}

const readQRCodeFromCanvas = (
  canvas: HTMLCanvasElement
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return reject(new Error("无法获取 Canvas 上下文"))

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    code ? resolve(code.data) : reject(new Error("未找到二维码"))
  })
}

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