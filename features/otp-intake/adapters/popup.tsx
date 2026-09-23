import { useCallback } from "react"

import { addOtp, findMatchingOtp } from "~/features/otp-store/otp-crud"
import { mutateOtpList } from "~/features/otp-store/store"

import { intakeOtp } from "../intake"
import type {
  IntakeAccountResolver,
  IntakeOutcome,
  IntakePersistResult,
  IntakeSource,
  IntakeWriter
} from "../intake.types"
import { createToastNotifier, createWindowPrompt } from "../factory"

/**
 * Popup 端的 Intake 便利 hook
 *
 * - writer 与 content 端走同一条路：`mutateOtpList` + `addOtp`。
 *   这样 exists / added 文案在双端一致，popup 也不再制造 `{ id: "" }` 的假条目
 *   （架构报告 friction #4）。
 * - prompt 与 notifier 取自工厂（friction #3 + #5）。
 * - 写入仍经 OtpStore 的 `mutateOtpList`，让 OtpProvider 的 React 订阅者收到
 *   `useSyncExternalStore` 通知 —— popup 上下文之所以选这条路径的原因。
 */
export const usePopupIntake = () => {
  const writer: IntakeWriter = {
    persist: (config) =>
      mutateOtpList<IntakePersistResult>((current) => {
        const matched = findMatchingOtp(current, config)
        if (matched) {
          return { items: current, result: { status: "exists", item: matched } }
        }
        const { items, inserted } = addOtp(current, config)
        return { items, result: { status: "added", item: inserted } }
      })
  }

  return useCallback(
    (
      source: IntakeSource,
      options: { hintAccount?: string } = {}
    ): Promise<IntakeOutcome> => {
      const account: IntakeAccountResolver = {
        promptAccount: createWindowPrompt(),
        hintAccount: options.hintAccount
      }
      return intakeOtp(source, {
        account,
        writer,
        notifier: createToastNotifier()
      })
    },
    [writer]
  )
}
