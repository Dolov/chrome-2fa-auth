/**
 * F5. OTP 显示与复制 → `05-otp.spec.ts`
 *
 * 本次只覆盖**数值正确性**相关案例（清单 31 / 34 / 36 + 多账户），
 * 目的是在做 TOTP 实现替换（去 otplib + Node 垫片）前，先用独立 otplib
 * 把现状的数值钉死。替换后同一份 spec 必须不改一行仍然全绿。
 *
 * 剪贴板（33）、进度条颜色（35）、每秒刷新（32）留到后续补全 F5 时再写。
 *
 * 时间用 `page.clock` 固定，保证断言是确定的精确值而不是「±1s 容差」。
 */
import { expect, test } from "../fixtures/extension"
import {
  TEST_SECRET,
  TEST_SECRET_2,
  expectedNextOtp,
  expectedOtp,
  expectedRemainingTime
} from "../fixtures/test-secret"

/**
 * 固定参考时刻：2026-01-15T00:00:07Z。
 * 选在周期开始后 7 秒（剩余 23 秒），远离 30s 边界，排除边界抖动。
 */
const FIXED_TIME = new Date("2026-01-15T00:00:07.000Z")

const sampleAccount = (
  id: string,
  issuer: string,
  account: string,
  secret: string
) => ({ id, type: "totp" as const, secret, issuer, account })

/** 卡片容器（ListItem 的最外层 div） */
const cards = (popup: { locator: (s: string) => any }) =>
  popup.locator("div.group")

/** 卡片内当前的 OTP 文本（两个 span 拼接，无分隔符） */
const currentOtpOf = (card: any) => card.locator("div.font-bold")

/** 卡片内「下一个」的 OTP 文本 */
const nextOtpOf = (card: any) => card.locator("div.text-sm")

/** 把 popup 的时间固定到指定时刻，并重新加载让首次渲染就用固定时间 */
const pinTime = async (popup: any, time: Date) => {
  await popup.clock.setFixedTime(time)
  await popup.reload()
  await popup.waitForLoadState("domcontentloaded")
  await expect(cards(popup).first()).toBeVisible({ timeout: 10_000 })
}

test.describe("F5 otp > 数值正确性", () => {
  test("Case 31 (P0): 显示 6 位数字，且与独立 otplib 算的一致", async ({
    helper
  }) => {
    await helper.seedData([sampleAccount("1", "TestApp", "alice", TEST_SECRET)])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const expected = expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME })
      expect(expected).toMatch(/^\d{6}$/)

      const shown = await currentOtpOf(cards(popup).first()).innerText()
      expect(shown.trim()).toBe(expected)
    } finally {
      await popup.close()
    }
  })

  test("Case 36 (P1): 下一周期的数字与 otplib 算的一致", async ({ helper }) => {
    await helper.seedData([sampleAccount("1", "TestApp", "alice", TEST_SECRET)])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const expectedCurrent = expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME })
      const expectedNext = expectedNextOtp({
        secret: TEST_SECRET,
        date: FIXED_TIME
      })
      // 固定时刻下两者必须不同，否则这条断言没有区分力
      expect(expectedNext).not.toBe(expectedCurrent)

      const card = cards(popup).first()
      expect((await currentOtpOf(card).innerText()).trim()).toBe(expectedCurrent)
      expect((await nextOtpOf(card).innerText()).trim()).toBe(expectedNext)
    } finally {
      await popup.close()
    }
  })

  test("Case 34 (P0): 进度条剩余秒数与 otplib 的 totpTimeRemaining 一致", async ({
    helper
  }) => {
    await helper.seedData([sampleAccount("1", "TestApp", "alice", TEST_SECRET)])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const expected = expectedRemainingTime(FIXED_TIME)
      const progress = cards(popup).first().locator("progress")
      await expect(progress).toHaveAttribute("max", "30")
      await expect(progress).toHaveAttribute("value", String(expected))
    } finally {
      await popup.close()
    }
  })

  test("多账户：各自用自己的 secret 算出正确值", async ({ helper }) => {
    await helper.seedData([
      sampleAccount("1", "TestApp", "alice", TEST_SECRET),
      sampleAccount("2", "GitHub", "bob", TEST_SECRET_2)
    ])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const expectedA = expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME })
      const expectedB = expectedOtp({ secret: TEST_SECRET_2, date: FIXED_TIME })
      expect(expectedA).not.toBe(expectedB)

      const list = cards(popup)
      await expect(currentOtpOf(list.nth(0))).toHaveText(expectedA)
      await expect(currentOtpOf(list.nth(1))).toHaveText(expectedB)
      await expect(list).toHaveCount(2)
    } finally {
      await popup.close()
    }
  })
})
