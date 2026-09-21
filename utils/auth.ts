import { Authenticator, type Algorithm } from "otplib"

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

/**
 * 纯函数：根据 secret + 可选 OtpAuthConfig + 参考时间，算出当前 OTP。
 *
 * 每次都实例化一个新的 Authenticator，避免修改共享 singleton。
 */
export const generateOtp = (
  secret: string,
  options: OtpGenerateOptions = {}
): string => {
  const step = options.period ?? DEFAULT_OTP_STEP
  const digits = options.digits ?? DEFAULT_OTP_DIGITS
  const algorithm = (options.algorithm ?? "SHA1") as Algorithm
  const baseEpoch = options.epoch ?? Date.now()
  const epoch = options.next ? baseEpoch + step * 1000 : baseEpoch

  return new Authenticator()
    .create({ epoch, step, digits, algorithm })
    .generate(secret)
}

/** 纯函数：根据 step + 参考时间算出到下一切换的剩余秒数 */
export const getRemainingTime = (
  options: OtpGenerateOptions = {}
): number => {
  const step = options.period ?? DEFAULT_OTP_STEP
  const baseEpoch = options.epoch ?? Date.now()
  const epoch = options.next ? baseEpoch + step * 1000 : baseEpoch

  // 调用 otplib 内部的 totpTimeRemaining(epoch, step)；
  // 即便方法签名是 instance 形态，它只读取 options.step 与 Date.now()，
  // 我们已经覆盖了它全部输入，因此是纯函数。
  return new Authenticator()
    .create({ epoch, step, digits: DEFAULT_OTP_DIGITS, algorithm: "SHA1" })
    .timeRemaining()
}

/**
 * 根据剩余秒数算出进度条 daisyUI 类名
 * @param timeRemaining 剩余秒数
 */
export const getProgressColor = (timeRemaining: number): string => {
  if (timeRemaining > 10) return "progress-primary"
  if (timeRemaining > 3) return "progress-warning"
  return "progress-error"
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
