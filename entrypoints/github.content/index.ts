import { dispatchSiteAction } from "~/features/site-content/dispatch"
import { githubAdapter } from "~/features/site-content/adapters/github"

/**
 * GitHub content script 聚合入口
 *
 * matches: https://github.com/*（覆盖登录/sudo/设置页全场景）
 * dispatch：按 URL 路由分发到 fill-otp / read-qr / recover
 * SPA 路由变化：用 ctx.addEventListener('wxt:locationchange') 重跑 dispatch
 *
 * cleanup：所有 setup 函数都通过 ctx 自动清理（每个内部 waitForElement
 *         / MutationObserver 闭包由 SPA 重置时丢弃）。
 */
export default defineContentScript({
  matches: ["https://github.com/*"],
  allFrames: false,
  main(ctx) {
    dispatchSiteAction(githubAdapter, ctx)
  }
})
