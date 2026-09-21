import { cn } from "~/utils/cn"
import React from "react"
import type { ReactNode } from "react"

export type DropdownPlacement =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight"

export interface DropdownProps {
  menus: {
    key: string
    label: ReactNode
    disabled?: boolean
    onClick?: () => void
  }[]
  children: ReactNode
  open?: boolean
  trigger?: "click" | "hover"
  placement?: DropdownPlacement
  onOpenChange?: (open: boolean) => void
}

const Dropdown: React.FC<DropdownProps> = ({
  open,
  menus,
  children,
  onOpenChange,
  trigger = "click",
  placement = "bottomLeft"
}) => {
  const detailsRef = React.useRef<HTMLDetailsElement>(null)

  const getPlacementClass = () => {
    const placementMap: Record<DropdownPlacement, string> = {
      topLeft: "dropdown-top",
      topCenter: "dropdown-top dropdown-end",
      topRight: "dropdown-top dropdown-end",
      bottomLeft: "",
      bottomCenter: "dropdown-end",
      bottomRight: "dropdown-end"
    }
    return placementMap[placement]
  }

  React.useEffect(() => {
    const details = detailsRef.current
    if (!details || trigger !== "hover") return

    const handleMouseEnter = () => {
      details.open = true
      onOpenChange?.(true)
    }
    const handleMouseLeave = () => {
      details.open = false
      onOpenChange?.(false)
    }

    details.addEventListener("mouseenter", handleMouseEnter)
    details.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      details.removeEventListener("mouseenter", handleMouseEnter)
      details.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [trigger, onOpenChange])

  React.useEffect(() => {
    if (open !== undefined && detailsRef.current) {
      detailsRef.current.open = open
    }
  }, [open])

  return (
    <details
      ref={detailsRef}
      className={cn("dropdown", getPlacementClass(), {
        "dropdown-hover": trigger === "hover"
      })}>
      <summary
        className="list-none"
        onClick={(e) => {
          if (trigger !== "click") return
          const details = e.currentTarget.parentElement as HTMLDetailsElement
          const newOpen = !details.open
          details.open = newOpen
          onOpenChange?.(newOpen)
        }}>
        {children}
      </summary>
      <ul className="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
        {menus.map((item) => (
          <li key={item.key}>
            <a
              onClick={(e) => {
                e.preventDefault()
                if (!item.disabled) {
                  item.onClick?.()
                  if (detailsRef.current) {
                    detailsRef.current.open = false
                  }
                  onOpenChange?.(false)
                }
              }}
              className={cn({
                "opacity-50 !cursor-not-allowed": item.disabled
              })}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default Dropdown
