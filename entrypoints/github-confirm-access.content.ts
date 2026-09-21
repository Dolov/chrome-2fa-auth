import { getOTPList } from "~/utils/storage"
import { startOtpMessageUpdater } from "~/utils/ui"
import { waitForElement } from "~/utils/helpers"
import { Issuers } from "~/utils/constant"

import { getGitHubUserName } from "~/utils/github"

/**
 * GitHub 二步验证页（github.com/*）：自动填充 OTP
 *
 * GitHub 是 SPA，路由变化不会重新加载 content script。
 * 用 ctx.addEventListener('wxt:locationchange') 在 URL 变化时重跑 setup。
 */
export default defineContentScript({
  matches: ["https://github.com/*"],
  allFrames: false,
  main(ctx) {
    const setup = async () => {
      const input = await waitForElement<HTMLInputElement>(
        "input[id=app_totp][name=sudo_app_otp], input[id=app_totp][name=app_otp]",
        false
      )
      const account = getGitHubUserName()
      const issuer = Issuers.GITHUB
      const data = await getOTPList(issuer, account)
      if (data.length === 0) return
      data.forEach((item) => {
        const { account: itemAccount, secret } = item
        startOtpMessageUpdater(input, secret, {
          account: itemAccount,
          autoFill: data.length === 1,
          style: {
            marginBottom: "16px"
          }
        })
      })
    }

    setup()
    ctx.addEventListener(window, "wxt:locationchange", () => {
      setup()
    })
  }
})