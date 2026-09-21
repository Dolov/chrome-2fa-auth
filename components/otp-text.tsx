import { cn } from "~/utils/cn"
import React from "react"

import message from "~/features/page-ui/toast"
import { generateOtp } from "~/utils/totp"
import { copyTextToClipboardV2 } from "~/utils/clipboard"
import type { OtpAuthConfig } from "~/utils/types"

interface OtpTextProps {
  /**
   * 生成 OTP 所需的配置。
   *
   * 必须是完整条目而不是只传 secret —— `digits` / `period` / `algorithm`
   * 必须透传给 `generateOtp`，否则非默认配置的账户会显示错误的码。
   */
  config: OtpAuthConfig
  next?: boolean
  small?: boolean
  className?: string
}

const OtpText: React.FC<OtpTextProps> = (props) => {
  const { config, className, small, next = false } = props
  const { secret, digits, period, algorithm } = config
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const [otp, setOtp] = React.useState(() => {
    return generateOtp(secret, { digits, period, algorithm, next })
  })
  const first = otp.slice(0, 3)
  const last = otp.slice(3)

  React.useEffect(() => {
    intervalRef.current = setInterval(() => {
      setOtp(generateOtp(secret, { digits, period, algorithm, next }))
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [algorithm, digits, next, period, secret])

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
