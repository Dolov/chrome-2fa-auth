import React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import ThemeTile from "./theme-tile"
import { THEMES } from "./themes"

import { useThemeChange } from "~/features/ui-state/use-theme-change"
import { i18n } from "#i18n"

/** 收起态铺 10 张：32 套全铺会把下面两组设置挤出首屏 */
const COLLAPSED_THEME_COUNT = 10

type ToggleState = "collapsed" | "expanded"

/** 状态 → 呈现的查找表：标签与箭头同进同出，JSX 里不留条件分支 */
const TOGGLE_VIEW = {
  collapsed: { Icon: ChevronDown, labelKey: "settings_theme_expand" },
  expanded: { Icon: ChevronUp, labelKey: "settings_theme_collapse" }
} as const

/**
 * 主题网格：收起态 10 张磁贴，展开后 32 套全铺。
 *
 * 选中即写存储，页面自身的 `data-theme` 随之改变（useThemeChange 负责），
 * 所以「选中的那一套」就是此刻页面正在呈现的那一套。
 *
 * 展开状态是页面内的临时视图，不进存储：下次打开设置页仍回到 10 张，
 * 选中的主题在收起态不可见也不影响，页面本身就是它的实时预览。
 */
const ThemeGrid: React.FC = () => {
  const [theme, setTheme] = useThemeChange()
  const [toggleState, setToggleState] = React.useState<ToggleState>("collapsed")

  const isExpanded = toggleState === "expanded"
  const visibleThemes = isExpanded
    ? THEMES
    : THEMES.slice(0, COLLAPSED_THEME_COUNT)
  const { Icon, labelKey } = TOGGLE_VIEW[toggleState]

  const toggleExpanded = () =>
    setToggleState(isExpanded ? "collapsed" : "expanded")

  return (
    <div className="flex flex-col gap-4">
      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {visibleThemes.map((name) => (
          <ThemeTile
            key={name}
            name={name}
            onSelect={setTheme}
            isSelected={name === theme}
          />
        ))}
      </div>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={toggleExpanded}
        className="group flex w-full cursor-pointer items-center justify-center gap-3 py-1 text-[13px] text-base-content/70 transition-colors hover:text-base-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <span className="h-px w-10 bg-base-300 transition-colors group-hover:bg-base-content/40" />
        <span className="flex items-center gap-1.5">
          <Icon size={16} />
          {i18n.t(labelKey)}
        </span>
        <span className="h-px w-10 bg-base-300 transition-colors group-hover:bg-base-content/40" />
      </button>
    </div>
  )
}

export default ThemeGrid
