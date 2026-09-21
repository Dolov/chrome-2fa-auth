import { setupNpmFillOTP } from "./fill-otp"
import { setupNpmReadQR } from "./read-qr"
import { setupNpmRecover } from "./recover"
import {
  isNpmLoginOTPPage,
  isNpmRecoveryCodesPage,
  isNpmTfaSetupPage
} from "./helpers"

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
    const dispatch = () => {
      if (isNpmLoginOTPPage()) {
        setupNpmFillOTP()
      } else if (isNpmTfaSetupPage()) {
        setupNpmReadQR()
      } else if (isNpmRecoveryCodesPage()) {
        setupNpmRecover()
      }
    }

    dispatch()
    ctx.addEventListener(window, "wxt:locationchange", () => dispatch())
  }
})