import { DEFAULT_OTP_DIGITS, DEFAULT_OTP_STEP } from "~/utils/libs/otpauth"
import type { DataProps, OtpAuthConfig } from "~/utils/types"

/** 缺省算法：与 OTPAuth 规范 / `generateOtp` 的回退保持一致 */
const DEFAULT_ALGORITHM = "SHA1" as const

/**
 * 归一化后的条目身份：**7 项全等**才算「同一条记录」。
 *
 * `algorithm` / `digits` / `period` 缺省必须先补成默认值再比较 —— 否则「手动添加
 * （无 digits）」与「扫同一个 QR（URL 里显式写了 digits=6）」会被判成两条，
 * 凭空多出行为完全相同的重复条目。
 *
 * `counter` **不在**身份里：HOTP 的 counter 随使用递增，是状态不是身份。
 */
interface OtpIdentity {
  type: OtpAuthConfig["type"]
  issuer: string
  secret: string
  account: string
  algorithm: NonNullable<OtpAuthConfig["algorithm"]>
  digits: number
  period: number
}

const identityOf = (otp: OtpAuthConfig): OtpIdentity => ({
  type: otp.type,
  issuer: otp.issuer,
  secret: otp.secret,
  account: otp.account,
  algorithm: otp.algorithm ?? DEFAULT_ALGORITHM,
  digits: otp.digits ?? DEFAULT_OTP_DIGITS,
  period: otp.period ?? DEFAULT_OTP_STEP
})

const isSameIdentity = (a: OtpIdentity, b: OtpIdentity): boolean =>
  a.type === b.type &&
  a.issuer === b.issuer &&
  a.secret === b.secret &&
  a.account === b.account &&
  a.algorithm === b.algorithm &&
  a.digits === b.digits &&
  a.period === b.period

/** 条目是否命中目标身份（已删除的条目永不命中） */
const isIdentityMatch = (item: DataProps, target: OtpIdentity): boolean =>
  !item.deleted && isSameIdentity(identityOf(item), target)

/**
 * 找出与 `config` 身份全等且未被删除的条目；找不到返回 undefined。
 *
 * 这是「是否已存在」的唯一判定口径，`otpExists` / `addOtp` / 双端 intake writer
 * 都走它，避免同一份比较逻辑在多个文件里各写一遍（写歪一个就出现偶发重复）。
 */
export const findMatchingOtp = (
  items: DataProps[],
  config: OtpAuthConfig
): DataProps | undefined => {
  const target = identityOf(config)
  return items.find((item) => isIdentityMatch(item, target))
}

/**
 * 探测配置是否已存在（`identityOf` 归一化后的 7 项全等）
 */
export const otpExists = (items: DataProps[], config: OtpAuthConfig): boolean =>
  findMatchingOtp(items, config) != null

/**
 * 将一个新 OTP `Omit<DataProps, "id">` 合并入 `existing` 数组。
 *
 * 合并规则：
 * 1. 已存在身份全等（见 `OtpIdentity`）的非删除条目 → 字段合并（`merged: true`，
 *    写入端可借此判定「已存在」并改走对应文案 / 跳过 setValue）
 * 2. 否则直接追加（`merged: false`）
 *
 * 允许并存的两种情况：
 * - 同 issuer+account、不同 secret（同一账号的主密钥 / 备份密钥）——
 *   不要退回「同账号换密钥就软删旧的」；
 * - 同 secret、不同 algorithm/digits/period（同一密钥的不同参数版本）。
 *
 * 纯函数：返回新数组，不修改入参。
 */
export const addOtp = (
  existing: DataProps[],
  otp: Omit<DataProps, "id">
): { items: DataProps[]; inserted: DataProps; merged: boolean } => {
  const target = identityOf(otp)
  const dupIdx = existing.findIndex((item) =>
    isIdentityMatch(item, target)
  )

  if (dupIdx !== -1) {
    const next = existing.map((item, i) =>
      i === dupIdx ? { ...item, ...otp, id: item.id } : item
    )
    return { items: next, inserted: next[dupIdx]!, merged: true }
  }

  const newItem: DataProps = { ...otp, id: `${Date.now()}` }
  return { items: [...existing, newItem], inserted: newItem, merged: false }
}
