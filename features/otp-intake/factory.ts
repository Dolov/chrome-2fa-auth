import { i18n } from "#i18n"

import message from "~/features/page-ui/toast"

import type {
  IntakeAccountResolver,
  IntakeNotifier
} from "./intake.types"

/**
 * Intake 默认工厂：popup / settings / content / background 共用 prompt 和 notifier。
 *
 * 抽到这里是为了避免「window.prompt + 同一份 toast notifier」在 adapter 文件
 * 之间逐字复制（架构报告 friction #3 + #5）。
 *
 * `writer` 因架构差异（popup 走 React mutator 让 OtpProvider 通知订阅者；
 * content 直走 dataStore）保留各自实现 —— 这条取舍在架构报告里有显式说明。
 *
 * 不变式：本文件无 React 依赖。content script 入口（features/otp-intake/index.ts）
 * 可以静态 import 这个文件。
 */

/** 浏览器原生 prompt：i18n 拿 issuer 提示文本，阻塞式询问用户账号 */
export const createWindowPrompt = (): IntakeAccountResolver["promptAccount"] =>
  async (issuer: string) =>
    window.prompt(i18n.t("intake_prompt_account_name", [issuer]))

/**
 * `features/page-ui/toast` 的 IntakeNotifier 适配。
 *
 * 双端可用：popup / settings 已在 React 树内但复用同一份 toast（独立上下文，
 * 不依赖 popup 的 daisyUI modal）；content script 直接向宿主页面插 DOM 提示。
 */
export const createToastNotifier = (): IntakeNotifier => ({
  success: (text) => message.success(text),
  warn: (text) => message.warning(text),
  error: (text) => message.error(text)
})
