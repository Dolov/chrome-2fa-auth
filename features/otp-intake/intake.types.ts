import type { DataProps, OtpAuthConfig } from "~/utils/types"

/**
 * Intake 的输入来源
 *
 * - `qr-data`：已从 DOM 取到的字符串（autoScan / manualScreenshot / popup paste）
 * - `file`：用户选择的本地图片文件，需走 readFromFile → parse
 * - `parsed`：调用方已经 parse 过，只需补 account
 */
export type IntakeSource =
  | { kind: "qr-data"; data: string }
  | { kind: "file"; file: File }
  | { kind: "parsed"; config: OtpAuthConfig }

/**
 * 账号补全：调用方负责在 `config.account` 缺失时如何取账号。
 *
 * - `promptAccount(issuer)`：阻塞地询问用户（window.prompt 或弹窗）
 * - `hintAccount`：可选预填（如 GitHub meta 标签读出来的 username）
 */
export interface IntakeAccountResolver {
  promptAccount(issuer: string): Promise<string | null>
  hintAccount?: string
}

/**
 * 持久化：把 config 落到 OtpStore。
 *
 * 调用方各自实现 writer：popup 走 OtpMutators，content script 走 dataStore.setValue + addOtp。
 */
export interface IntakeWriter {
  persist(config: OtpAuthConfig): Promise<IntakePersistResult>
}

export type IntakePersistResult =
  | { status: "added"; item: DataProps }
  | { status: "exists"; item: DataProps }

/** 调用方提供的 toast 通道 */
export interface IntakeNotifier {
  success(text: string): void
  warn(text: string): void
  error(text: string): void
}

/**
 * Intake 编排的依赖：account 怎么补、写入走哪、提示怎么给。
 */
export interface IntakeDeps {
  account: IntakeAccountResolver
  writer: IntakeWriter
  notifier: IntakeNotifier
}

/**
 * Intake 的返回值：调用方拿到状态后可继续自己的 UI 反馈（如关闭 modal、跳转等）。
 */
export type IntakeOutcome =
  | { status: "added"; item: DataProps }
  | { status: "exists"; item: DataProps }
  | { status: "cancelled" }
  | { status: "invalid"; reason: IntakeInvalidReason }

export type IntakeInvalidReason =
  | "not-otpauth"
  | "parse-error"
  | "file-read-error"
  | "missing-account"
  | "writer-failed"
