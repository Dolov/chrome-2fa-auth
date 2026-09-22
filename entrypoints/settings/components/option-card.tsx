import React from "react"

import { cn } from "~/utils/cn"

interface OptionCardProps<T extends string> {
  name: string
  value: T
  children: React.ReactNode
  onChange(value: T): void
  className?: string
  isSelected: boolean
}

/**
 * 单选项卡片：`label` 包一个 sr-only radio，整卡可点、可 Tab、方向键可切换。
 *
 * **`relative` 不能删。** `sr-only` 是 `position: absolute`，一旦这张卡片不是定位
 * 元素，隐藏 radio 的包含块就会落到初始包含块（文档层），把文档撑到 1400+ px。
 * 于是聚焦卡片时浏览器去滚窗口而不是内层滚动容器：顶栏与正文被顶出视口，
 * 下半屏看起来一片空白，且滚轮救不回来。
 */
const OptionCard = <T extends string>(props: OptionCardProps<T>) => {
  const { name, value, children, onChange, isSelected, className } = props

  return (
    <label
      className={cn(
        "relative cursor-pointer rounded-box border-2 p-3 transition-colors",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
        {
          "border-primary": isSelected,
          "border-base-300 hover:border-base-content/40": !isSelected
        },
        className
      )}>
      <input
        name={name}
        type="radio"
        value={value}
        checked={isSelected}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      {children}
    </label>
  )
}

export default OptionCard
