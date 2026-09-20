import { getOTPList, startOtpMessageUpdater, waitForElement } from "~/utils"
import { Issuers } from "~/utils/constant"

import { getGitHubUserName } from "~/utils/github"

export default defineContentScript({
  matches: ["https://github.com/*"],
  allFrames: false,
  main() {
    const waitConfirmAccess = async () => {
      const input = await waitForElement<HTMLInputElement>(
        "input[id=app_totp][name=sudo_app_otp], input[id=app_totp][name=app_otp]",
        false
      )
      const account = getGitHubUserName()
      const issuer = Issuers.GITHUB
      const data = await getOTPList(issuer, account)
      if (data.length === 0) return
      data.forEach((item) => {
        const { account, secret } = item
        startOtpMessageUpdater(input, secret, {
          account,
          autoFill: data.length === 1,
          style: {
            marginBottom: "16px"
          }
        })
      })
    }

    waitConfirmAccess()
  }
})