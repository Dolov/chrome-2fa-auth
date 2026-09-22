import React from "react"

import { cn } from "~/utils/cn"
import { ContainerType } from "~/utils/types"

import { PopupContext } from "../context"
import PhoneFrame from "./phone-frame"

export interface LayoutProps {
  children: React.ReactNode
  className?: string
}

/**
 * popup 外层壳：根据 `ContainerType` 在「标准面板」与「手机外形」之间切换。
 *
 * 与 `ContainerType` 枚举**仅在路径上同名**——本组件是 React 组件名，枚举是
 * PHONE / DEFAULT 的字面量。详见 CONTEXT.md 命名冲突表。
 */
const Layout: React.FC<LayoutProps> = (props) => {
  const { children } = props
  const { containerType } = React.useContext(PopupContext)
  if (containerType === ContainerType.PHONE) {
    return (
      <PhoneFrame className="relative w-[378px] h-[600px]">{children}</PhoneFrame>
    )
  }
  return (
    <div
      className={cn(
        "relative w-[350px] h-[600px] bg-base-100 flex flex-col pb-4"
      )}>
      {children}
    </div>
  )
}

export default Layout
