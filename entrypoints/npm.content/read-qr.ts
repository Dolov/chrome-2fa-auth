import message from "~/utils/message"
import { parseOtpAuthUrl } from "~/utils/auth"
import { saveOTP } from "~/utils/storage"
import { extractDynamicSegment, waitForPathMatchStrict } from "~/utils/dom-utils"
import { highlightElement } from "~/utils/dom-highlight"
import { scanPage } from "~/utils/qr"
import { startOtpMessageUpdater } from "~/utils/otp-autofill"

import { NPM_OTP_VERIFY_INPUT_SELECTOR } from "./helpers"

/**
 * NPM 启用 2FA 页：扫描页面 QR → 填验证码 → 保存到本地
 * 适用 URL：www.npmjs.com/settings/<user>/tfa/...
 */
export const setupNpmReadQR = async (): Promise<void> => {
  const href = await waitForPathMatchStrict({
    endsWith: [
      "/settings/*/tfa/",
      "/settings/*/tfa/manageTfa?action=setup-totp"
    ]
  })
  if (!href) return

  const result = await scanPage()
  if (!result) return
  const { data: qrData, element } = result
  highlightElement(element)

  const parsedData = parseOtpAuthUrl(qrData)
  const account = extractDynamicSegment(href, "/settings/*/tfa/")
  const input = document.querySelector(
    NPM_OTP_VERIFY_INPUT_SELECTOR
  ) as HTMLInputElement
  if (!input) return

  startOtpMessageUpdater(input, parsedData.secret)

  const submitButton = document.querySelector(
    "button[type='submit']"
  ) as HTMLButtonElement
  if (!submitButton) return

  submitButton.addEventListener("click", async () => {
    if (!input.value) return
    await saveOTP({
      ...parsedData,
      account,
      id: Date.now().toString()
    })
    message.success("添加成功")
  })
}
