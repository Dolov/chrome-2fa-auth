import { ActionType } from "~/utils/constant"
import { highlightElement } from "~/utils/dom-highlight"
import { scanPage } from "~/utils/qr"

import { startManualScreenshot } from "./manual-scan"

/** chrome.runtime.onMessage 监听器签名（runtime 不在 WXT ctx 静态类型里） */
type RuntimeMessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | void

/** 从未知消息里安全取 action 字段 */
const getAction = (message: unknown): unknown =>
  typeof message === "object" && message !== null && "action" in message
    ? (message as { action: unknown }).action
    : undefined

/** 从未知消息里安全取 message 文本 */
const getMessageText = (message: unknown): string => {
  if (typeof message !== "object" || message === null) return ""
  const text = (message as { message?: unknown }).message
  return typeof text === "string" ? text : ""
}

/**
 * 全局 content script 聚合入口
 *
 * matches: <all_urls>（通用工具，弹窗触发）
 * dispatch：按消息 action 路由
 *   - AUTOSCAN          → 自动扫描页面 QR
 *   - MANUAL_SCREENSHOT → 手动截图选区识别
 *
 * cleanup：所有 listener 通过 ctx.addEventListener 注册，context
 *         invalidated 时由 WXT 自动清理（inject-use-ctx-invalidated）。
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: false,
  main(ctx) {
    // msg-return-true-for-async：返回 true 让 sendResponse 异步生效
    const listener: RuntimeMessageListener = (message, _sender, sendResponse) => {
      const action = getAction(message)

      if (action === ActionType.AUTOSCAN) {
        scanPage()
          .then((result) => {
            highlightElement(result.element)
            sendResponse({ success: true, data: result.data })
          })
          .catch((error: Error) => {
            sendResponse({ success: false, error: error.message })
          })
        return true
      }

      if (action === ActionType.MANUAL_SCREENSHOT) {
        void startManualScreenshot(getMessageText(message))
        return false
      }

      return false
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ctx.addEventListener as unknown as (target: any, listener: any) => void)(
      browser.runtime.onMessage,
      listener
    )
  }
})
