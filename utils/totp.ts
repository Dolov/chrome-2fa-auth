/**
 * TOTP / HOTP 数值生成与倒计时。
 *
 * 这是**唯一**直接依赖 otplib 的模块，因此也是 vite-plugin-node-polyfills
 * （crypto / buffer / stream / util，约 440 KB）进入产物的唯一入口。
 *
 * 与 `otpauth.ts` 拆开的原因：只需要「识别 / 解析 / 生成 otpauth URL」的
 * 调用方不必把 Node 垫片拖进自己的 bundle（content script 首当其冲）。
 */

import { authenticator } from "otplib"

import { DEFAULT_OTP_DIGITS, DEFAULT_OTP_STEP } from "./otpauth"
import type { OtpAuthConfig } from "./types"

/** 调用 generateOtp / getRemainingTime 的可选项 */
export interface OtpGenerateOptions extends Partial<OtpAuthConfig> {
  /** 参考时间戳（ms），默认 Date.now() */
  epoch?: number
  /** 是否预测下一个周期的 OTP */
  next?: boolean
}

/**
 * Otplib HashAlgorithms 枚举的运行时值（小写）。otplib v12 未导出 enum 类型，手写对齐。
 *
 * 注意：otplib v12 的 `allOptions()` 校验要求 algorithm 严格等于
 * `["sha1", "sha256", "sha512"]` 之一；传入 OTPAuth 规范的大写形式
 * （"SHA1"）或 undefined 都会抛错。
 *
 * 本函数把任意形式归一为合法小写值，缺省回退到 "sha1"（RFC 6238 默认）。
 */
const DEFAULT_HASH_ALGORITHM = "sha1" as const
type OtpHashAlgorithm = typeof DEFAULT_HASH_ALGORITHM | "sha256" | "sha512"
const OTP_HASH_ALGORITHMS = [
  DEFAULT_HASH_ALGORITHM,
  "sha256",
  "sha512"
] as const

const toOtpHashAlgorithm = (
  algorithm: OtpAuthConfig["algorithm"] | undefined
): OtpHashAlgorithm => {
  if (!algorithm) return DEFAULT_HASH_ALGORITHM
  const lowered = algorithm.toLowerCase()
  return (
    OTP_HASH_ALGORITHMS.find((v) => v === lowered) ??
    DEFAULT_HASH_ALGORITHM
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
    // 我们已归一到合法小写值，类型层面 cast 一次以对齐。
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
