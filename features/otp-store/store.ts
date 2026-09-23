import { storage } from "@wxt-dev/storage"

import type { DataProps } from "~/utils/types"
import { StorageKey } from "~/utils/types"

import { addOtp } from "./otp-crud"

/**
 * OtpStore 的存储层：chrome.storage 声明 + React 树外的读写路径。
 *
 * - `dataStore`：全应用单一数据源（ADR-0001）。它**仅供读**和订阅；任何写入
 *   都应走 `mutateOtpList`（OtpProvider 的 mutators、content script 的 intake
 *   writer、`saveOTP` 的恢复码路径都走这条）。
 * - `saveOTP` / `getOTPList` / `isRecoveryCodesSaved`：content script /
 *   background 用的现成入口。
 *
 * 用 storage.defineItem 提供：
 * - 类型安全的 getValue/setValue
 * - fallback 兜底，调用方无需 null 守卫
 * - watch() 跨上下文响应式
 *
 * 存储区域：
 * - DATA: sync:（与 Plasmo 旧版兼容，避免现有用户数据丢失；
 *   sync 单项 8KB，>10 帐号 约 1-2KB，典型场景足够）
 */
export const DATA_KEY = `sync:${StorageKey.DATA}` as const

export const dataStore = storage.defineItem<DataProps[]>(DATA_KEY, {
  fallback: []
})

/**
 * 写入 OtpStore 的**唯一入口**。
 *
 * 任何写入（OtpMutators / content-side intake / `saveOTP` 的恢复码路径）
 * 都必须走 `mutateOtpList` —— 它基于内存缓存做并发读保护 + 写入 + 通知，
 * 让 React Provider / content script / background 拿到同一份写入语义与
 * 「最后写入赢」顺序保证。直调 `dataStore.setValue` 是历史代码的快捷出口，
 * 不是新调用方应走的路（架构报告 friction #6 + ADR-0001 v2）。
 */
export const mutateOtpList = async <T>(
  mutator: (current: DataProps[]) => { items: DataProps[]; result: T }
): Promise<T> => {
  const current = await ensureOtpListLoaded()
  const { items: next, result } = mutator(current)
  if (next !== current) await commitOtpList(next)
  return result
}

/**
 * `saveOTP`：恢复码场景的 bridge。
 *
 * 走 `mutateOtpList` 而不是直调 dataStore.setValue，让 content script 在
 * React Provider 不在场的场景下也享受同一份并发保护 —— 也让 ADR-0001
 * 「单一数据源 / 唯一写入」不变式不再依赖不存在的「content 例外」。
 */
export const saveOTP = async (otpData: DataProps): Promise<void> => {
  if (
    !otpData.id ||
    !otpData.type ||
    !otpData.secret ||
    !otpData.issuer ||
    !otpData.account
  ) {
    throw new Error(`otpData is invalid: ${JSON.stringify(otpData, null, 2)}`)
  }
  await mutateOtpList((current) => {
    const { items } = addOtp(current, {
      type: otpData.type,
      secret: otpData.secret,
      issuer: otpData.issuer,
      account: otpData.account,
      algorithm: otpData.algorithm,
      digits: otpData.digits,
      period: otpData.period,
      counter: otpData.counter,
      pinned: otpData.pinned,
      remark: otpData.remark,
      recoveryCodes: otpData.recoveryCodes
    })
    return { items, result: undefined }
  })
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

/** 空列表常量：保证首次加载完成前 `getCachedOtpList()` 返回稳定引用 */
const EMPTY_OTP_LIST: DataProps[] = []

let cachedList: DataProps[] | null = null
let stopWatching: (() => void) | null = null
let initialLoad: Promise<DataProps[]> | null = null
const listListeners = new Set<() => void>()

const emitListChange = (): void => {
  for (const listener of listListeners) listener()
}

/** 同步读取最近一次已知的列表；首次加载完成前返回空数组 */
export const getCachedOtpList = (): DataProps[] => cachedList ?? EMPTY_OTP_LIST

/** 确保列表至少从存储读取一次；并发调用共享同一个 Promise */
export const ensureOtpListLoaded = (): Promise<DataProps[]> => {
  if (cachedList !== null) return Promise.resolve(cachedList)
  if (initialLoad !== null) return initialLoad

  initialLoad = dataStore
    .getValue()
    .then((stored) => {
      if (cachedList === null) {
        cachedList = stored ?? []
        emitListChange()
      }
      return cachedList
    })
    .finally(() => {
      initialLoad = null
    })

  return initialLoad
}

/** 唯一写入通道：先同步更新缓存并通知订阅者，再落存储 */
export const commitOtpList = async (next: DataProps[]): Promise<void> => {
  cachedList = next
  emitListChange()
  await dataStore.setValue(next)
}

/** 订阅列表变化；首个订阅者负责建立 `storage.watch` 并触发首次加载 */
export const subscribeOtpList = (listener: () => void): (() => void) => {
  listListeners.add(listener)

  if (stopWatching === null) {
    stopWatching = dataStore.watch((next) => {
      cachedList = next ?? []
      emitListChange()
    })
  }

  void ensureOtpListLoaded()

  return () => {
    listListeners.delete(listener)
    if (listListeners.size === 0 && stopWatching !== null) {
      stopWatching()
      stopWatching = null
    }
  }
}
