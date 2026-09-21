import clsx from "clsx"
import React from "react"

import { getProgressColor, getRemainingTime } from "~/utils/auth"

interface OtpRemainingProps {
  deleted?: boolean
  className?: string
}

const OtpRemaining: React.FC<OtpRemainingProps> = (props) => {
  const { className, deleted } = props
  const interval = React.useRef(null)

  const [timeRemaining, setTimeRemaining] = React.useState(() => {
    return getRemainingTime()
  })

  React.useEffect(() => {
    interval.current = setInterval(() => {
      setTimeRemaining(getRemainingTime())
    }, 1000)

    return () => clearInterval(interval.current)
  }, [])

  const color = getProgressColor(timeRemaining)

  return (
    <progress
      max={30}
      value={timeRemaining}
      className={clsx(`progress w-full h-[3px] bg-base-200 ${className}`, {
        [color]: !deleted,
        "base-content": deleted
      })}
    />
  )
}

export default OtpRemaining
