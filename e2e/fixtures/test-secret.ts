/**
 * 测试用 OTP secret 与标准向量
 * 不 import 项目内部代码
 */
import { authenticator } from "otplib"

export const TEST_SECRET = "JBSWY3DPEHPK3PXP"
export const TEST_ISSUER = "TestApp"
export const TEST_ACCOUNT = "testuser"

export const TEST_OTPAUTH_URL = `otpauth://totp/${TEST_ISSUER}:${TEST_ACCOUNT}?secret=${TEST_SECRET}&issuer=${TEST_ISSUER}`

export const TEST_SECRET_2 = "KRSXG5BAONSWG4TFOQ"
export const TEST_ISSUER_2 = "GitHub"
export const TEST_ACCOUNT_2 = "testaccount"

/**
 * 用独立 otplib 计算当前 OTP（仅用于断言，不调用项目代码）
 */
export function expectedOtp(secret = TEST_SECRET, date = new Date()): string {
  authenticator.options = { step: 30, digits: 6, window: 0 }
  // 通过 epoch 控制时间
  const epoch = date.getTime()
  const counter = Math.floor(epoch / 30000)
  ;(authenticator as unknown as { _epoch: number })._epoch = epoch
  void counter
  return authenticator.generate(secret)
}

/**
 * 计算下一周期 OTP
 */
export function expectedNextOtp(secret = TEST_SECRET, date = new Date()): string {
  const next = new Date(date.getTime() + 30_000)
  return expectedOtp(secret, next)
}