import jsQR from "jsqr"

/** 从 `<img>` 读取二维码（先绘制到离屏 canvas） */
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

/** 从上传的图像文件读取二维码 */
export const readQRCodeFromFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        readQRCodeFromImage(img).then(resolve).catch(reject)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
