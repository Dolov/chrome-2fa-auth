import { dataStore } from "~/features/otp-store/store"
import { addOtp } from "~/features/otp-store/otp-crud"
import { i18n } from "#i18n"
import type { OtpAuthConfig } from "~/utils/types"
import message from "~/features/page-ui/toast"

import { intakeOtp } from "../intake"
import type {
  IntakeAccountResolver,
  IntakeNotifier,
  IntakeOutcome,
  IntakeSource,
  IntakeWriter
} from "../intake.types"

/**
 * Content script 用 toast notifier
 *
 * 内容脚本也用 features/page-ui/toast（DOM 内 div 注入），无 React 依赖。
 */
const contentNotifier: IntakeNotifier = {
  success: (text) => message.success(text),
  warn: (text) => message.warning(text),
  error: (text) => message.error(text)
}

/**
 * Content script 用 writer：直接走 dataStore + 纯函数 addOtp
 *
 * 不依赖 React / OtpProvider（content script 没有 React 树）。
 * `addOtp` 在 utils/otp-crud 已处理去重 / 软删合并（详见 ADR-0001）。
 */
const createContentWriter = (): IntakeWriter => ({
  persist: async (config: OtpAuthConfig) => {
    const existing = await dataStore.getValue()
    const { items, inserted } = addOtp(existing ?? [], config)
    await dataStore.setValue(items)
    return { status: "added", item: inserted }
  }
})

/**
 * Content script 端 intake 调用入口
 *
 * @param hintAccount 从 URL/页面 meta 拿到的预填账号
 * @param overrides 可选替换 promptAccount（默认 window.prompt）
 */
export const createContentIntake = (opts: {
  hintAccount?: string
  promptAccount?: IntakeAccountResolver["promptAccount"]
}) => {
  const writer = createContentWriter()
  const account: IntakeAccountResolver = {
    promptAccount:
      opts.promptAccount ??
      (async (issuer) => window.prompt(i18n.t("intake_prompt_account_name", [issuer]))),
    hintAccount: opts.hintAccount
  }

  return (source: IntakeSource): Promise<IntakeOutcome> =>
    intakeOtp(source, {
      account,
      writer,
      notifier: contentNotifier
    })
}
