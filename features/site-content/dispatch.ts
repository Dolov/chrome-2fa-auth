import { classifyByPathname, type SiteAdapter } from "./site-adapter"
import { fillOtp } from "./actions/fill-otp"
import { setupReadQR } from "./actions/read-qr"
import { setupRecoverCodes } from "./actions/recover"

/**
 * 内容脚本的入口 dispatch：按当前 URL 路由决策，然后交给对应 action。
 * SPA 路由变化时通过 ctx.addEventListener('wxt:locationchange') 重跑。
 */
export const dispatchSiteAction = (
  adapter: SiteAdapter,
  ctx: { addEventListener: Window["addEventListener"] extends never ? never : any }
) => {
  const run = () => {
    const action = classifyByPathname(adapter, window.location.pathname)
    if (action === "fill-otp") return fillOtp(adapter)
    if (action === "read-qr") return setupReadQR(adapter)
    if (action === "recover") return setupRecoverCodes(adapter)
  }

  run()

  if (ctx) {
    ctx.addEventListener(window, "wxt:locationchange", () => run())
  }
}
