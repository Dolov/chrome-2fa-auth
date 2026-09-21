import { isOtpAuthUrl, parseOtpAuthUrl } from "~/utils/auth"
import { saveOTP } from "~/utils/storage"
import message from "~/utils/message"

import { captureAndDecode, createScreenshotOverlay } from "./overlay"

/** Toast 默认时长 60s（让用户有充分时间完成截图操作） */
const DEFAULT_TOAST_DURATION_MS = 60_000

/**
 * 手动截图模式：注入 overlay + 选区 → 截图 → 识别 QR → 保存。
 *
 * 由 popup 触发（通过 MANUAL_SCREENSHOT action 消息）。
 */
export const startManualScreenshot = async (messageText: string): Promise<void> => {
  const toastVm = message.info(messageText, DEFAULT_TOAST_DURATION_MS)

  const overlay = createScreenshotOverlay(async (area) => {
    toastVm.destroy()
    try {
      const qrData = await captureAndDecode(area)
      handleQRResult(qrData)
    } catch (error) {
      const err = error as Error
      message.error(`解析二维码失败：${err.message}`)
    }
  })

  // ESC 时 overlay 内部已 dismiss，这里只销毁 toast
  const originalDismiss = overlay.dismiss
  overlay.dismiss = () => {
    toastVm.destroy()
    originalDismiss()
  }
}

const handleQRResult = async (qrData: string): Promise<void> => {
  if (!isOtpAuthUrl(qrData)) {
    message.warn(
      `检测到二维码，但其格式【${qrData}】不符合 OTPAuth 规范`,
      10_000
    )
    return
  }

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