import React from "react"

import { cn } from "~/utils/cn"

interface ThemeTileProps {
  name: string
  onSelect(name: string): void
  isSelected: boolean
}

/**
 * 主题磁贴 = 该主题下的「真实账户行」缩略图，而不是四格色卡。
 *
 * 颜色与圆角全部取自 `data-theme` 自身的 token（daisyUI 每个主题都会改写
 * `--color-*` 与 `--radius-*`），所以 black 的直角、wireframe 的单色也会被一起预览到。
 * 右下角三点是这套配色的签名，用来区分 light / corporate / wireframe 这类近似主题。
 */
const ThemeTile: React.FC<ThemeTileProps> = (props) => {
  const { name, onSelect, isSelected } = props

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(name)}
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-box border-2 p-1.5 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        {
          "border-primary": isSelected,
          "border-base-300 hover:border-base-content/40": !isSelected
        }
      )}>
      <span
        data-theme={name}
        className="flex flex-col rounded-field bg-base-100 p-1.5">
        <span className="relative flex flex-col overflow-hidden rounded-field bg-base-200 px-2 pb-2.5 pt-3">
          <span className="absolute left-0 top-0 h-[3px] w-2/3 rounded-r-full bg-primary" />
          <span className="text-[11px] font-medium">GitHub</span>
          <span className="mt-0.5 text-[15px] font-bold text-primary">
            385 119
          </span>
        </span>
      </span>
      <span className="flex items-center justify-between gap-2 px-0.5 pb-0.5">
        <span
          className={cn("font-mono text-[11px]", {
            "text-primary": isSelected,
            "text-base-content/55": !isSelected
          })}>
          {name}
        </span>
        <span data-theme={name} className="flex items-center gap-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="h-1.5 w-1.5 rounded-full bg-neutral" />
        </span>
      </span>
    </button>
  )
}

export default ThemeTile
