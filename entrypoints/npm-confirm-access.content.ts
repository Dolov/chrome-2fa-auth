import {
  extractDynamicSegment,
  getOTPList,
  Issuers,
  startOtpMessageUpdater,
  waitForElement
} from "~/utils"

export default defineContentScript({
  matches: ["https://www.npmjs.com/*"],
  allFrames: false,
  main() {
    // https://www.npmjs.com/login/otp?next=%2Fsettings%2Fshisongyan%2Ftfa%2Flist

    const waitConfirmAccess = async () => {
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

    waitConfirmAccess()
  }
})