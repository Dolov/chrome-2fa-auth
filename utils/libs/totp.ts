/**
 * TOTP 数值生成与倒计时。
 *
 * 本模块**逐条复刻 otplib v12 `authenticator` 的行为**，并用零依赖的
 * `./hmac` + `./base32` 取代 otplib，以移除 `vite-plugin-node-polyfills`
 * 的 4 个 Node 垫片（实测 442.5 KB × 3 个 bundle）。
 *
 * 需要逐条对齐的 otplib 语义（都有实测依据，不要「顺手改成标准做法」）：
 *
 * 1. **secret 按 base32 解码**（`Authenticator.keyDecoder` = thirty-two），
 *    而不是当成 ASCII 直接当 key。
 * 2. **key 补足规则**：若解码后的 hex 串长度 < minLength（sha1=20 / sha256=32
 *    / sha512=64，注意是 **hex 字符数**），则把 hex 串重复到至少 minLength
 *    **字节**再截断到 minLength 字节；否则原样使用。
 *    即：secret ≥ 10 字节时 sha1 不补；< 10 字节时补到 20 字节。
 *    这个阈值用 hex 长度、目标用字节长度是 otplib 自身的不一致，必须保留。
 * 3. **counter** = `Math.floor(epoch / step / 1000)`（epoch 为毫秒）。
 * 4. **counter 的消息体** = `counter.toString(16)` 左补 '0' 到 16 个 hex 字符
 *    （超过 16 位不截断）。
 * 5. **截断** = 标准 RFC 4226 动态截断，然后左补 '0' 到 digits 位。
 * 6. **剩余秒数** = `step - (Math.floor(epoch / 1000) % step)`，是整数。
 * 7. **忽略 `type` / `counter` 字段**：otplib 的 `authenticator` 是 TOTP 类，
 *    即使条目标记为 hotp 也按时间生成。这是既有行为，不是本次引入的缺陷。
 *    `type=hotp` 不支持计数器 UI，属于独立特性。
 * 8. `algorithm=MD5`（OTPAuth 规范里存在、但 otplib 也不支持）回退为 sha1。
 *    与改造前行为一致，属于已知限制而非本次引入。
 *
 * **参数透传不变式**：`digits` / `period` / `algorithm` 必须由调用方从存储条目
 * 一路传到本模块。它们在 `parseOtpAuthUrl` 里被解析并校验、也确实落了库，
 * 但曾经在 `OtpText` / `OtpRemaining` / `otp-autofill` 三处被丢掉 ——
 * 结果是 `digits=8`、`algorithm=SHA256`、`period=60` 三类账户**永远显示错误的码**。
 * 回归由 `e2e/specs/05-otp.spec.ts` 的三个对应用例看守。
 *
 * 正确性保障：`e2e/specs/05-otp.spec.ts` 用独立 otplib 算期望值做黑盒断言；
 * 开发期另与 node `crypto` / otplib 随机对拍。
 */

import { decodeBase32 } from "./base32"
import { HMAC_ALGORITHMS, hmac } from "./hmac"
import type { HmacAlgorithm } from "./hmac"
import { DEFAULT_OTP_DIGITS, DEFAULT_OTP_STEP } from "./otpauth"
import type { OtpAuthConfig } from "../types"

/** 调用 generateOtp / getRemainingTime 的可选项 */
export interface OtpGenerateOptions extends Partial<OtpAuthConfig> {
  /** 参考时间戳（ms），默认 Date.now() */
  epoch?: number
  /** 是否预测下一个周期的 OTP */
  next?: boolean
}

/** 缺省回退 sha1（RFC 6238 默认；OTPAuth 规范写的大写 SHA1 也归一到这里） */
const DEFAULT_HASH_ALGORITHM: HmacAlgorithm = "sha1"

/**
 * otplib `totpCreateHmacKey` 传入的 minLength。单位是 **hex 字符数**，
 * 而截断目标是 **字节数** —— 这个不一致是 otplib 的既有语义，见文件头第 2 条。
 */
const MIN_KEY_HEX_LENGTH: Record<HmacAlgorithm, number> = {
  sha1: 20,
  sha256: 32,
  sha512: 64
}

/** counter 的 16 位 hex 宽度（= 8 字节大端） */
const COUNTER_HEX_WIDTH = 16

