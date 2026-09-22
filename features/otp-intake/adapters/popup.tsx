import { useCallback } from "react"

import { useOtpMutators } from "~/features/otp-store"
import message from "~/features/page-ui/toast"
import { i18n } from "#i18n"

import { intakeOtp } from "../intake"
import type {
  IntakeAccountResolver,
  IntakeNotifier,
  IntakeOutcome,
  IntakeSource,
  IntakeWriter
} from "../intake.types"

/** 固定复用：popup 全局共用一个 message notifier */
const popupNotifier: IntakeNotifier = {
  success: (text) => message.success(text),
  warn: (text) => message.warning(text),
  error: (text) => message.error(text)
}

/**
 * 在 popup 端构造 Intake 调用方的便利 hook
 *
 * 返回一个 `(source, hintAccount?) => Promise<IntakeOutcome>`，
 * 写入走 OtpMutators（OtpProvider 内 React 订阅）。
 */
export const usePopupIntake = () => {
  const mutators = useOtpMutators()

  const writer: IntakeWriter = {
    persist: async (config) => {
      const exists = await mutators.exists(config)
      if (exists) {
        return {
          status: "exists",
          item: {
            ...config,
            id: ""
          }
        }
      }
      const item = await mutators.add(config)
      return { status: "added", item }
    }
  }

  return useCallback(
    (
      source: IntakeSource,
      options: { hintAccount?: string } = {}
    ): Promise<IntakeOutcome> => {
      const account: IntakeAccountResolver = {
        promptAccount: async (issuer) =>
          window.prompt(i18n.t("intake_prompt_account_name", [issuer])),
        hintAccount: options.hintAccount
      }
      return intakeOtp(source, {
        account,
        writer,
        notifier: popupNotifier
      })
    },
    [mutators]
  )
}

/**
 * 非 hook 版的 popup 入口：传入 mutators + 可选 notifier。
 *
 * 适用于 popup 内非 React 函数（不太常用，保留备查）。
 */
export const createPopupIntake = (opts: {
  writer: IntakeWriter
  notifier?: IntakeNotifier
  hintAccount?: string
}) => {
  return (
    source: IntakeSource
  ): Promise<IntakeOutcome> => {
    const account: IntakeAccountResolver = {
      promptAccount: async (issuer) =>
        window.prompt(i18n.t("intake_prompt_account_name", [issuer])),
      hintAccount: opts.hintAccount
    }
    return intakeOtp(source, {
      account,
      writer: opts.writer,
      notifier: opts.notifier ?? popupNotifier
    })
  }
}

/** 直接复用：一个 read-only 的 promptAccount 给 unit-style 测试用 */
export const __test__ = {
  promptForAccount: async (issuer: string): Promise<string | null> =>
    window.prompt(i18n.t("intake_prompt_account_name", [issuer]))
}
