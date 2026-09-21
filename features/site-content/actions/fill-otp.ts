import { getOTPList } from "~/features/otp-store/store"
import { startOtpMessageUpdater } from "~/features/page-ui/otp-autofill"
import { waitForElement } from "~/features/site-content/dom/wait-element"

import type { SiteAdapter } from "../site-adapter"

/**
 * fill-otp 行为：根据 adapter 拿到 OTP 输入框和当前账号，
 * 拉出所有匹配账号，逐条挂上自动填充 / 提示容器。
 */
export const fillOtp = async (adapter: SiteAdapter) => {
  const input = await waitForElement<HTMLInputElement>(
    adapter.selectors.otpInput,
    false
  )
  const account = await adapter.resolveAccount()
  if (!account) return

  const data = await getOTPList(adapter.issuer, account)
  if (data.length === 0) return

  data.forEach((item) => {
    const { account: itemAccount, secret } = item
    startOtpMessageUpdater(input, secret, {
      account: itemAccount,
      autoFill: data.length === 1,
      style: adapter.fillOtpItemStyle ?? {}
    })
  })
}
