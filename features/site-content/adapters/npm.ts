import { Issuers } from "~/utils/constant"
import { extractDynamicSegment } from "~/utils/dom-utils"
import { scanPage } from "~/utils/qr"

import type { SiteAdapter } from "../site-adapter"

/** NPM 站点路径动段抽取：从 URL 抽 /settings/<account>/tfa 中的 account */
const resolveNpmAccount = async (): Promise<string | null> => {
  if (location.pathname.startsWith("/login/otp")) {
    return extractDynamicSegment(decodeURIComponent(location.href), [
      "/settings/*/tfa",
      "/settings/*/recovery-codes"
    ])
  }
  if (/^\/settings\/[^/]+\/tfa(\/|$)/.test(location.pathname)) {
    return extractDynamicSegment(location.href, "/settings/*/tfa/")
  }
  if (/^\/settings\/[^/]+\/recovery-codes/.test(location.pathname)) {
    return extractDynamicSegment(location.href, "/settings/*/recovery-codes")
  }
  return null
}

const NPM_OTP_INPUT_SELECTOR = "input[id=login_otp]"
const NPM_OTP_VERIFY_INPUT_SELECTOR = "input[id='enable_otp']"

/** NPM 启用 2FA 页：先尝试 canvas 扫描，再扫描 img */
const npmScanQr = async () => {
  try {
    return await scanPage()
  } catch {
    return null
  }
}

/** NPM 恢复码：div[role='button'] 内部 p 标签 */
const npmExtractRecoveryCodes = async (): Promise<string[] | null> => {
  const container = document.querySelector(
    "div[role='button'][tabindex='0']"
  ) as HTMLElement | null
  if (!container) return null
  const texts = Array.from(container.querySelectorAll("p"))
    .map((p) => p.innerText)
    .filter((text) => text.length > 0)
  return texts.length > 0 ? texts : null
}

export const npmAdapter: SiteAdapter = {
  name: "npm",
  issuer: Issuers.NPM,

  isFillOTPPage: (pathname) => pathname.startsWith("/login/otp"),
  isReadQRPage: (pathname) => /^\/settings\/[^/]+\/tfa(\/|$)/.test(pathname),
  isRecoverCodesPage: (pathname) =>
    /^\/settings\/[^/]+\/recovery-codes/.test(pathname),

  resolveAccount: resolveNpmAccount,

  selectors: {
    otpInput: NPM_OTP_INPUT_SELECTOR,
    otpVerifyInput: NPM_OTP_VERIFY_INPUT_SELECTOR
  },

  scanQr: npmScanQr,
  extractRecoveryCodes: npmExtractRecoveryCodes,

  fillOtpItemStyle: {
    marginTop: "6px",
    marginBottom: "8px"
  },
  recoveryContainerStyle: { marginBottom: "16px" }
}
