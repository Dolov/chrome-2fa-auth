import React from "react"

import { getRemainingTime } from "~/utils/auth"
import { cn } from "~/utils/cn"

interface OtpRemainingProps {
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
  const { className, deleted } = props
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const [timeRemaining, setTimeRemaining] = React.useState(() => {
    return getRemainingTime()
  })

  React.useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeRemaining(getRemainingTime())
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const color = getProgressColor(timeRemaining)

  return (
    <progress
      max={30}
      value={timeRemaining}
      className={cn(`progress w-full h-[3px] bg-base-200 ${className ?? ""}`, {
        [color]: !deleted,
        "base-content": deleted
      })}
    />
  )
}

export default OtpRemaining
