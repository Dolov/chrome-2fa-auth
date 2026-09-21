import { dispatchSiteAction } from "~/features/site-content/dispatch"
import { npmAdapter } from "~/features/site-content/adapters/npm"

/**
 * NPM content script 聚合入口
 *
 * matches: https://www.npmjs.com/*（覆盖 login/settings 全场景）
 * dispatch：按 URL 路由分发到 fill-otp / read-qr / recover
 * SPA 路由变化：用 ctx.addEventListener('wxt:locationchange') 重跑 dispatch
 */
export default defineContentScript({
  matches: ["https://www.npmjs.com/*"],
  allFrames: false,
  main(ctx) {
    dispatchSiteAction(npmAdapter, ctx)
  }
})
