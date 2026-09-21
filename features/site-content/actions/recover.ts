import { getOTPList } from "~/utils/storage"
import { displayRecoveryCodeSaveMessage } from "~/utils/recovery-prompt"
import { waitForElement } from "~/utils/dom-utils"

import type { SiteAdapter } from "../site-adapter"

/**
 * recover 行为：找出 DOM 上的恢复码，提示用户保存到本地扩展。
 *
 * - adapter.extractRecoveryCodes 未提供时，按 selectors.recoveryList +
 *   selectors.recoveryItem 读 innerText。
 */
export const setupRecoverCodes = async (adapter: SiteAdapter) => {
  const account = await adapter.resolveAccount()
  if (!account) return

  const data = await getOTPList(adapter.issuer, account)
  if (data.length === 0) return

  const codes = await (adapter.extractRecoveryCodes ?? defaultRecover)(adapter)
  if (!codes || codes.length === 0) return

  displayRecoveryCodeSaveMessage(
    document.body,
    {
      ...data[0]!,
      recoveryCodes: codes.map((value) => ({ value, copied: false }))
    },
    { containerStyle: adapter.recoveryContainerStyle }
  )
}

const defaultRecover = async (adapter: SiteAdapter): Promise<string[] | null> => {
  if (!adapter.selectors.recoveryList) return null

  const container = await waitForElement<HTMLElement>(
    adapter.selectors.recoveryList
  ).catch(() => null)
  if (!container) return null

  const itemSelector = adapter.selectors.recoveryItem
  const codes = itemSelector
    ? Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
    : Array.from(container.children) as HTMLElement[]

  return codes
    .map((el) => el.innerText)
    .filter((text) => text.length > 0)
}
