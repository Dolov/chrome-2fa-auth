import React from "react"

import { useSettings } from "./use-settings"

/**
 * 读取并应用主题：把选定主题写到 `<html data-theme>`。
 *
 * popup / settings 都调用它来保证「存储里的主题」= 「页面上的主题」；
 * 副作用集中在这里，调用方只关心当前值与设置函数。
 */
export const useThemeChange = () => {
  const [settings, patchSettings] = useSettings()
  const { theme } = settings

  React.useEffect(() => {
    if (!theme) return
    const html = document.querySelector("html")
    if (!html) return
    html.setAttribute("data-theme", theme)
  }, [theme])

  const setTheme = (next: string) => {
    void patchSettings({ theme: next })
  }

  return [theme, setTheme] as const
}
