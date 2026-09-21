import { authenticator } from "otplib"

import type { OtpAuthConfig } from "./constant"

/** 默认 TOTP 步长（秒） */
export const DEFAULT_OTP_STEP = 30
/** 默认 TOTP 数字位数 */
export const DEFAULT_OTP_DIGITS = 6

/** 调用 generateOtp / getRemainingTime 的可选项 */
export interface OtpGenerateOptions extends Partial<OtpAuthConfig> {
  /** 参考时间戳（ms），默认 Date.now() */
  epoch?: number
  /** 是否预测下一个周期的 OTP */
  next?: boolean
}

/** Otplib HashAlgorithms 枚举的运行时值。otplib v12 未导出 enum 类型，手写对齐。 */
type OtpHashAlgorithm = "sha1" | "sha256" | "sha512"
const toOtpHashAlgorithm = (
  algorithm: OtpAuthConfig["algorithm"] | undefined
): OtpHashAlgorithm | undefined => {
  if (!algorithm) return undefined
  const lowered = algorithm.toLowerCase()
  return (["sha1", "sha256", "sha512"] as const).find(
    (v) => v === lowered
  )
}

/**
 * 基于 secret + 可选 OtpAuthConfig + 参考时间，算出当前 OTP。
 *
 * 每次调用都显式重置 `authenticator.options`（otplib 单例），
 * 保证跨并发调用得到稳定结果。
 */
export const generateOtp = (
  secret: string,
  options: OtpGenerateOptions = {}
): string => {
  const step = options.period ?? DEFAULT_OTP_STEP
  const digits = options.digits ?? DEFAULT_OTP_DIGITS
  const algorithm = toOtpHashAlgorithm(options.algorithm)
  const baseEpoch = options.epoch ?? Date.now()
  const epoch = options.next ? baseEpoch + step * 1000 : baseEpoch

  authenticator.options = {
    ...authenticator.options,
    step,
    digits,
    // otplib v12 AuthenticatorOptions.algorithm 字段是 HashAlgorithms 字符串枚举。
    // 由于 otplib v12 未导出 enum 类型，这里 cast 一次。
    algorithm: algorithm as unknown as
      | (typeof authenticator.options extends { algorithm?: infer A }
          ? NonNullable<A>
          : never)
      | undefined,
    epoch
  }
  return authenticator.generate(secret)
}

/** 基于参考时间算出到下一切换的剩余秒数 */
export const getRemainingTime = (
  options: OtpGenerateOptions = {}
): number => {
  const step = options.period ?? DEFAULT_OTP_STEP
  const baseEpoch = options.epoch ?? Date.now()
  const epoch = options.next ? baseEpoch + step * 1000 : baseEpoch

  authenticator.options = {
    ...authenticator.options,
    step,
    epoch
  }
  return authenticator.timeRemaining()
}

/**
 * 简易 OTPAuth URL 探测：必须以 `otpauth://` 开头且包含 `secret=`
 * @param data 要校验的字符串
 */
export const isOtpAuthUrl = (data: string): boolean => {
  if (!data) return false
  if (!data.startsWith("otpauth://")) return false
  if (!data.includes("secret=")) return false
  return true
}

/**
 * 解析 OTPAuth URL 到 config 对象
 * @param otpauthUrl OTPAuth URL 字符串
 * @throws {Error} URL 格式非法时抛出
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
    issuer: issuer ?? "",
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
 * 由 config 反向生成 OTPAuth URL
 * @param config OTPAuth config 对象
 */
export function generateOtpAuthUrl(config: OtpAuthConfig): string {
  const {
    type,
    secret,
    issuer,
    account,
    counter,
    digits = DEFAULT_OTP_DIGITS,
    period = DEFAULT_OTP_STEP,
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
