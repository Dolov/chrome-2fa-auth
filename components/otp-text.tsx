import { cn } from "~/utils/cn"
import React from "react"

import message from "~/utils/message"
import { generateOtp } from "~/utils/auth"
import { copyTextToClipboardV2 } from "~/utils/clipboard-utils"

interface OtpTextProps {
  secret: string
  next?: boolean
  small?: boolean
  className?: string
}

const OtpText: React.FC<OtpTextProps> = (props) => {
  const { secret, className, small, next = false } = props
  const interval = React.useRef(null)

  const [otp, setOtp] = React.useState(() => {
    return generateOtp(secret, next)
  })
  const first = otp.slice(0, 3)
  const last = otp.slice(3)

  React.useEffect(() => {
    interval.current = setInterval(() => {
      setOtp(generateOtp(secret, next))
    }, 1000)

    return () => clearInterval(interval.current)
  }, [next])

  const handleClick = () => {
    copyTextToClipboardV2(otp)
    message.success("复制成功")
  }

  return (
    <div className={className} onClick={handleClick}>
      <span
        className={cn({
          "mr-1": small,
          "mr-2": !small
        })}>
        {first}
      </span>
      <span>{last}</span>
    </div>
  )
}

export default OtpText
