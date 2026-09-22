import { classifyByPathname, type SiteAdapter } from "./site-adapter"
import { fillOtp } from "./actions/fill-otp"
import { setupReadQR } from "./actions/read-qr"
import { setupRecoverCodes } from "./actions/recover"
import { disposeAllElementObservers } from "./dom/wait-element"

/**
 * 内容脚本的入口 dispatch：按当前 URL 路由决策，然后交给对应 action。
 * SPA 路由变化时通过 ctx.addEventListener('wxt:locationchange') 重跑。
 *
 * 生命周期：每次 setup（fillOtp / setupReadQR / setupRecoverCodes）返回
 * 一个 cleanup 函数，dispatch 持有它。下一次路由切换或脚本失效前会先
 * cleanup 旧资源（clearInterval / removeEventListener / container.remove）
 * + disconnect 仍存活的 wait-element observer，避免泄漏。
 *
 * 已知 race window：若 SPA 路由切换发生在 setup 的 await 期间，旧的
 * cleanup 还未注册，第二次 run() 会启动一组新 setup。极小概率，资源
 * 会随 GC 释放。
 */
export const dispatchSiteAction = (
  adapter: SiteAdapter,
  ctx: { addEventListener: Window["addEventListener"] extends never ? never : any }
) => {
  let cleanup: (() => void) | null = null

  const run = async () => {
    cleanup?.()
    cleanup = null
    disposeAllElementObservers()

    const action = classifyByPathname(adapter, window.location.pathname)
    if (action === "fill-otp") cleanup = await fillOtp(adapter)
    else if (action === "read-qr") cleanup = await setupReadQR(adapter)
    else if (action === "recover") cleanup = await setupRecoverCodes(adapter)
  }

  void run()

  if (ctx) {
    ctx.addEventListener(window, "wxt:locationchange", () => {
      void run()
    })
  }
}
