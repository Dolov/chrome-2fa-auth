import { storage } from "@wxt-dev/storage"
import React from "react"

/**
 * 轻量 useStorage hook（WXT storage 原生 API 封装）
 *
 * 设计：
 * - 每个 storage key 一个模块级缓存 + 订阅者集合（同一上下文内共享）
 * - 读取经 `useSyncExternalStore`，避免 `useEffect + setState` 的撕裂窗口
 * - 写入先同步更新缓存再落存储，保证乐观更新无闪烁
 *
 * 存储区域前缀沿用 Plasmo 版本的 `sync:`（保证老用户数据兼容）。
 */
export const STORAGE_AREA = "sync" as const

type WxtKey = `${typeof STORAGE_AREA}:${string}`

export const toWxtKey = (key: string): WxtKey => `${STORAGE_AREA}:${key}`

interface StorageEntry {
  listeners: Set<() => void>
  value: unknown
  hasValue: boolean
  stopWatch: (() => void) | null
}

const entries = new Map<WxtKey, StorageEntry>()

const getEntry = (wxtKey: WxtKey): StorageEntry => {
  const existing = entries.get(wxtKey)
  if (existing) return existing

  const entry: StorageEntry = {
    listeners: new Set(),
    value: undefined,
    hasValue: false,
    stopWatch: null
  }
  entries.set(wxtKey, entry)
  return entry
}

const storeValue = (entry: StorageEntry, value: unknown): void => {
  entry.value = value
  entry.hasValue = value !== null && value !== undefined
  for (const listener of entry.listeners) listener()
}

const subscribeToKey =
  <T>(wxtKey: WxtKey) =>
  (listener: () => void): (() => void) => {
    const entry = getEntry(wxtKey)
    entry.listeners.add(listener)

    if (entry.stopWatch === null) {
      entry.stopWatch = storage.watch<T>(wxtKey, (next) => {
        if (next === null || next === undefined) return
        storeValue(entry, next)
      })
      void storage.getItem<T>(wxtKey).then((stored) => {
        if (stored === null || stored === undefined) return
        storeValue(entry, stored)
      })
    }

    return () => {
      entry.listeners.delete(listener)
      if (entry.listeners.size === 0 && entry.stopWatch !== null) {
        entry.stopWatch()
        entry.stopWatch = null
      }
    }
  }

export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>]
export function useStorage<T>(
  key: string,
  defaultValue?: T
): [T | undefined, (value: T | undefined) => Promise<void>]
export function useStorage<T>(key: string, defaultValue?: T) {
  const wxtKey = toWxtKey(key)
  const subscribe = React.useMemo(() => subscribeToKey<T>(wxtKey), [wxtKey])

  const getSnapshot = React.useCallback((): T | undefined => {
    const entry = entries.get(wxtKey)
    if (entry?.hasValue) return entry.value as T
    return defaultValue
  }, [wxtKey, defaultValue])

  const value = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const update = React.useCallback(
    async (next: T | undefined) => {
      storeValue(getEntry(wxtKey), next)
      await storage.setItem<T>(wxtKey, next as T)
    },
    [wxtKey]
  )

  return [value, update] as const
}
