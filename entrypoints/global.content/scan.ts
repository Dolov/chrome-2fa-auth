import {
  readQRCodeFromCanvas,
  readQRCodeFromImage
} from "./decoders"

/** 扫描结果：识别到的元素 + QR 内容 */
export interface QRScanResult {
  data: string
  element: HTMLElement
}

/**
 * 依次尝试解析页面中的二维码（canvas > img）。
 * 任何一种成功即返回；全部失败抛错。
 */
export const scanQRCode = async (): Promise<QRScanResult> => {
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

  throw new Error("未找到有效的二维码")
}