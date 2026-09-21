import { authenticator } from "otplib"

import type { OtpAuthConfig } from "./constant"

interface AuthenticatorConfig {
  step: number
  epoch: number
  digits: number
}

const DEFAULT_AUTHENTICATOR_CONFIG: AuthenticatorConfig = {
  step: 30,
  digits: 6,
  epoch: Date.now()
}

/**
 * Parse OTPAuth URL to config object
 * @param otpauthUrl OTPAuth URL string
 * @throws {Error} If URL format is invalid
 */
export const parseOtpAuthUrl = (otpauthUrl: string): OtpAuthConfig => {
  // otpauth://totp/GitHub:acloudfly?secret=N2CNXSJV7LG75BUI&issuer=GitHub
  // otpauth://totp/shisongyan?secret=YMKVIYF4GLUR33S72SLEIWOCOJYSSAPE&issuer=npm

  const url = new URL(otpauthUrl)

  if (url.protocol !== "otpauth:") {
    throw new Error("Invalid URL scheme, must start with otpauth://")
  }

  const type = url.hostname as "totp" | "hotp"
  if (!["totp", "hotp"].includes(type)) {
    throw new Error("Unsupported OTP type. Must be 'totp' or 'hotp'")
  }

  const label = decodeURIComponent(url.pathname.slice(1))
  const [labelIssuer, account] = label.includes(":")
    ? label.split(/:(.+)/)
    : [undefined, label]

  if (!account) {
    throw new Error("Missing account name in OTPAuth URL")
  }

  const params = new URLSearchParams(url.search)

  const secret = params.get("secret")
  if (!secret) throw new Error("Missing 'secret' parameter")

  const issuer = params.get("issuer") ?? labelIssuer

  const algorithmParam = params.get("algorithm")
  const algorithm = algorithmParam
    ? (algorithmParam.toUpperCase() as OtpAuthConfig["algorithm"])
    : undefined

  if (algorithm && !["SHA1", "SHA256", "SHA512", "MD5"].includes(algorithm)) {
    throw new Error(`Unsupported algorithm: ${algorithm}`)
  }

  const digitsParam = params.get("digits")
  const digits = digitsParam ? Number(digitsParam) : undefined
  if (digits !== undefined && ![6, 7, 8].includes(digits)) {
    throw new Error("Digits must be 6, 7, or 8")
  }

  const periodParam = params.get("period")
  const period =
    type === "totp" && periodParam ? Number(periodParam) : undefined

  const counterParam = params.get("counter")
  const counter =
    type === "hotp" && counterParam ? Number(counterParam) : undefined

  if (
    type === "hotp" &&
    (counter === undefined || isNaN(counter) || counter < 0)
  ) {
    throw new Error("HOTP type requires a valid numeric 'counter'")
  }

  const result: OtpAuthConfig = {
    type,
    secret,
    issuer,
    account
  }

  if (algorithm) {
    result.algorithm = algorithm
  }
  if (digits) {
    result.digits = digits
  }
  if (period) {
    result.period = period
  }
  if (counter) {
    result.counter = counter
  }

  return result
}

/**
 * Generate OTPAuth URL from config
 * @param config OTPAuth config object
 */
export function generateOtpAuthUrl(config: OtpAuthConfig): string {
  const {
    type,
    secret,
    issuer,
    account,
    counter,
    digits = 6,
    period = 30,
    algorithm = "SHA1"
  } = config

  const label = issuer
    ? `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
    : encodeURIComponent(account)

  const params = new URLSearchParams({
    secret,
    algorithm,
    digits: digits.toString(),
    period: period.toString()
  })

  if (issuer) {
    params.set("issuer", issuer)
  }
  if (type === "hotp" && typeof counter === "number") {
    params.set("counter", counter.toString())
  }

  return `otpauth://${type}/${label}?${params.toString()}`
}

/**
 * Generate OTP code
 * @param secret Secret key
 * @param generateNext Generate for next period
 */
export const generateOtp = (secret: string, generateNext = false): string => {
  const config = { ...DEFAULT_AUTHENTICATOR_CONFIG }
  config.epoch = Date.now()

  if (generateNext) {
    config.epoch += authenticator.options.step * 1000
  }

  authenticator.options = config
  return authenticator.generate(secret)
}

/**
 * Get remaining time for current OTP
 */
export const getRemainingTime = (): number => {
  authenticator.options = {
    ...DEFAULT_AUTHENTICATOR_CONFIG,
    epoch: Date.now()
  }
  return authenticator.timeRemaining()
}

/**
 * Get progress bar color by remaining time
 * @param timeRemaining Remaining seconds
 */
export const getProgressColor = (timeRemaining: number): string => {
  if (timeRemaining > 10) return "progress-primary"
  if (timeRemaining > 3) return "progress-warning"
  return "progress-error"
}

/**
 * Check if string is a valid OTPAuth URL
 * @param data String to check
 */
export const isOtpAuthUrl = (data: string): boolean => {
  if (!data) return false
  if (!data.startsWith("otpauth://")) return false
  if (!data.includes("secret=")) return false
  return true
}

