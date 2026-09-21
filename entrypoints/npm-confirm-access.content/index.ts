import { getOTPList } from "~/utils/storage"
import { startOtpMessageUpdater } from "~/utils/ui"
import { extractDynamicSegment, waitForElement } from "~/utils/helpers"
import { Issuers } from "~/utils/constant"

/**
 * NPM 二步验证页（www.npmjs.com/*）：自动填充 OTP
 *
 * NPM 是 SPA，URL 变化重跑 setup。
 */
export default defineContentScript({
  matches: ["https://www.npmjs.com/*"],
  allFrames: false,
  main(ctx) {
    // https://www.npmjs.com/login/otp?next=%2Fsettings%2Fshisongyan%2Ftfa%2Flist

    const setup = async () => {
      const input = await waitForElement<HTMLInputElement>("input[id=login_otp]")
      const account = extractDynamicSegment(decodeURIComponent(location.href), [
        "/settings/*/tfa",
        "/settings/*/recovery-codes"
      ])
      if (!account) return
      const issuer = Issuers.NPM
      const data = await getOTPList(issuer, account)
      if (data.length === 0) return
      startOtpMessageUpdater(input, data[0].secret, {
        style: {
          marginTop: "6px",
          marginBottom: "8px"
        }
      })
    }

    setup()
    ctx.addEventListener(window, "wxt:locationchange", () => {
      setup()
    })
  }
})