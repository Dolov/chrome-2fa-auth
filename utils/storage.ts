import { storage } from "@wxt-dev/storage"

import type { DataProps, OtpAuthConfig } from "./constant"
import { DEFAULT_SETTINGS, StorageKey } from "./constant"

/**
 * 类型化存储项（store-use-define-item 最佳实践）
 *
 * 用 storage.defineItem 提供：
 * - 类型安全的 getValue/setValue
 * - fallback 兜底，调用方无需 null 守卫
 * - watch() 跨上下文响应式
 *
 * 存储区域：
 * - DATA: sync:（与 Plasmo 旧版兼容，避免现有用户数据丢失；
 *   sync 单项 8KB，>10 帐号 约 1-2KB，典型场景足够）
 * - SETTINGS: sync:（主题/布局小，跨设备同步）
 * - LEGACY_DATA: local:（v1 迁移数据，迁移后清空）
 */
const DATA_KEY = `sync:${StorageKey.DATA}` as const
const SETTINGS_KEY = `sync:${StorageKey.SETTINGS}` as const
const LEGACY_KEY = `local:${StorageKey.LEGACY_DATA}` as const

export const dataStore = storage.defineItem<DataProps[]>(DATA_KEY, {
  fallback: []
})

export const settingsStore = storage.defineItem<
  typeof DEFAULT_SETTINGS
>(SETTINGS_KEY, {
  fallback: DEFAULT_SETTINGS
})

export const saveOTP = async (otpData: DataProps) => {
  if (
    !otpData.id ||
    !otpData.type ||
    !otpData.secret ||
    !otpData.issuer ||
    !otpData.account
  ) {
    throw new Error(`otpData is invalid: ${JSON.stringify(otpData, null, 2)}`)
  }
  const existingData = await dataStore.getValue()

  const sameItemIndex = existingData.findIndex(
    (item) =>
      !item.deleted &&
      item.type === otpData.type &&
      item.issuer === otpData.issuer &&
      item.secret === otpData.secret &&
      item.account === otpData.account
  )

  if (sameItemIndex !== -1) {
    existingData[sameItemIndex] = {
      ...existingData[sameItemIndex],
      ...otpData
    }
    return await dataStore.setValue(existingData)
  }

  const oldItemIndex = existingData.findIndex(
    (item) =>
      !item.deleted &&
      item.type === otpData.type &&
      item.issuer === otpData.issuer &&
      item.account === otpData.account
  )

  if (oldItemIndex !== -1) {
    existingData[oldItemIndex].deleted = true
    existingData.push({
      recoveryCodes: existingData[oldItemIndex].recoveryCodes || [],
      ...otpData
    })
    return await dataStore.setValue(existingData)
  }

  existingData.push(otpData)
  return await dataStore.setValue(existingData)
}

export const getOTPList = async (
  issuer: string,
  account?: string
): Promise<DataProps[]> => {
  const data = await dataStore.getValue()
  if (!account) {
    return data.filter(
      (item) =>
        !item.deleted && item.issuer.toLowerCase() === issuer.toLowerCase()
    )
  }

  return data.filter(
    (item) =>
      !item.deleted &&
      item.account === account &&
      item.issuer.toLowerCase() === issuer.toLowerCase()
  )
}

export const isRecoveryCodesSaved = async (
  parsedData: DataProps
): Promise<boolean> => {
  const storedData = await dataStore.getValue()
  const { account, issuer, secret, recoveryCodes } = parsedData

  const matchedAccount = storedData.find(
    (item) =>
      item.issuer === issuer &&
      item.secret === secret &&
      item.account === account
  )

  if (!matchedAccount?.recoveryCodes?.length || !recoveryCodes?.length) {
    return false
  }

  const formatCodes = (codes: { value: string }[]) =>
    codes.map(({ value }) => value).join(",")

  return (
    formatCodes(matchedAccount.recoveryCodes) === formatCodes(recoveryCodes)
  )
}

export const checkOtpAuthConfigExist = async (
  otpAuthConfig: OtpAuthConfig
) => {
  const list = await getOTPList(otpAuthConfig.issuer, otpAuthConfig.account)
  const isExist = list.some((item) => {
    return (
      item.type === otpAuthConfig.type &&
      item.issuer === otpAuthConfig.issuer &&
      item.secret === otpAuthConfig.secret &&
      item.account === otpAuthConfig.account
    )
  })
  return isExist
}

// expose legacy key for background migration
export { LEGACY_KEY }