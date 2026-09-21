import { Issuers } from "~/utils/constant"
import { extractDynamicSegment } from "~/utils/dom-utils"

import type { SiteAdapter } from "../site-adapter"

/** 从 GitHub meta 标签提取当前用户名 */
const getGitHubUserName = (): string => {
  const selectors = [
    'meta[property="profile:username"]',
    'meta[name="user-login"]'
  ]

  const meta = selectors
    .map((selector) => document.querySelector(selector))
    .find((el): el is HTMLMetaElement => el != null)

  return meta?.getAttribute("content") ?? ""
}

/** GitHub 2FA 登录页 / sudo 重认证：自动填 OTP */
const GITHUB_OTP_INPUT_SELECTOR =
  "input[id=app_totp][name=sudo_app_otp], input[id=app_totp][name=app_otp]"

/** GitHub recovery codes 页：DOM 选择器 */
const GITHUB_RECOVERY_LIST_SELECTOR = "ul.two-factor-recovery-codes"
const GITHUB_RECOVERY_ITEM_SELECTOR = "li.two-factor-recovery-code"

/** GitHub 启用 2FA 页：QR image 选择器 */
const GITHUB_QR_IMAGE_SELECTOR = "img.qr-code-img"
const GITHUB_QR_SAVE_BUTTON_SELECTOR =
  "button[data-target='two-factor-configure-otp-factor.saveButton']"
const GITHUB_QR_VERIFY_INPUT_SELECTOR =
  "input[data-target='two-factor-configure-otp-factor.appOtpInput'], input[data-target='two-factor-setup-verification.appOtpInput']"

export const githubAdapter: SiteAdapter = {
  name: "github",
  issuer: Issuers.GITHUB,

  isFillOTPPage: (pathname) =>
    !pathname.startsWith("/settings/two_factor_authentication") &&
    !pathname.startsWith("/settings/auth/recovery-codes"),
  isReadQRPage: (pathname) =>
    pathname.startsWith("/settings/two_factor_authentication"),
  isRecoverCodesPage: (pathname) =>
    pathname.startsWith("/settings/auth/recovery-codes"),

  resolveAccount: async () => getGitHubUserName(),

  selectors: {
    otpInput: GITHUB_OTP_INPUT_SELECTOR,
    otpVerifyInput: GITHUB_QR_VERIFY_INPUT_SELECTOR,
    qrImage: GITHUB_QR_IMAGE_SELECTOR,
    qrSaveButton: GITHUB_QR_SAVE_BUTTON_SELECTOR,
    recoveryList: GITHUB_RECOVERY_LIST_SELECTOR,
    recoveryItem: GITHUB_RECOVERY_ITEM_SELECTOR
  },

  fillOtpItemStyle: { marginBottom: "16px" },
  recoveryContainerStyle: { marginBottom: "16px" }
}

// silence unused-import warning
void extractDynamicSegment
