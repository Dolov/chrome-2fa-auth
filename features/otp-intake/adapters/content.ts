import { addOtp, otpExists } from "~/features/otp-store/otp-crud"
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
 * Content script 端 intake 调用入口
 *
 * 与 popup 端共用一个写入通道（`mutateOtpList`，见架构报告 friction #4）：
 * - 不依赖 React / OtpProvider（content script 没有 React 树）
 * - 不绕过 cache（与 popup 双端的并发保护同一层）
 *
 * prompt 与 notifier 取自工厂（friction #3+#5）。
 */
export const createContentIntake = (opts: {
  hintAccount?: string
  promptAccount?: IntakeAccountResolver["promptAccount"]
}) => {
  const writer: IntakeWriter = {
    persist: (config) =>
      mutateOtpList<IntakePersistResult>((current) => {
        if (otpExists(current, config)) {
          const matched = current.find(
            (item) =>
              !item.deleted &&
              item.type === config.type &&
              item.issuer === config.issuer &&
              item.secret === config.secret &&
              item.account === config.account
          )
          return { items: current, result: { status: "exists", item: matched! } }
        }
        const { items, inserted } = addOtp(current, config)
        return { items, result: { status: "added", item: inserted } }
      })
  }

  const account: IntakeAccountResolver = {
    promptAccount:
      opts.promptAccount ??
      createWindowPrompt(),
    hintAccount: opts.hintAccount
  }

  return (source: IntakeSource): Promise<IntakeOutcome> =>
    intakeOtp(source, {
      account,
      writer,
      notifier: createToastNotifier()
    })
}
