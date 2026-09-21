import React from "react"

import { getRemainingTime, resolveOtpStep } from "~/utils/totp"
import { cn } from "~/utils/cn"

interface OtpRemainingProps {
  /** OTP 周期（秒）；缺省 / 非法值由 `resolveOtpStep` 归一为 30 */
  period?: number
  deleted?: boolean
  className?: string
}

/** 剩余秒数 → daisyUI progress 颜色类名 */
const getProgressColor = (timeRemaining: number): string => {
  if (timeRemaining > 10) return "progress-primary"
  if (timeRemaining > 3) return "progress-warning"
  return "progress-error"
}

const OtpRemaining: React.FC<OtpRemainingProps> = (props) => {
  const { className, deleted, period } = props
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  // max 与 value 必须同源：period=60 时不能再写死 30
  const max = resolveOtpStep(period)

  const [timeRemaining, setTimeRemaining] = React.useState(() => {
    return getRemainingTime({ period })
  })

  React.useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeRemaining(getRemainingTime({ period }))
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [period])

  const color = getProgressColor(timeRemaining)

  return (
    <progress
      max={max}
      value={timeRemaining}
      className={cn(`progress w-full h-[3px] bg-base-200 ${className ?? ""}`, {
        [color]: !deleted,
        "base-content": deleted
      })}
    />
  )
}

export default OtpRemaining
