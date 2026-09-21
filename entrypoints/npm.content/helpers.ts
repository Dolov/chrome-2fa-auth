/**
 * NPM 站点相关 helpers + URL 路由判别
 */

export const NPM_OTP_INPUT_SELECTOR = "input[id=login_otp]"
export const NPM_OTP_VERIFY_INPUT_SELECTOR = "input[id='enable_otp']"

export const isNpmLoginOTPPage = (): boolean =>
  location.pathname.startsWith("/login/otp")

export const isNpmTfaSetupPage = (): boolean =>
  /^\/settings\/[^/]+\/tfa(\/|$)/.test(location.pathname)

export const isNpmRecoveryCodesPage = (): boolean =>
  /^\/settings\/[^/]+\/recovery-codes/.test(location.pathname)