import { handleSiteAction } from "~/features/messaging"
import { runVisualScan } from "~/features/page-ui/scan-sequence"
import { ActionType } from "~/utils/types"

import { startManualScreenshot } from "./manual-scan"

/**
 * 全局 content script 聚合入口
 *
 * matches: <all_urls>（通用工具，弹窗触发）
 * dispatch：按消息 action 路由
 *   - AUTOSCAN          → 可视化扫描页面 QR（scan-sequence）
 *   - MANUAL_SCREENSHOT → 手动截图选区识别
 *
 * cleanup：所有 listener 通过 browser.runtime.onMessage 注册，
 *         ctx.onInvalidated 时移除（inject-use-ctx-invalidated 的手动版）。
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: false,
  main(ctx) {
    handleSiteAction(
      ctx,
      browser.runtime.onMessage,
      ActionType.AUTOSCAN,
      () => {
        return runVisualScan()
          .then((result) => {
            return { success: true, data: result.data }
          })
          .catch((error: Error) => {
            return { success: false, error: error.message }
          })
      }
    )

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
