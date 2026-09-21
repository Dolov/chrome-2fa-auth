import React from "react"

import { useStorage } from "~/utils/storage-hook"

import { DEFAULT_SETTINGS, StorageKey, type DataProps } from "./constant"

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
    html.setAttribute("data-theme", theme)
  }, [theme])

  return [theme, setTheme] as const
}

export const useUpdateCopiedCodeStatus = () => {
  const [data, setData] = useStorage<DataProps[]>(StorageKey.DATA, [])

  const updater = React.useCallback(
    async (id: string, copiedCode: string): Promise<void> => {
      let updated = false

      const newData = data.map((item) => {
        if (item.id !== id || !Array.isArray(item.recoveryCodes)) {
          return item
        }

        const updatedCodes = item.recoveryCodes.map((code) => {
          if (code.value === copiedCode && !code.copied) {
            updated = true
            return { ...code, copied: true }
          }
          return code
        })

        return { ...item, recoveryCodes: updatedCodes }
      })

      if (updated) {
        setData(newData)
      }
    },
    [data, setData]
  )

  return [updater, data] as const
}
