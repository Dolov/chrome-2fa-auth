import { displayRecoveryCodeSaveMessage } from "~/utils/ui"
import { getOTPList } from "~/utils/storage"
import { waitForElement } from "~/utils/helpers"
import { Issuers } from "~/utils/constant"

import {
  GITHUB_RECOVERY_ITEM_SELECTOR,
  GITHUB_RECOVERY_LIST_SELECTOR,
  getGitHubUserName
} from "./helpers"

/**
 * GitHub recovery codes 页：提示用户保存到本地
 * 适用 URL：github.com/settings/auth/recovery-codes
 */
export const setupGitHubRecover = async (): Promise<void> => {
  const account = getGitHubUserName()
  const data = await getOTPList(Issuers.GITHUB, account)
  if (data.length === 0) return
  const ul = await waitForElement<HTMLUListElement>(GITHUB_RECOVERY_LIST_SELECTOR)
  const liTags: HTMLLIElement[] = Array.from(
    ul.querySelectorAll(GITHUB_RECOVERY_ITEM_SELECTOR)
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