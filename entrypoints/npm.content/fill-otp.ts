import { getOTPList } from "~/utils/storage"
import { startOtpMessageUpdater } from "~/utils/ui"
import { extractDynamicSegment, waitForElement } from "~/utils/dom-utils"
import { Issuers } from "~/utils/constant"

import { NPM_OTP_INPUT_SELECTOR } from "./helpers"

/**
 * NPM 二步验证页：自动填充 OTP
 * 适用 URL：www.npmjs.com/login/otp?next=/settings/<user>/...
 */
export const setupNpmFillOTP = async (): Promise<void> => {
  const input = await waitForElement<HTMLInputElement>(NPM_OTP_INPUT_SELECTOR)
  const account = extractDynamicSegment(decodeURIComponent(location.href), [
    "/settings/*/tfa",
    "/settings/*/recovery-codes"
  ])
  if (!account) return
  const data = await getOTPList(Issuers.NPM, account)
  if (data.length === 0) return
  startOtpMessageUpdater(input, data[0].secret, {
    style: {
      marginTop: "6px",
      marginBottom: "8px"
    }
  })
}