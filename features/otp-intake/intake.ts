import { i18n } from "#i18n"
import { isOtpAuthUrl, parseOtpAuthUrl } from "~/utils/libs/otpauth"
import { readFromFile } from "~/utils/qr-decode"
import type { OtpAuthConfig } from "~/utils/types"

import type {
  IntakeDeps,
  IntakeOutcome,
  IntakeSource
} from "./intake.types"

/**
 * 从 QR 字符串解析 OtpAuthConfig；失败抛出 reason。
 *
 * `IntakeSource` 的 'qr-data' / 'file' 路径都走这个收敛点。
 */
const parseQrString = (raw: string): OtpAuthConfig | "not-otpauth" => {
  if (!isOtpAuthUrl(raw)) return "not-otpauth"
  try {
    return parseOtpAuthUrl(raw)
  } catch {
    return "not-otpauth"
  }
}

/**
 * OTP Intake 深模块
 *
 * 把"拿到 QR 候选 → 解析 → 补账号 → 去重落库 → 通知" 5 步收口为一次调用。
 * 不依赖 React、不依赖 chrome.*、不依赖具体 writer / notifier 实现；
 * 调用方只提供三件 dep：account / writer / notifier。
 *
 * 返回 `IntakeOutcome` 而非抛异常：调用方根据 status 走自己的 UI 收尾。
 *
 * 唯一支持两种 `source.kind`：
 * - `qr-data`：纯字符串（`parseQrString` 失败 → 收口为 warn）
 * - `file`：File（读失败 → 收口为 error）
 *
 * 没有 `parsed` 中间态：调用方应该传 raw 字符串，让 intake 自己负责 parse。
 */
export const intakeOtp = async (
  source: IntakeSource,
  deps: IntakeDeps
): Promise<IntakeOutcome> => {
  // 1. 解析为 OtpAuthConfig
  let config: OtpAuthConfig | null = null

  if (source.kind === "qr-data") {
    const parsed = parseQrString(source.data)
    if (parsed === "not-otpauth") {
      deps.notifier.warn(i18n.t("intake_warn_invalid_qr"))
      return { status: "invalid", reason: "not-otpauth" }
    }
    config = parsed
  } else {
    let data: string
    try {
      data = await readFromFile(source.file)
    } catch (error) {
      deps.notifier.error(
        i18n.t("intake_error_file_read", [(error as Error).message])
      )
      return { status: "invalid", reason: "file-read-error" }
    }
    const parsed = parseQrString(data)
    if (parsed === "not-otpauth") {
      deps.notifier.error(i18n.t("intake_error_invalid_otpauth"))
      return { status: "invalid", reason: "not-otpauth" }
    }
    config = parsed
  }

  // 2. 补账号：hintAccount 优先，否则询问用户
  if (!config.account) {
    if (deps.account.hintAccount) {
      config.account = deps.account.hintAccount
    } else {
      const acc = await deps.account.promptAccount(config.issuer ?? "")
      if (!acc) {
        deps.notifier.error(i18n.t("intake_error_prompt_account"))
        return { status: "cancelled" }
      }
      config.account = acc
    }
  }

  // 3. 写入：writer 内部处理完全重复（同 type+issuer+account+secret 视为已存在）
  let persisted
  try {
    persisted = await deps.writer.persist(config)
  } catch (error) {
    deps.notifier.error(
      i18n.t("intake_error_add_failed", [(error as Error).message])
    )
    return { status: "invalid", reason: "writer-failed" }
  }

  // 4. 通知 + 返回结果
  if (persisted.status === "exists") {
    deps.notifier.warn(i18n.t("intake_warn_account_exists"))
    return { status: "exists", item: persisted.item }
  }

  deps.notifier.success(
    i18n.t("intake_success_added", [config.issuer ?? "", config.account ?? ""])
  )
  return { status: "added", item: persisted.item }
}
