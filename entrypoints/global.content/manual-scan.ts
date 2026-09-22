import { ActionType } from "~/utils/types"
import { createContentIntake } from "~/features/otp-intake"
import message from "~/features/page-ui/toast"
import { i18n } from "~/utils/i18n"

import { captureAndDecode, createScreenshotOverlay } from "./overlay"

/** Toast 默认时长 60s（让用户有充分时间完成截图操作） */
const DEFAULT_TOAST_DURATION_MS = 60_000

/** manual-scan 的 content-side intake：popup 已关闭，由 content script 接管 */
const runIntake = createContentIntake({
  // manual-scan 没有 URL/meta 提示账号，让 intake 走 prompt
  hintAccount: undefined
})

/**
 * 手动截图模式：注入 overlay + 选区 → 截图 → 识别 QR → intake 落库。
 *
 * 由 popup 触发（通过 MANUAL_SCREENSHOT action 消息）。
 */
export const startManualScreenshot = async (
  messageText: string
): Promise<void> => {
  const toastVm = message.info(messageText, DEFAULT_TOAST_DURATION_MS)

  const overlay = createScreenshotOverlay(async (area) => {
    toastVm.destroy()
    try {
      const qrData = await captureAndDecode(area)
      await runIntake({ kind: "qr-data", data: qrData })
    } catch (error) {
      const err = error as Error
      message.error(i18n("manual_scan_decode_failed", err.message))
    }
  })

  // ESC 时 overlay 内部已 dismiss，这里只销毁 toast
  const originalDismiss = overlay.dismiss
  overlay.dismiss = () => {
    toastVm.destroy()
    originalDismiss()
  }

  // 路径收敛到 messageMap（候选 B 阶段处理）。当前先保留裸 sendResponse 路径。
  void ActionType.MANUAL_SCREENSHOT
}
