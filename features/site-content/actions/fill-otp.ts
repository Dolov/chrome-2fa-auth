import { getOTPList } from "~/features/otp-store/store"
import { startOtpMessageUpdater } from "~/features/page-ui/otp-autofill"
import { waitForElement } from "~/features/site-content/dom/wait-element"

import type { SiteAdapter } from "../site-adapter"

/**
 * fill-otp 行为：根据 adapter 拿到 OTP 输入框和当前账号，
 * 拉出所有匹配账号，逐条挂上自动填充 / 提示容器。
 *
 * 返回 `dispose`：清除所有 updater 的计时器 + 移除注入的 DOM，供
 * `dispatch.ts` 在 SPA 路由切换时调用，避免 leak。
 */
export const fillOtp = async (adapter: SiteAdapter): Promise<() => void> => {
  const input = await waitForElement<HTMLInputElement>(
    adapter.selectors.otpInput,
    false
  )
  const account = await adapter.resolveAccount()
  if (!account) return () => {}

  const data = await getOTPList(adapter.issuer, account)
  if (data.length === 0) return () => {}

  const disposes: Array<() => void> = []
  data.forEach((item) => {
    const { dispose } = startOtpMessageUpdater(input, item, {
      account: item.account,
      autoFill: data.length === 1,
      style: adapter.fillOtpItemStyle ?? {}
    })
    disposes.push(dispose)
  })

  return () => {
    for (const dispose of disposes) dispose()
  }
}
