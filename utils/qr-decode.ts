/**
 * 二维码解码（jsQR 边界）。
 *
 * **jsQR 必须懒加载**：它压缩后仍有约 117 KB（压缩率极低，内部有大查找表），
 * 而解码只在用户主动上传 / 扫描时才发生。静态 import 会让它进入每一个引用本模块
 * 的 bundle —— popup 主包、`global.content`（`<all_urls>`）、github / npm content
 * 全部各背一份。
 *
 * 拆包的实际情况（实测）：
 * - **popup / settings**：ESM 页面，`import()` 会被真正拆成独立 chunk，
 *   触发前不下载。popup 主包 363.5 KB → 236.2 KB。
 * - **content script**：产物是 IIFE，Rolldown 内联动态 import（会给出
 *   `[INEFFECTIVE_DYNAMIC_IMPORT]` 之外的静默内联），体积不变。要彻底拿掉
 *   content 侧这 ~128 KB 需要改造扫描链路（见 ADR-0007），本模块的懒加载
 *   是那一步的前提，不是替代。
 *
 * 四个导出函数本来就是 Promise 接口，所以改成异步加载对调用方零影响。
 */

import type { QRCode } from "jsqr"

import { i18n } from "~/utils/i18n"

/** 解码失败时抛出的 i18n 错误文案（惰性取值，避免模块加载期读 chrome.i18n） */
const canvasContextMissingError = () => new Error(i18n("global_content_error_canvas"))
const qrNotFoundError = () => new Error(i18n("qr_decode_error_not_found"))

/** 一条扫码结果 */
export interface QRScanResult {
  data: string
  element: HTMLElement
}

type JsQrDecoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number
) => QRCode | null

let decoderPromise: Promise<JsQrDecoder> | null = null

/**
 * 懒加载 jsQR，并缓存 Promise 保证只加载一次。
 * 加载失败时清空缓存，让下一次调用可以重试而不是永久失败。
 */
const loadDecoder = (): Promise<JsQrDecoder> => {
  decoderPromise ??= import("jsqr")
    .then((module) => module.default)
    .catch((error: unknown) => {
      decoderPromise = null
      throw error
    })

  return decoderPromise
}

/** 从一个 <canvas> 元素解码 QR */
export const readFromCanvas = async (
  canvas: HTMLCanvasElement
): Promise<string> => {
  const ctx = canvas.getContext("2d")
  if (!ctx) throw canvasContextMissingError()

  const decode = await loadDecoder()
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = decode(imageData.data, imageData.width, imageData.height)

  if (!code) throw qrNotFoundError()
  return code.data
}

/** 从一个 <img> 元素解码 QR（先绘制到离屏 canvas） */
export const readFromImage = async (img: HTMLImageElement): Promise<string> => {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw canvasContextMissingError()

  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0, img.width, img.height)

  const decode = await loadDecoder()
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = decode(imageData.data, imageData.width, imageData.height)

  if (!code) throw qrNotFoundError()
  return code.data
}

/** 从用户选择的本地图片文件解码 QR */
export const readFromFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        readFromImage(img).then(resolve).catch(reject)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** 扫描当前页面所有 canvas / img 中第一个 QR */
export const scanPage = async (): Promise<QRScanResult> => {
  for (const canvas of Array.from(document.querySelectorAll("canvas"))) {
    try {
      const data = await readFromCanvas(canvas)
      return { data, element: canvas }
    } catch {
      // 继续尝试下一个元素
    }
  }

  for (const img of Array.from(document.querySelectorAll("img"))) {
    try {
      const data = await readFromImage(img)
      return { data, element: img }
    } catch {
      // 继续尝试下一个元素
    }
  }

  throw new Error(i18n("qr_decode_error_no_valid_qr"))
}
