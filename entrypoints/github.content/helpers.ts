/**
 * GitHub 站点相关 helpers
 */

/** 从 GitHub 页面的 meta 标签提取当前用户名 */
export const getGitHubUserName = (): string => {
  const selectors = [
    'meta[property="profile:username"]',
    'meta[name="user-login"]'
  ]

  const meta = selectors
    .map((selector) => document.querySelector(selector))
    .find((el): el is HTMLMetaElement => el !== null)

  return meta?.getAttribute("content") || ""
}

/** GitHub 2FA 登录页 / sudo 重认证：自动填 OTP */
export const GITHUB_OTP_INPUT_SELECTOR =
  "input[id=app_totp][name=sudo_app_otp], input[id=app_totp][name=app_otp]"

/** GitHub recovery codes 页：DOM 选择器 */
export const GITHUB_RECOVERY_LIST_SELECTOR = "ul.two-factor-recovery-codes"
export const GITHUB_RECOVERY_ITEM_SELECTOR = "li.two-factor-recovery-code"

/** GitHub 启用 2FA 页：QR image 选择器 */
export const GITHUB_QR_IMAGE_SELECTOR = "img.qr-code-img"
export const GITHUB_QR_SAVE_BUTTON_SELECTOR =
  "button[data-target='two-factor-configure-otp-factor.saveButton']"
export const GITHUB_QR_VERIFY_INPUT_SELECTOR =
  "input[data-target='two-factor-configure-otp-factor.appOtpInput'], input[data-target='two-factor-setup-verification.appOtpInput']"

/** URL 路由判别 */
export const isGitHubRecoveryCodesPage = (): boolean =>
  location.pathname.startsWith("/settings/auth/recovery-codes")

export const isGitHubTwoFactorSetupPage = (): boolean =>
  location.pathname.startsWith("/settings/two_factor_authentication")