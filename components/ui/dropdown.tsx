import React from "react"
import type { ReactNode } from "react"

import { cn } from "~/utils/cn"

export type DropdownPlacement =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight"

const PLACEMENT_CLASSES: Record<DropdownPlacement, string> = {
  topLeft: "dropdown-top dropdown-start",
  topCenter: "dropdown-top dropdown-center",
  topRight: "dropdown-top dropdown-end",
  bottomLeft: "dropdown-start",
  bottomCenter: "dropdown-center",
  bottomRight: "dropdown-end"
}

export interface DropdownMenu {
  key: string
  label: ReactNode
  disabled?: boolean
  onClick?: () => void
  /** 透传到 button 的 data-testid，便于 E2E 在 i18n 下稳定断言 */
  testId?: string
}

export interface DropdownProps {
  menus: DropdownMenu[]
  children: ReactNode
  isOpen?: boolean
  trigger?: "click" | "hover"
  placement?: DropdownPlacement
  onOpenChange?: (isOpen: boolean) => void
}

const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  menus,
  children,
  onOpenChange,
  trigger = "click",
  placement = "bottomLeft"
}) => {
  const detailsRef = React.useRef<HTMLDetailsElement>(null)

  const handleTriggerChange = (next: boolean) => {
    onOpenChange?.(next)
  }

  // daisyUI 5 的 `dropdown-hover` 用 `:hover` + `:focus-visible` 控制显隐，
  // 鼠标点击后（非 keyboard focus）会命中 `:not(:focus-visible)` 隐藏规则，
  // 菜单一闪即隐。这里用 details.open 作为唯一状态源，hover / click 都可靠。
  React.useEffect(() => {
    const details = detailsRef.current
    if (!details || trigger !== "hover") return

    const handleMouseEnter = () => {
      details.open = true
    }
    const handleMouseLeave = () => {
      details.open = false
    }

    details.addEventListener("mouseenter", handleMouseEnter)
    details.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      details.removeEventListener("mouseenter", handleMouseEnter)
      details.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [trigger])

  React.useEffect(() => {
    if (isOpen === undefined || !detailsRef.current) return
    detailsRef.current.open = isOpen
  }, [isOpen])

  return (
    <details
      ref={detailsRef}
      onToggle={(e) => handleTriggerChange(e.currentTarget.open)}
      className={cn("dropdown", PLACEMENT_CLASSES[placement], {
        "dropdown-hover": trigger === "hover"
      })}>
      <summary className="list-none">{children}</summary>
      <ul className="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
        {menus.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              data-testid={item.testId}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return
                item.onClick?.()
                if (detailsRef.current) {
                  detailsRef.current.open = false
                }
              }}
              className={cn({
                "opacity-50 !cursor-not-allowed": item.disabled
              })}>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default Dropdown
