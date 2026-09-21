import React from "react"

import { getRemainingTime, resolveOtpStep } from "~/utils/totp"

/**
 * 共享秒级时钟。
 *
 * 全局只保留一个 `setInterval`，所有 OTP 渲染点订阅同一份 tick —— 替代
 * 「每个条目各起 2-3 个 interval」的实现。订阅者仅在快照值变化时重渲染：
 *
 * - `useOtpStepIndex(period)`：当前周期序号。只在 OTP 切换时变化，
 *   因此持有它的 `OtpText` 不会每秒重算 HMAC。
 * - `useOtpRemaining(period)`：剩余秒数。每秒变化，供进度条使用。
 */
const tickListeners = new Set<() => void>()
let tickInterval: ReturnType<typeof setInterval> | null = null

const notifyTick = (): void => {
  for (const listener of tickListeners) listener()
}

const subscribeTick = (listener: () => void): (() => void) => {
  tickListeners.add(listener)

  if (tickInterval === null) {
    tickInterval = setInterval(notifyTick, 1000)
  }

  return () => {
    tickListeners.delete(listener)
    if (tickListeners.size === 0 && tickInterval !== null) {
      clearInterval(tickInterval)
      tickInterval = null
    }
  }
}

/** 当前 OTP 周期序号（周期切换时才变化） */
export const useOtpStepIndex = (period?: number): number =>
  React.useSyncExternalStore(subscribeTick, () =>
    Math.floor(Date.now() / 1000 / resolveOtpStep(period))
  )

/** 到下一个 OTP 切换的剩余秒数（每秒变化） */
export const useOtpRemaining = (period?: number): number =>
  React.useSyncExternalStore(subscribeTick, () => getRemainingTime({ period }))
