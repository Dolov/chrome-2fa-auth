import { cn } from "~/utils/cn"
import React from "react"

interface PhoneFrameProps {
  children: React.ReactNode
  className?: string
}

/**
 * daisyUI `mockup-phone` 外壳：摄像头 + 屏幕 + 圆角机身。
 *
 * `PhoneFrame` 而非 `Phone`——避免与 daisyUI 类名、与设备 API 的 `Phone` 概念混淆。
 */
const PhoneFrame: React.FC<PhoneFrameProps> = (props) => {
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

export default PhoneFrame
