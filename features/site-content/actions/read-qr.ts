import message from "~/utils/message"
import { highlightElement } from "~/utils/dom-highlight"
import { parseOtpAuthUrl } from "~/utils/auth"
import { saveOTP } from "~/utils/storage"
import { waitForElement } from "~/utils/dom-utils"
import { readFromImage, scanPage } from "~/utils/qr"
import { startOtpMessageUpdater } from "~/utils/otp-autofill"
import type { DataProps } from "~/utils/constant"

import type { SiteAdapter } from "../site-adapter"

/**
 * read-qr 行为：在该站设置 2FA 页解析 QR 码，
 * 高亮原图，把 OTP 灌入 verify 输入框，点击保存时落库。
 *
 * - adapter.scanQr 未提供 → 默认先看 adapter.selectors.qrImage，
 *   找不到就 fall back 到 utils/qr.scanPage()
 */
export const setupReadQR = async (adapter: SiteAdapter) => {
  const result = await (adapter.scanQr ?? defaultScan)(adapter)
  if (!result) return

  const { data: qrData, element } = result
  highlightElement(element)

  const parsed = parseOtpAuthUrl(qrData)
  const account = (await adapter.resolveAccount()) ?? parsed.account
  if (!account) {
    message.warning("未拿到当前账号，QR 内容将缺失 account")
  }

  const verifySelector = adapter.selectors.otpVerifyInput ?? adapter.selectors.otpInput
  const verifyInput = document.querySelector<HTMLInputElement>(verifySelector)
  if (verifyInput) {
    startOtpMessageUpdater(verifyInput, parsed.secret, {
      placeholder: true
    })
  }

  attachSaveHandler(adapter, parsed, account)
}

const defaultScan = async (adapter: SiteAdapter) => {
  if (adapter.selectors.qrImage) {
    const img = await waitForElement<HTMLImageElement>(adapter.selectors.qrImage)
    try {
      const data = await readFromImage(img)
      return { data, element: img }
    } catch {
      // fall through to scanPage
    }
  }
  try {
    return await scanPage()
  } catch {
    return null
  }
}

const attachSaveHandler = async (
  adapter: SiteAdapter,
  parsed: Omit<DataProps, "id">,
  account: string
) => {
  const selector = adapter.selectors.qrSaveButton ?? "button[type='submit']"
  const button = await waitForElement<HTMLButtonElement>(selector).catch(() => null)
  if (!button) return

  button.addEventListener("click", async () => {
    await saveOTP({
      ...parsed,
      account: parsed.account || account,
      id: Date.now().toString()
    })
    message.success("添加成功")
  })
}
