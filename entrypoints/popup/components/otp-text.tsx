import React from "react"

import message from "~/features/page-ui/toast"
import { useOtpStepIndex } from "~/features/ui-state/use-otp-tick"
import { copyTextToClipboardV2 } from "~/utils/clipboard"
import { cn } from "~/utils/cn"
import { i18n } from "#i18n"
import { generateOtp } from "~/utils/libs/totp"
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

  // 周期序号只在 OTP 切换时变化：避免每秒重算一次 HMAC
  const stepIndex = useOtpStepIndex(period)

  const otp = React.useMemo(
    () => generateOtp(secret, { digits, period, algorithm, next }),
    [algorithm, digits, next, period, secret, stepIndex]
  )
  // 按位数对半分组：6 位 3+3、8 位 4+4（写死 3 会让 8 位码显示成 3+5）
  const half = Math.ceil(otp.length / 2)
  const first = otp.slice(0, half)
  const last = otp.slice(half)

  const handleCopy = () => {
    void copyTextToClipboardV2(otp)
    message.success(i18n.t("common_toast_copied"))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleCopy()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
      className={className}
      data-testid={next ? "otp-next" : "otp-current"}>
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
