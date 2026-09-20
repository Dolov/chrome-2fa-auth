import { storage } from "@wxt-dev/storage"

import type { DataProps, OtpAuthConfig } from "./constant"
import { StorageKey } from "./constant"

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
  const existingData =
    (await storage.getItem<DataProps[]>(StorageKey.DATA)) || []

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
    return await storage.setItem(StorageKey.DATA, existingData)
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
    return await storage.setItem(StorageKey.DATA, existingData)
  }

  existingData.push(otpData)
  return await storage.setItem(StorageKey.DATA, existingData)
}

export const getOTPList = async (
  issuer: string,
  account?: string
): Promise<DataProps[]> => {
  const data = await storage.getItem<DataProps[]>(StorageKey.DATA)
  if (!data) return []

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
  const storedData =
    (await storage.getItem<DataProps[]>(StorageKey.DATA)) || []
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