import { getOTPList } from "~/utils/storage"
import { displayRecoveryCodeSaveMessage } from "~/utils/ui"
import { extractDynamicSegment } from "~/utils/helpers"
import { Issuers } from "~/utils/constant"

/**
 * NPM recovery codes 页
 */
export default defineContentScript({
  matches: ["https://www.npmjs.com/settings/*/recovery-codes"],
  allFrames: false,
  main(ctx) {
    const init = async () => {
      const account = extractDynamicSegment(
        location.href,
        "/settings/*/recovery-codes"
      )
      if (!account) return
      const data = await getOTPList(Issuers.NPM, account)
      if (data.length === 0) return
      const container = document.querySelector(
        'div[role="button"][tabindex="0"]'
      ) as HTMLDivElement
      const pTags = container.querySelectorAll("p")
      const codes = Array.from(pTags)
        .map((p) => p.innerText)
        .filter((p) => p.length > 0)

      if (codes.length === 0) return

      displayRecoveryCodeSaveMessage(
        container,
        {
          ...data[0],
          recoveryCodes: codes.map((p) => ({ value: p, copied: false }))
        },
        {
          containerStyle: {
            marginBottom: "16px"
          }
        }
      )
    }

    init()
  }
})