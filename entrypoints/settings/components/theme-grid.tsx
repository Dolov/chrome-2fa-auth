import React from "react"

import ThemeTile from "./theme-tile"
import { THEMES } from "./themes"

import { useThemeChange } from "~/features/ui-state/use-theme-change"

/**
 * 主题网格：32 张磁贴 + 当前选中态。
 *
 * 选中即写存储，页面自身的 `data-theme` 随之改变（useThemeChange 负责），
 * 所以「选中的那一套」就是此刻页面正在呈现的那一套。
 */
const ThemeGrid: React.FC = () => {
  const [theme, setTheme] = useThemeChange()

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {THEMES.map((name) => (
        <ThemeTile
          key={name}
          name={name}
          onSelect={setTheme}
          isSelected={name === theme}
        />
      ))}
    </div>
  )
}

export default ThemeGrid
