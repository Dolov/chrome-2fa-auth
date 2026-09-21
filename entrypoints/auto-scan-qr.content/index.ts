import { highlightElement } from "~/utils/ui"
import { ActionType } from "~/utils/constant"

import { scanQRCode } from "./scan"

/**
 * 自动扫描页面 QR
 *
 * matches: <all_urls>：扫描所有页面，需要持久 listener。
 * cleanup：ctx.addEventListener 在 context invalidated 时自动移除监听器
 *         （inject-use-ctx-invalidated）。
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
      }
      return true
    })
  }
})