const toHmacAlgorithm = (
  algorithm: OtpAuthConfig["algorithm"] | undefined
): HmacAlgorithm => {
  if (!algorithm) return DEFAULT_HASH_ALGORITHM
  const lowered = algorithm.toLowerCase()
  return HMAC_ALGORITHMS.find((value) => value === lowered) ?? DEFAULT_HASH_ALGORITHM
}

/** OTPAuth 规范允许的位数（与 `parseOtpAuthUrl` 的校验集合保持一致） */
const isSupportedDigits = (digits: number): boolean =>
  digits === 6 || digits === 7 || digits === 8

/**
 * 归一 digits：非 6/7/8 一律回退默认值。
 *
 * 存储里的条目可能来自导入的 JSON 或历史数据，绕过 `parseOtpAuthUrl` 的校验。
 * 不归一会失控：`digits=999` → `10 ** 999` 为 `Infinity` → `%` 不生效 →
 * 渲染出一个近千字符的“码”。
 */
const resolveOtpDigits = (digits: number | undefined): number =>
  digits != null && isSupportedDigits(digits) ? digits : DEFAULT_OTP_DIGITS

/**
 * 归一 OTP 周期（秒）：必须是有限正数，否则回退默认值。
 *
 * 导出给渲染层算 progress 的 `max` 用 —— 必须与生成逻辑用同一个归一结果，
 * 否则非法 period（如 `-5`，能被 `parseOtpAuthUrl` 放行）会让 max 与 value 不同基准。
 */
export const resolveOtpStep = (period: number | undefined): number =>
  period != null && Number.isFinite(period) && period > 0
    ? period
    : DEFAULT_OTP_STEP

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

const fromHex = (hexValue: string): Uint8Array => {
  const byteLength = Math.floor(hexValue.length / 2)
  const bytes = new Uint8Array(byteLength)
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = Number.parseInt(hexValue.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** base32 解码 + 按 otplib 规则补足 HMAC key */
const toHmacKey = (secret: string, algorithm: HmacAlgorithm): Uint8Array => {
  const decoded = decodeBase32(secret)
  const hexSecret = toHex(decoded)
  const minHexLength = MIN_KEY_HEX_LENGTH[algorithm]

  if (hexSecret.length >= minHexLength) return decoded

  const repeatedHex = hexSecret.repeat(minHexLength - hexSecret.length)
  return fromHex(repeatedHex).slice(0, minHexLength)
}

/** counter → 8 字节大端消息体 */
const toCounterMessage = (counter: number): Uint8Array =>
  fromHex(counter.toString(16).padStart(COUNTER_HEX_WIDTH, "0"))

/** RFC 4226 动态截断 + 左补零到 digits 位 */
const truncateToToken = (digest: Uint8Array, digits: number): string => {
  const offset = digest[digest.length - 1]! & 0x0f
  const binaryValue =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff)

  return String(binaryValue % 10 ** digits).padStart(digits, "0")
}

/** 把「参考时间 + next」折算成实际参与计算的 epoch（ms） */
const resolveEpoch = (options: OtpGenerateOptions, step: number): number => {
  const baseEpoch = options.epoch ?? Date.now()
  return options.next ? baseEpoch + step * 1000 : baseEpoch
}

/** 基于 secret + 可选 OtpAuthConfig + 参考时间，算出当前 OTP */
export const generateOtp = (
  secret: string,
  options: OtpGenerateOptions = {}
): string => {
  const step = resolveOtpStep(options.period)
  const digits = resolveOtpDigits(options.digits)
  const algorithm = toHmacAlgorithm(options.algorithm)
  const epoch = resolveEpoch(options, step)

  const counter = Math.floor(epoch / step / 1000)
  const digest = hmac(
    algorithm,
    toHmacKey(secret, algorithm),
    toCounterMessage(counter)
  )

  return truncateToToken(digest, digits)
}

/** 基于参考时间算出到下一切换的剩余秒数 */
export const getRemainingTime = (
  options: OtpGenerateOptions = {}
): number => {
  const step = resolveOtpStep(options.period)
  const epoch = resolveEpoch(options, step)

  return step - (Math.floor(epoch / 1000) % step)
}
