import jsQR from "jsqr"

/** 解析 <canvas> 元素里的二维码 */
export const readQRCodeFromCanvas = (
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

/** 解析 <img> 元素里的二维码（先绘制到离屏 canvas） */
export const readQRCodeFromImage = (img: HTMLImageElement): Promise<string> => {
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