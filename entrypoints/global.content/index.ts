import { handleSiteAction } from "~/features/messaging"
import { createContentIntake } from "~/features/otp-intake"
import { ActionType } from "~/utils/types"
import { scanPage } from "~/utils/qr-decode"
import { i18n } from "#i18n"

import { startManualScreenshot } from "./manual-scan"

/**
 * 全局 content script 聚合入口
 *
 * matches: <all_urls>（通用工具，弹窗触发）
 * dispatch：按消息 action 路由
 *   - AUTOSCAN          → 扫页面第一个 QR，把结果交给 intake（架构报告 friction #2）。
 *                          - 命中 → intake 走 parse / prompt / persist / toast 完整流程
 *                          - 未扫到 → 降级到 MANUAL_SCREENSHOT
 *                          - popup 已关闭，所有反馈走 page-side toast
 *   - MANUAL_SCREENSHOT → 手动截图选区识别
 *
 * cleanup：所有 listener 通过 browser.runtime.onMessage 注册，
 *         ctx.onInvalidated 时移除（inject-use-ctx-invalidated 的手动版）。
 */
export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: false,
  main(ctx) {
    const runContentIntake = createContentIntake({
      hintAccount: undefined
    })

    handleSiteAction(
      ctx,
      browser.runtime.onMessage,
      ActionType.AUTOSCAN,
      async () => {
        const result = await scanPage().catch(() => null)
        if (result == null) {
          // 未扫到二维码 → 直接降级到手动截图模式（popup 已关闭，复用 fallback 文案）
          void startManualScreenshot(i18n.t("autoscan_no_qr_fallback_msg"))
          return { success: false }
        }

        await runContentIntake({ kind: "qr-data", data: result.data })
        return { success: true }
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
