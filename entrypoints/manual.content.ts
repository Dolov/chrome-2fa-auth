import jsQR from "jsqr"

import { isOtpAuthUrl, parseOtpAuthUrl } from "~/utils/auth"
import { saveOTP } from "~/utils/storage"
import { createSelectionBox } from "~/utils/ui"
import { ActionType, contentBaseZindex } from "~/utils/constant"
import message from "~/utils/message"

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: false,
  main() {
    const debugCanvasSelector = "github-2fa-container-1742783738736-debug-canvas"

    // 监听消息并确保发送响应
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === ActionType.MANUAL_SCREENSHOT) {
        addScreenshotOverlay(sendResponse, message.message)
      }

      return true
    })

    // 🎯 选取截图区域
    const addScreenshotOverlay = (sendResponse, messageText) => {
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

      const messageVm = message.info(messageText, 60000)

      const handleEsc = (e) => {
        if (e.key !== "Escape") return
        dismissAll()
      }

      const dismissAll = () => {
        overlay.remove()
        messageVm.destroy()
        const debugCanvas = document.querySelectorAll(`.${debugCanvasSelector}`)
        debugCanvas.forEach((canvas) => canvas.remove())
        selectionBox && selectionBox.remove()
        document.removeEventListener("keydown", handleEsc)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("mousemove", handleMouseMove)
      }

      let startX, startY, endX, endY, selectionBox
      let isMouseDown = false

      overlay.addEventListener("mousedown", (e) => {
        startX = e.clientX
        startY = e.clientY
        isMouseDown = true

        const box = createSelectionBox(startX, startY, contentBaseZindex + 1)

        if (selectionBox) {
          selectionBox.remove()
          selectionBox = null
        }
        selectionBox = box.element
        document.body.appendChild(selectionBox)
        document.addEventListener("mousemove", handleMouseMove)
      })

      const handleMouseMove = (e) => {
        if (!selectionBox || !isMouseDown) return
        endX = e.clientX
        endY = e.clientY

        selectionBox.style.left = Math.min(startX, endX) + "px"
        selectionBox.style.top = Math.min(startY, endY) + "px"
        selectionBox.style.width = Math.abs(endX - startX) + "px"
        selectionBox.style.height = Math.abs(endY - startY) + "px"
      }

      const handleMouseUp = (e) => {
        isMouseDown = false
        document.removeEventListener("mousemove", handleMouseMove)
        if (!selectionBox) return

        chrome.runtime.sendMessage(
          { action: ActionType.CAPTURE_SCREENSHOT },
          async (response) => {
            if (!response.success) {
              message.error("截图失败")
              return
            }

            const qrData = await cropImage(
              response.image,
              startX,
              startY,
              endX - startX,
              endY - startY
            ).catch((error) => {
              message.error(`解析二维码失败：${error.message}`)
            })
            if (!qrData) return
            const available = isOtpAuthUrl(qrData)
            if (!available) {
              message.warn(
                `检测到二维码，但其格式【${qrData}】不符合 OTPAuth 规范`,
                10000
              )
              return
            }
            dismissAll()
            const parsed = parseOtpAuthUrl(qrData)
            if (!parsed.account) {
              const account = prompt("请输入账号名称")
              if (!account) {
                message.error("请输入账号名称")
                return
              }
              parsed.account = account
            }
            await saveOTP({
              ...parsed,
              id: Date.now().toString()
            })
            message.success(`${parsed.issuer} - ${parsed.account} 添加成功`)
          }
        )
      }

      document.addEventListener("keydown", handleEsc)
      document.addEventListener("mouseup", handleMouseUp)
    }

    // 🎯 裁剪截图并解析二维码
    const cropImage = (dataUrl, x, y, width, height): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.src = dataUrl
        img.onload = () => {
          const dpr = window.devicePixelRatio || 1

          // 创建 canvas 元素
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")

          // 设置画布的实际像素尺寸为裁剪区域的大小
          canvas.width = width * dpr
          canvas.height = height * dpr

          // 裁剪图像并绘制到画布
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

          // 将裁剪后的画布转换为 Data URL（如果需要）
          const croppedDataUrl = canvas.toDataURL("image/png")
          decodeQRCode(croppedDataUrl).then(resolve).catch(reject)

          // debug 模式，将 canvas 内容插入在页面上
          if (process.env.NODE_ENV === "development") {
            canvas.classList.add(debugCanvasSelector)
            canvas.style.position = "fixed"
            canvas.style.top = "0"
            canvas.style.left = "0"
            canvas.style.zIndex = `${contentBaseZindex + 1}`
            canvas.style.border = "2px solid #2196F3"
            canvas.addEventListener("click", () => {
              canvas.remove()
            })
            document.body.appendChild(canvas)
          }
        }
        img.onerror = reject
      })
    }

    // 🎯 解析截图中二维码的内容
    const decodeQRCode = (imageDataUrl: string) => {
      return new Promise((resolve, reject) => {
        const image = new Image()
        image.src = imageDataUrl
        image.onload = () => {
          const canvas = document.createElement("canvas")
          canvas.width = image.width
          canvas.height = image.height
          const ctx = canvas.getContext("2d")
          ctx.drawImage(image, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (code) resolve(code.data)
          else reject(new Error("无法识别的二维码"))
        }
        image.onerror = () => reject(new Error("图片加载失败"))
      })
    }
  }
})