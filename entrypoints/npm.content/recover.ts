import { displayRecoveryCodeSaveMessage } from "~/utils/recovery-prompt"
import { getOTPList } from "~/utils/storage"
import { extractDynamicSegment } from "~/utils/dom-utils"
import { Issuers } from "~/utils/constant"

/**
 * NPM recovery codes 页：提示用户保存到本地
 * 适用 URL：www.npmjs.com/settings/<user>/recovery-codes
 */
export const setupNpmRecover = async (): Promise<void> => {
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
  if (!container) return

  const codes = Array.from(container.querySelectorAll("p"))
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