import React from "react"

import { useOtpRemaining } from "~/features/ui-state/use-otp-tick"
import { cn } from "~/utils/cn"
import { resolveOtpStep } from "~/utils/totp"

interface OtpRemainingProps {
  /** OTP 周期（秒）；缺省 / 非法值由 `resolveOtpStep` 归一为 30 */
  period?: number
  deleted?: boolean
  className?: string
}

/** 剩余秒数告警阈值（秒） */
const WARNING_THRESHOLD = 10
const DANGER_THRESHOLD = 3

/** 剩余秒数 → daisyUI progress 颜色类名 */
const getProgressColor = (timeRemaining: number): string => {
  if (timeRemaining > WARNING_THRESHOLD) return "progress-primary"
  if (timeRemaining > DANGER_THRESHOLD) return "progress-warning"
  return "progress-error"
}

const OtpRemaining: React.FC<OtpRemainingProps> = (props) => {
  const { className, deleted, period } = props
  // max 与 value 必须同源：period=60 时不能再写死 30
  const max = resolveOtpStep(period)
  const timeRemaining = useOtpRemaining(period)
  const color = getProgressColor(timeRemaining)

  return (
    <progress
      max={max}
      value={timeRemaining}
      className={cn("progress w-full h-[3px] bg-base-200", className, {
        [color]: !deleted,
        "base-content": deleted
      })}
    />
  )
}

export default OtpRemaining
