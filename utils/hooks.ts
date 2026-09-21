import React from "react"

import { useStorage } from "~/utils/storage-hook"

import { DEFAULT_SETTINGS } from "~/utils/constants"
import { StorageKey } from "~/utils/types"

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
