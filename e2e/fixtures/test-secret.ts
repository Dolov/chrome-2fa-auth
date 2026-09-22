/**
 * 测试用 OTP secret 与标准向量
 * 不 import 项目内部代码
 */
import { authenticator } from "otplib"

export const TEST_SECRET = "JBSWY3DPEHPK3PXP"
export const TEST_ISSUER = "TestApp"
export const TEST_ACCOUNT = "testuser"

export const TEST_OTPAUTH_URL = `otpauth://totp/${TEST_ISSUER}:${TEST_ACCOUNT}?secret=${TEST_SECRET}&issuer=${TEST_ISSUER}`

/**
 * 固定参考时刻：2026-01-15T00:00:07Z。
 * 选在周期开始后 7 秒（剩余 23 秒），远离 30s 边界，排除边界抖动。
 * 所有 OTP 数值正确性相关 spec 复用同一时刻。
 */
export const FIXED_TIME = new Date("2026-01-15T00:00:07.000Z")

export const TEST_SECRET_2 = "KRSXG5BAONSWG4TFOQ"
export const TEST_ISSUER_2 = "GitHub"
export const TEST_ACCOUNT_2 = "testaccount"

export type ExpectedOtpAlgorithm = "sha1" | "sha256" | "sha512"

export interface ExpectedOtpOptions {
  secret?: string
  algorithm?: ExpectedOtpAlgorithm
  digits?: number
  step?: number
  /** 参考时刻；不传则用当前时间 */
  date?: Date
}

/**
 * 用独立 otplib 计算期望的 OTP（仅用于断言，不调用项目代码）。
 *
 * 注意 `epoch` 必须放进 `authenticator.options`：otplib 的 options 是
 * 「浅合并」，只有 `_options` 里的字段才生效，直接挂 `_epoch` 是空操作。
 */
export function expectedOtp(options: ExpectedOtpOptions = {}): string {
  const {
    secret = TEST_SECRET,
    algorithm = "sha1",
    digits = 6,
    step = 30,
    date = new Date()
  } = options

  // otplib 把 algorithm 声明成 `HashAlgorithms` 枚举（运行时值就是小写字符串），
  // 这里传的就是同样的字面量，类型层面 cast 一次。
  authenticator.options = {
    algorithm: algorithm as NonNullable<typeof authenticator.options.algorithm>,
    digits,
    step,
    window: 0,
    epoch: date.getTime()
  }
  return authenticator.generate(secret)
}

/** 计算下一周期 OTP */
export function expectedNextOtp(options: ExpectedOtpOptions = {}): string {
  const { step = 30, date = new Date() } = options
  return expectedOtp({ ...options, date: new Date(date.getTime() + step * 1000) })
}

/** 期望的剩余秒数（对齐 otplib 的 totpTimeRemaining：step - floor(epoch/1000) % step） */
export function expectedRemainingTime(
  date: Date = new Date(),
  step = 30
): number {
  return step - (Math.floor(date.getTime() / 1000) % step)
}
