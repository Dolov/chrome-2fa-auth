import type { DataProps, OtpAuthConfig } from "./constant"

/**
 * 将一个新 OTP `Omit<DataProps, "id">` 合并入 `existing` 数组。
 *
 * 合并规则（与原 storage.ts saveOTP 一致）：
 * 1. 已存在同 type+issuer+secret+account 的非删除条目 → 字段合并
 * 2. 否则若存在同 type+issuer+account 的非删除条目 → 旧条目标记 deleted=true，
 *    新条目（携带旧 recoveryCodes）追加到末尾
 * 3. 否则直接追加
 *
 * 纯函数：返回新数组，不修改入参。
 */
export const addOtp = (
  existing: DataProps[],
  otp: Omit<DataProps, "id">
): { items: DataProps[]; inserted: DataProps } => {
  const dupIdx = existing.findIndex(
    (item) =>
      !item.deleted &&
      item.type === otp.type &&
      item.issuer === otp.issuer &&
      item.secret === otp.secret &&
      item.account === otp.account
  )

  if (dupIdx !== -1) {
    const next = existing.map((item, i) =>
      i === dupIdx ? { ...item, ...otp, id: item.id } : item
    )
    return { items: next, inserted: next[dupIdx]! }
  }

  const oldIdx = existing.findIndex(
    (item) =>
      !item.deleted &&
      item.type === otp.type &&
      item.issuer === otp.issuer &&
      item.account === otp.account
  )

  if (oldIdx !== -1) {
    const previous = existing[oldIdx]!
    const softDeleted = existing.map((item, i) =>
      i === oldIdx ? { ...item, deleted: true } : item
    )
    const newItem: DataProps = {
      ...otp,
      recoveryCodes: previous.recoveryCodes ?? [],
      id: `${Date.now()}`
    }
    return { items: [...softDeleted, newItem], inserted: newItem }
  }

  const newItem: DataProps = { ...otp, id: `${Date.now()}` }
  return { items: [...existing, newItem], inserted: newItem }
}

/**
 * 探测配置是否已存在（精确匹配 type+issuer+account+secret）
 */
export const otpExists = (
  items: DataProps[],
  config: OtpAuthConfig
): boolean =>
  items.some(
    (item) =>
      !item.deleted &&
      item.type === config.type &&
      item.issuer === config.issuer &&
      item.secret === config.secret &&
      item.account === config.account
  )
