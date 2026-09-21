import React from "react"

import { useStorage } from "~/utils/storage-hook"

import { useOtpList, useOtpMutators } from "~/state/otp-store"
import { DEFAULT_SETTINGS, StorageKey } from "./constant"

export const useThemeChange = () => {
  const [settings, setSettings] = useStorage(
    StorageKey.SETTINGS,
    DEFAULT_SETTINGS
  )

  const { theme } = settings

  const setTheme = (theme: string) => {
    setSettings({
      ...settings,
      theme
    })
  }

  React.useEffect(() => {
    if (!theme) return
    const html = document.querySelector("html")
    if (!html) return
    html.setAttribute("data-theme", theme)
  }, [theme])

  return [theme, setTheme] as const
}

/**
 * 当前 OTP 列表 + 把指定恢复码标记为已复制。
 *
 * 用法：`const [markCopied, items] = useUpdateCopiedCodeStatus()`
 */
export const useUpdateCopiedCodeStatus = () => {
  const items = useOtpList()
  const { markRecoveryCodeCopied } = useOtpMutators()

  const updater = React.useCallback(
    async (id: string, copiedCode: string) => {
      await markRecoveryCodeCopied(id, copiedCode)
    },
    [markRecoveryCodeCopied]
  )

  return [updater, items] as const
}
