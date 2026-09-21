import { storage } from "@wxt-dev/storage"
import React from "react"

import type { DataProps, OtpAuthConfig } from "~/utils/constant"
import { StorageKey } from "~/utils/constant"
import {
  DATA_KEY,
  dataStore,
  isRecoveryCodesSaved
} from "~/utils/storage"
import { addOtp, otpExists } from "~/utils/otp-crud"

/**
 * OTP 数据的 React 上下文（OTPStore）：
 *
 * - 单一数据源：dataStore（@wxt-dev/storage defineItem）由上下文持有
 * - 单一变更入口：mutators 内部封装 saveOTP 合并语义，避免 7 个镜像各自 setItem
 * - watch 跨 tab 同步：上层 storage.watch 触发 setState，所有订阅者重渲染
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
}

const OtpContext = React.createContext<OtpContextValue | null>(null)

const useOtpContext = (): OtpContextValue => {
  const ctx = React.useContext(OtpContext)
  if (!ctx) {
    throw new Error("useOtpContext must be used inside <OtpProvider>")
  }
  return ctx
}

/** Provider — 挂在 popup root */
export const OtpProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [items, setItems] = React.useState<DataProps[]>([])

  React.useEffect(() => {
    let cancelled = false

    dataStore.getValue().then((initial) => {
      if (!cancelled) setItems(initial ?? [])
    })

    const unwatch = storage.watch<DataProps[]>(DATA_KEY, (next) => {
      if (next !== null && next !== undefined) {
        setItems(next)
      }
    })

    return () => {
      cancelled = true
      unwatch()
    }
  }, [])

  const persist = React.useCallback(async (next: DataProps[]) => {
    setItems(next)
    await dataStore.setValue(next)
  }, [])

  const mutators = React.useMemo<OtpMutators>(
    () => ({
      add: async (otp) => {
        if (
          !otp.type ||
          !otp.secret ||
          !otp.issuer ||
          !otp.account
        ) {
          throw new Error(
            `otp is invalid: ${JSON.stringify(otp, null, 2)}`
          )
        }

        const { items: nextItems, inserted } = addOtp(items, otp)
        await persist(nextItems)
        return inserted
      },

      update: async (id, patch) => {
        const next = items.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ) as DataProps[]
        await persist(next)
      },

      softDelete: async (id) => {
        const next = items.map((item) =>
          item.id === id ? { ...item, deleted: true } : item
        ) as DataProps[]
        await persist(next)
      },

      restore: async (id) => {
        const next = items.map((item) =>
          item.id === id ? { ...item, deleted: false } : item
        ) as DataProps[]
        await persist(next)
      },

      hardDelete: async (id) => {
        await persist(items.filter((item) => item.id !== id))
      },

      pin: async (id, shouldPin) => {
        const target = items.find((item) => item.id === id)
        if (!target) return
        const rest = items.filter((item) => item.id !== id)
        const othersPinned = rest.filter((item) => item.pinned)
        const othersUnpinned = rest.filter((item) => !item.pinned)

        if (shouldPin) {
          await persist([
            { ...target, pinned: true },
            ...othersPinned,
            ...othersUnpinned
          ])
        } else {
          await persist([
            ...othersPinned,
            { ...target, pinned: false },
            ...othersUnpinned
          ])
        }
      },

      exists: async (otp) => otpExists(items, otp),

      isRecoveryCodesSavedFor: async (item) => isRecoveryCodesSaved(item),

      markRecoveryCodeCopied: async (id, codeValue) => {
        const next = items.map((item) => {
          if (item.id !== id || !Array.isArray(item.recoveryCodes)) return item
          const updatedCodes = item.recoveryCodes.map((code) =>
            code.value === codeValue && !code.copied
              ? { ...code, copied: true }
              : code
          )
          return { ...item, recoveryCodes: updatedCodes }
        }) as DataProps[]
        await persist(next)
      }
    }),
    [items, persist]
  )

  const value = React.useMemo<OtpContextValue>(
    () => ({ items, mutators }),
    [items, mutators]
  )

  return <OtpContext.Provider value={value}>{children}</OtpContext.Provider>
}

/** 读取当前所有 OTP 项 */
export const useOtpList = (): DataProps[] => useOtpContext().items

/** 读取 OTP 变更方法 */
export const useOtpMutators = (): OtpMutators => useOtpContext().mutators

// suppress unused-vars warning for items in selected contexts
void StorageKey
