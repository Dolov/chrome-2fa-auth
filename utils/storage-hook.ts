import { storage } from "@wxt-dev/storage"
import React from "react"

/**
 * 轻量 useStorage hook（WXT storage 原生 API 封装）
 *
 * WXT 不提供内置 React hook，本文件是薄封装：
 * - 初始读取：storage.getItem
 * - 实时同步：storage.watch
 * - 写入：storage.setItem
 *
 * 存储区域前缀沿用 Plasmo 版本的 `sync:`（保证老用户数据兼容）。
 */
export const STORAGE_AREA = "sync" as const

export const toWxtKey = (
  key: string
): `${typeof STORAGE_AREA}:${string}` => `${STORAGE_AREA}:${key}`

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
  const [value, setValue] = React.useState<T | undefined>(defaultValue)

  React.useEffect(() => {
    let active = true

    storage.getItem<T>(wxtKey).then((stored) => {
      if (active && stored !== null && stored !== undefined) {
        setValue(stored)
      }
    })

    const unwatch = storage.watch<T>(wxtKey, (newValue) => {
      if (newValue !== null && newValue !== undefined) {
        setValue(newValue)
      }
    })

    return () => {
      active = false
      unwatch()
    }
  }, [wxtKey])

  const update = React.useCallback(
    async (next: T | undefined) => {
      setValue(next)
      await storage.setItem(wxtKey, next)
    },
    [wxtKey]
  )

  return [value, update] as const
}
