import React from "react"

import { addOtp, otpExists } from "~/features/otp-store/otp-crud"
import {
  ensureOtpListLoaded,
  getOtpStoreSnapshot,
  isRecoveryCodesSaved,
  mutateOtpList,
  subscribeOtpList
} from "~/features/otp-store/store"
import type { DataProps, OtpAuthConfig } from "~/utils/types"

/**
 * OTP 数据的 React 上下文（OtpStore）：
 *
 * - 单一数据源：`dataStore`（@wxt-dev/storage defineItem）
 * - 读取经 `useSyncExternalStore` 订阅存储层缓存；跨 tab 由 `storage.watch` 同步
 * - 写入统一走 `mutateOtpList`：基于最新缓存计算，避免并发写丢更新
 */

export interface OtpMutators {
  add(otp: Omit<DataProps, "id">): Promise<DataProps>
  update(id: string, patch: Partial<DataProps>): Promise<void>
  softDelete(id: string): Promise<void>
  restore(id: string): Promise<void>
  hardDelete(id: string): Promise<void>
  pin(id: string, shouldPin: boolean): Promise<void>
  exists(otp: OtpAuthConfig): Promise<boolean>
  isRecoveryCodesSavedFor(item: DataProps): Promise<boolean>
  markRecoveryCodeCopied(id: string, codeValue: string): Promise<void>
}

export interface OtpContextValue {
  items: DataProps[]
  mutators: OtpMutators
  isLoaded: boolean
}

const OtpContext = React.createContext<OtpContextValue | null>(null)

const useOtpContext = (): OtpContextValue => {
  const ctx = React.useContext(OtpContext)
  if (!ctx) {
    throw new Error("useOtpContext must be used inside <OtpProvider>")
  }
  return ctx
}

/**
 * 模块级常量：mutators 不依赖任何渲染态。
 *
 * 这样可以保证引用稳定 —— 消费者的 `useMemo` / `useEffect` 不会因为列表
 * 变化而收到新的 mutator 引用。
 */
const mutators: OtpMutators = {
  add: async (otp) => {
    if (!otp.type || !otp.secret || !otp.issuer || !otp.account) {
      throw new Error(`otp is invalid: ${JSON.stringify(otp, null, 2)}`)
    }

    return mutateOtpList((current) => {
      const { items, inserted } = addOtp(current, otp)
      return { items, result: inserted }
    })
  },

  update: async (id, patch) => {
    await mutateOtpList((current) => ({
      items: current.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ) as DataProps[],
      result: undefined
    }))
  },

  softDelete: async (id) => {
    await mutateOtpList((current) => ({
      items: current.map((item) =>
        item.id === id ? { ...item, deleted: true } : item
      ) as DataProps[],
      result: undefined
    }))
  },

  restore: async (id) => {
    await mutateOtpList((current) => ({
      items: current.map((item) =>
        item.id === id ? { ...item, deleted: false } : item
      ) as DataProps[],
      result: undefined
    }))
  },

  hardDelete: async (id) => {
    await mutateOtpList((current) => ({
      items: current.filter((item) => item.id !== id),
      result: undefined
    }))
  },

  pin: async (id, shouldPin) => {
    await mutateOtpList((current) => {
      const target = current.find((item) => item.id === id)
      if (!target) return { items: current, result: undefined }

      const rest = current.filter((item) => item.id !== id)
      const othersPinned = rest.filter((item) => item.pinned)
      const othersUnpinned = rest.filter((item) => !item.pinned)

      if (shouldPin) {
        return {
          items: [
            { ...target, pinned: true },
            ...othersPinned,
            ...othersUnpinned
          ],
          result: undefined
        }
      }

      return {
        items: [
          ...othersPinned,
          { ...target, pinned: false },
          ...othersUnpinned
        ],
        result: undefined
      }
    })
  },

  exists: async (otp) => {
    const current = await ensureOtpListLoaded()
    return otpExists(current, otp)
  },

  isRecoveryCodesSavedFor: (item) => isRecoveryCodesSaved(item),

  markRecoveryCodeCopied: async (id, codeValue) => {
    await mutateOtpList((current) => ({
      items: current.map((item) => {
        if (item.id !== id || !Array.isArray(item.recoveryCodes)) return item
        const updatedCodes = item.recoveryCodes.map((code) =>
          code.value === codeValue && !code.copied
            ? { ...code, copied: true }
            : code
        )
        return { ...item, recoveryCodes: updatedCodes }
      }) as DataProps[],
      result: undefined
    }))
  }
}

/** Provider — 挂在 popup / settings root */
export const OtpProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const { items, isLoaded } = React.useSyncExternalStore(
    subscribeOtpList,
    getOtpStoreSnapshot,
    getOtpStoreSnapshot
  )

  const value = React.useMemo<OtpContextValue>(
    () => ({ items, mutators, isLoaded }),
    [items, isLoaded]
  )

  return <OtpContext.Provider value={value}>{children}</OtpContext.Provider>
}

/** 读取当前所有 OTP 项 */
export const useOtpList = (): DataProps[] => useOtpContext().items

/** 列表是否已完成首次存储读取 */
export const useOtpListLoaded = (): boolean => useOtpContext().isLoaded

/** 读取 OTP 变更方法 */
export const useOtpMutators = (): OtpMutators => useOtpContext().mutators
