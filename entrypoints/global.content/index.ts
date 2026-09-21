import { highlightElement } from "~/utils/dom-highlight"
import { ActionType } from "~/utils/constant"

import { scanQRCode } from "./scan"
import { startManualScreenshot } from "./manual-scan"

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
    ctx.addEventListener(browser.runtime.onMessage, (
      message,
      _sender,
      sendResponse
    ) => {
      if (message.action === ActionType.AUTOSCAN) {
        scanQRCode()
          .then((result) => {
            highlightElement(result.element)
            sendResponse({ success: true, data: result.data })
          })
          .catch((error: Error) => {
            sendResponse({ success: false, error: error.message })
          })
      } else if (message.action === ActionType.MANUAL_SCREENSHOT) {
        void startManualScreenshot(message.message as string)
      }
      return true
    })
  }
})