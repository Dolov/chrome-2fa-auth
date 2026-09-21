import jsQR from "jsqr"

/** 唯一允许出现的 jsQR 实例错误文案（翻译键与原 utils/helpers.ts 保持一致） */
const CANVAS_CONTEXT_MISSING = "无法获取 Canvas 上下文"
const QR_NOT_FOUND = "未找到二维码"

/** 一条扫码结果 */
export interface QRScanResult {
  data: string
  element: HTMLElement
}

/** 从一个 <canvas> 元素解码 QR */
export const readFromCanvas = (canvas: HTMLCanvasElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext("2d")
    if (!ctx) return reject(new Error(CANVAS_CONTEXT_MISSING))

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    code ? resolve(code.data) : reject(new Error(QR_NOT_FOUND))
  })
}

/** 从一个 <img> 元素解码 QR（先绘制到离屏 canvas） */
export const readFromImage = (img: HTMLImageElement): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return reject(new Error(CANVAS_CONTEXT_MISSING))

    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0, img.width, img.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    code ? resolve(code.data) : reject(new Error(QR_NOT_FOUND))
  })
}

/** 从一个 Data URL 字符串解码 QR（异步 Image 加载后绘制） */
export const readFromDataUrl = (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error(CANVAS_CONTEXT_MISSING))
      ctx.drawImage(image, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      code ? resolve(code.data) : reject(new Error(QR_NOT_FOUND))
    }
    image.onerror = () => reject(new Error("图片加载失败"))
    image.src = imageDataUrl
  })
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

  throw new Error("未找到有效的二维码")
}
