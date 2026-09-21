import { cn } from "~/utils/cn"
import React from "react"

import { getRemainingTime } from "~/utils/auth"
import { getProgressColor } from "~/utils/css-portal"

interface OtpRemainingProps {
  deleted?: boolean
  className?: string
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
