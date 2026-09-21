import { isOtpAuthUrl, parseOtpAuthUrl } from "~/utils/auth"
import { readFromFile } from "~/utils/qr"
import type { OtpAuthConfig } from "~/utils/constant"

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
      deps.notifier.warn(
        "检测到二维码，但其格式不符合 OTPAuth 规范"
      )
      return { status: "invalid", reason: "not-otpauth" }
    }
    config = parsed
  } else if (source.kind === "file") {
    let data: string
    try {
      data = await readFromFile(source.file)
    } catch (error) {
      deps.notifier.error(`无法读取文件：${(error as Error).message}`)
      return { status: "invalid", reason: "file-read-error" }
    }
    const parsed = parseQrString(data)
    if (parsed === "not-otpauth") {
      deps.notifier.error("无效的 OTP Auth URL")
      return { status: "invalid", reason: "not-otpauth" }
    }
    config = parsed
  } else {
    config = source.config
  }

  // 2. 补账号：hintAccount 优先，否则询问用户
  if (!config.account) {
    if (deps.account.hintAccount) {
      config.account = deps.account.hintAccount
    } else {
      const acc = await deps.account.promptAccount(config.issuer ?? "")
      if (!acc) {
        deps.notifier.error("请输入账号名称")
        return { status: "cancelled" }
      }
      config.account = acc
    }
  }

  // 3. 写入：writer 内部处理去重 / 软删合并（utils/otp-crud.addOtp）
  let persisted
  try {
    persisted = await deps.writer.persist(config)
  } catch (error) {
    deps.notifier.error(`添加失败：${(error as Error).message}`)
    return { status: "invalid", reason: "writer-failed" }
  }

  // 4. 通知 + 返回结果
  if (persisted.status === "exists") {
    deps.notifier.warn("该账户已存在")
    return { status: "exists", item: persisted.item }
  }

  deps.notifier.success(
    `${config.issuer} - ${config.account} 添加成功`
  )
  return { status: "added", item: persisted.item }
}
