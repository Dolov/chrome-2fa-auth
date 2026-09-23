import message from "./toast"
import { copyTextToClipboard } from "~/utils/clipboard"
import { i18n } from "#i18n"
import { generateOtp, getRemainingTime } from "~/utils/libs/totp"
import { createCalloutContainer } from "./gradient-border"
import { CSS_PREFIX } from "./css-portal"
import type { OtpAuthConfig } from "~/utils/types"

/** startOtpMessageUpdater 返回的资源句柄，调用方负责在 SPA cleanup 时调 dispose */
export interface OtpUpdaterHandle {
  /** 重复计时器 id */
  intervalId: ReturnType<typeof setInterval>
  /** 清除计时器 + 移除 DOM */
  dispose: () => void
}

/** OTP 消息更新器的配置选项 */
export interface OtpAutofillOptions {
  /** 容器的自定义样式 */
  style?: Partial<CSSStyleDeclaration>
  /** 是否将 OTP 显示在输入框的 placeholder 中 */
  placeholder?: boolean
  /** 是否显示账号 */
  account?: string
  /** 是否自动填充 */
  autoFill?: boolean
}

/**
 * 在 input 之后注入一个 Callout 浮动盒子，每秒更新 OTP 信息。
 * 用户点击盒子时复制当前 OTP。
 *
 * `config` 必须传完整条目而不是只传 secret —— `digits` / `period` / `algorithm`
 * 要透传给 `generateOtp` / `getRemainingTime`，否则非默认配置的账户会把
 * **错误的码直接填进目标网站**。
 *
 * 返回 `dispose`：清掉 `setInterval` + 移除注入的 DOM。SPA 路由切换时调用。
 */
export const startOtpMessageUpdater = (
  input: HTMLInputElement,
  config: OtpAuthConfig,
  options: OtpAutofillOptions = {}
): OtpUpdaterHandle => {
  const { style = {}, placeholder, account, autoFill = true } = options

  const { container, textElement } = createCalloutContainer(style)
  input.insertAdjacentElement("afterend", container)

  const updateOtpMessage = () => {
    const timeRemaining = getRemainingTime(config)
    const otp = generateOtp(config.secret, config)

    if (autoFill && placeholder) {
      input.placeholder = i18n.t("otp_autofill_placeholder", [otp])
    }
    if (autoFill && !placeholder) {
      input.value = otp
    }

    const accountHtml = account
      ? `<div style="font-size:16px;font-weight:bold;text-align:center;margin-bottom:2px;">${account}</div>`
      : ""

    const infoHtml = `
      <div style="text-align:center;">
        ${i18n.t("otp_autofill_info_before")}<a class="${CSS_PREFIX}-callout-link" href="https://github.com/Dolov/chrome-github-2fa" target="_blank">github-2fa</a>${i18n.t("otp_autofill_info_after", [timeRemaining])}
      </div>
    `

    textElement.innerHTML = `${accountHtml}${infoHtml}`
  }

  updateOtpMessage()
  container.addEventListener("click", () => {
    const code = generateOtp(config.secret, config)
    copyTextToClipboard(code)
    message.success(i18n.t("otp_autofill_copied", [code]))
  })

  const intervalId = setInterval(updateOtpMessage, 1000)
  return {
    intervalId,
    dispose: () => {
      clearInterval(intervalId)
      container.remove()
    }
  }
}
