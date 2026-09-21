import { getOTPList } from "~/utils/storage"
import { startOtpMessageUpdater } from "~/utils/otp-autofill"
import { waitForElement } from "~/utils/dom-utils"
import { Issuers } from "~/utils/constant"

import {
  GITHUB_OTP_INPUT_SELECTOR,
  getGitHubUserName
} from "./helpers"

/**
 * GitHub 二步验证页：自动填充 OTP
 * 适用 URL：github.com 任意页（登录/sudo 重认证）
 */
export const setupGitHubFillOTP = async (): Promise<void> => {
  const input = await waitForElement<HTMLInputElement>(
    GITHUB_OTP_INPUT_SELECTOR,
    false
  )
  const account = getGitHubUserName()
  const data = await getOTPList(Issuers.GITHUB, account)
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