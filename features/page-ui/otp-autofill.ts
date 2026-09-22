import message from "./toast"
import { copyTextToClipboard } from "~/utils/clipboard"
import { CSS_PREFIX, mountStyle } from "./css-portal"
import { generateOtp, getRemainingTime } from "~/utils/libs/totp"
import { createGradientTextContainer } from "./gradient-border"
import type { OtpAuthConfig } from "~/utils/types"

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
 * 在 input 之后注入一个浮动盒子，每秒更新 OTP 信息。
 * 用户点击盒子时复制当前 OTP。
 *
 * `config` 必须传完整条目而不是只传 secret —— `digits` / `period` / `algorithm`
 * 要透传给 `generateOtp` / `getRemainingTime`，否则非默认配置的账户会把
 * **错误的码直接填进目标网站**。
 *
 * @returns setInterval id，调用方可清理
 */
export const startOtpMessageUpdater = (
  input: HTMLInputElement,
  config: OtpAuthConfig,
  options: OtpAutofillOptions = {}
) => {
  const { style = {}, placeholder, account, autoFill = true } = options

  mountStyle(
    `${CSS_PREFIX}-otp-message-style`,
    `
      .${CSS_PREFIX}-gradient-link {
        color: inherit;
        text-decoration: none;
      }
      .${CSS_PREFIX}-gradient-link:hover {
        text-decoration: underline;
        text-decoration-color: #00d3bb;
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
      }
    `
  )

  const { container, textElement } = createGradientTextContainer(style)
  input.insertAdjacentElement("afterend", container)

  const updateOtpMessage = () => {
    const timeRemaining = getRemainingTime(config)
    const otp = generateOtp(config.secret, config)

    if (autoFill && placeholder) {
      input.placeholder = `请输入 ${otp}`
    }
    if (autoFill && !placeholder) {
      input.value = otp
    }

    const accountHtml = account
      ? `<div style="font-size:16px;font-weight:bold;text-align:center;margin-bottom:2px;">${account}</div>`
      : ""

    const infoHtml = `
      <div style="text-align:center;">
        2FA 服务由
        <a class="${CSS_PREFIX}-gradient-link" href="https://github.com/Dolov/chrome-github-2fa" target="_blank">
          github-2fa
        </a>
        扩展提供，感谢使用！(有效期：${timeRemaining}秒)
      </div>
    `

    textElement.innerHTML = `${accountHtml}${infoHtml}`
  }

  updateOtpMessage()
  container.addEventListener("click", () => {
    const code = generateOtp(config.secret, config)
    copyTextToClipboard(code)
    message.success(`已复制 ${code} 到剪贴板`)
  })

  return setInterval(updateOtpMessage, 1000)
}
