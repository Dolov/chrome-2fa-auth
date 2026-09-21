import message from "~/features/page-ui/toast"
import { highlightElement } from "~/features/page-ui/highlight"
import { parseOtpAuthUrl } from "~/utils/otpauth"
import { waitForElement } from "~/features/site-content/dom/wait-element"
import { readFromImage, scanPage } from "~/utils/qr-decode"
import { startOtpMessageUpdater } from "~/features/page-ui/otp-autofill"
import { createContentIntake } from "~/features/otp-intake"

import type { SiteAdapter } from "../site-adapter"

/**
 * read-qr 行为：在该站设置 2FA 页解析 QR 码，
 * 高亮原图，把 OTP 灌入 verify 输入框，点击保存时落库。
 *
 * - adapter.scanQr 未提供 → 默认先看 adapter.selectors.qrImage，
 *   找不到就 fall back 到 utils/qr.scanPage()
 *
 * 落库走 intake（候选 A），文案 / 去重 / 补账号与 popup 端统一。
 */
export const setupReadQR = async (adapter: SiteAdapter) => {
  const result = await (adapter.scanQr ?? defaultScan)(adapter)
  if (!result) return

  const { data: qrData, element } = result
  highlightElement(element)

  let parsed
  try {
    parsed = parseOtpAuthUrl(qrData)
  } catch (e) {
    message.warning(
      `检测到二维码，但其格式【${qrData.slice(0, 80)}】不符合 OTPAuth 规范`
    )
    return
  }

  const hintAccount = await adapter.resolveAccount()
  if (!hintAccount && !parsed.account) {
    message.warning("未拿到当前账号，QR 内容将缺失 account")
  }

  const verifySelector =
    adapter.selectors.otpVerifyInput ?? adapter.selectors.otpInput
  const verifyInput = document.querySelector<HTMLInputElement>(verifySelector)
  if (verifyInput) {
    startOtpMessageUpdater(verifyInput, parsed.secret, {
      placeholder: true
    })
  }

  attachSaveHandler(adapter, parsed, hintAccount ?? "")
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
  parsed: ReturnType<typeof parseOtpAuthUrl>,
  hintAccount: string
) => {
  const selector = adapter.selectors.qrSaveButton ?? "button[type='submit']"
  const button = await waitForElement<HTMLButtonElement>(selector).catch(
    () => null
  )
  if (!button) return

  // 该站的 intake：hintAccount 来自 resolveAccount（GitHub meta / NPM URL 段）
  const runIntake = createContentIntake({
    hintAccount: hintAccount || parsed.account || undefined
  })

  button.addEventListener("click", async () => {
    await runIntake({ kind: "parsed", config: parsed })
  })
}
