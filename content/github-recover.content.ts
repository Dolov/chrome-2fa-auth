import { displayRecoveryCodeSaveMessage } from "~/utils/ui"
import { getOTPList } from "~/utils/storage"
import { waitForElement } from "~/utils/helpers"
import { Issuers } from "~/utils/constant"

import { getGitHubUserName } from "~/utils/github"

/**
 * GitHub recovery codes 页：提示用户保存
 */
export default defineContentScript({
  matches: [
    "https://github.com/settings/auth/recovery-codes",
    "https://github.com/settings/auth/recovery-codes?"
  ],
  allFrames: false,
  main(ctx) {
    const saveRecoveryCodes = async () => {
      const account = getGitHubUserName()
      const data = await getOTPList(Issuers.GITHUB, account)
      if (data.length === 0) return
      const ul = await waitForElement<HTMLUListElement>(
        `ul.two-factor-recovery-codes`
      )
      const liTags: HTMLLIElement[] = Array.from(
        ul.querySelectorAll("li.two-factor-recovery-code")
      )

      const codes = liTags.map((p) => p.innerText).filter((p) => p.length > 0)
      if (codes.length === 0) return
      displayRecoveryCodeSaveMessage(
        ul,
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

    saveRecoveryCodes()
  }
})