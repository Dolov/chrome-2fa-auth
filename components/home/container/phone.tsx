import { cn } from "~/utils/cn"
import React from "react"

interface PhoneProps {
  children: React.ReactNode
  className?: string
}

const Phone: React.FC<PhoneProps> = (props) => {
  const { children, className } = props
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mockup-phone flex flex-col flex-1">
        <div className="camera"></div>
        <div className="display">
          <div className="artboard artboard-demo phone-1 items-stretch bg-base-100 !w-[350px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Phone
