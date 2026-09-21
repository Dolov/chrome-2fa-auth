import { ActionType } from "~/utils/types"
import { highlightElement } from "~/features/page-ui/highlight"
import { scanPage } from "~/utils/qr-decode"
import { handleSiteAction } from "~/features/messaging"

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
    handleSiteAction(ctx, browser.runtime.onMessage, ActionType.AUTOSCAN, () => {
      return scanPage()
        .then((result) => {
          highlightElement(result.element)
          return { success: true, data: result.data }
        })
        .catch((error: Error) => {
          return { success: false, error: error.message }
        })
    })

    handleSiteAction(
      ctx,
      browser.runtime.onMessage,
      ActionType.MANUAL_SCREENSHOT,
      ({ message }) => {
        void startManualScreenshot(message)
        return undefined
      }
    )
  }
})
