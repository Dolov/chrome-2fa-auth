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
  FIXED_TIME,
  TEST_SECRET,
  TEST_SECRET_2,
  expectedNextOtp,
  expectedOtp,
  expectedRemainingTime
} from "../fixtures/test-secret"

const sampleAccount = (
  id: string,
  issuer: string,
  account: string,
  secret: string
) => ({ id, type: "totp" as const, secret, issuer, account })

/** 卡片容器（ListItem 的最外层 div） */
const cards = (popup: { getByTestId: (id: string) => any }) =>
  popup.getByTestId("otp-list-item")

/** 卡片内当前的 OTP 文本（两 span 拼接，无分隔符） */
const currentOtpOf = (card: { getByTestId: (id: string) => any }) =>
  card.getByTestId("otp-current")

/** 卡片内「下一个」的 OTP 文本 */
const nextOtpOf = (card: { getByTestId: (id: string) => any }) =>
  card.getByTestId("otp-next")

/** 卡片内的 OTP 进度条 */
const progressOf = (card: { getByTestId: (id: string) => any }) =>
  card.getByTestId("otp-progress")

/** 把 popup 的时间固定到指定时刻，并重新加载让首次渲染就用固定时间 */
const pinTime = async (popup: any, time: Date) => {
  // 用 install（而非 setFixedTime）：install 安装可控的 fake 时钟，
  // 让 fastForward 能真正推进 Date.now() 并触发 tick interval（Case 32）。
  await popup.clock.install({ time })
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

      await expect(currentOtpOf(cards(popup).first())).toHaveText(expected)
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
      await expect(currentOtpOf(card)).toHaveText(expectedCurrent)
      await expect(nextOtpOf(card)).toHaveText(expectedNext)
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
      const progress = progressOf(cards(popup).first())
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

  test("digits=8：显示 8 位码，且与 otplib 一致", async ({ helper }) => {
    await helper.seedData([
      { ...sampleAccount("1", "TestApp", "alice", TEST_SECRET), digits: 8 }
    ])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const expected = expectedOtp({
        secret: TEST_SECRET,
        digits: 8,
        date: FIXED_TIME
      })
      expect(expected).toMatch(/^\d{8}$/)

      await expect(currentOtpOf(cards(popup).first())).toHaveText(expected)

      // TODO `docs/TODO.md`：digits=8 视觉分组断言 — half = ceil(8/2) = 4
      const otpElement = currentOtpOf(cards(popup).first())
      const spans = otpElement.locator("span")
      await expect(spans).toHaveCount(2)
      const firstSpan = (await spans.nth(0).textContent()) ?? ""
      const secondSpan = (await spans.nth(1).textContent()) ?? ""
      expect(firstSpan).toHaveLength(4)
      expect(secondSpan).toHaveLength(4)
      expect(firstSpan + secondSpan).toBe(expected)
    } finally {
      await popup.close()
    }
  })

  test("algorithm=SHA256：与 otplib 的 sha256 结果一致", async ({ helper }) => {
    await helper.seedData([
      {
        ...sampleAccount("1", "TestApp", "alice", TEST_SECRET),
        algorithm: "SHA256"
      }
    ])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const expectedSha256 = expectedOtp({
        secret: TEST_SECRET,
        algorithm: "sha256",
        date: FIXED_TIME
      })
      const expectedSha1 = expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME })
      // 两个算法必须算出不同结果，否则这条断言没有区分力
      expect(expectedSha256).not.toBe(expectedSha1)

      await expect(currentOtpOf(cards(popup).first())).toHaveText(
        expectedSha256
      )
    } finally {
      await popup.close()
    }
  })

  test("algorithm=SHA512：与 otplib 的 sha512 结果一致（含 8 位数字）", async ({
    helper
  }) => {
    await helper.seedData([
      {
        ...sampleAccount("1", "TestApp", "alice", TEST_SECRET),
        algorithm: "SHA512"
      }
    ])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const expectedSha512 = expectedOtp({
        secret: TEST_SECRET,
        algorithm: "sha512",
        date: FIXED_TIME
      })
      const expectedSha1 = expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME })
      // 两个算法必须算出不同结果，否则这条断言没有区分力
      expect(expectedSha512).not.toBe(expectedSha1)

      await expect(currentOtpOf(cards(popup).first())).toHaveText(
        expectedSha512
      )
    } finally {
      await popup.close()
    }
  })

  test("period=60：码与进度条都按 60 秒周期", async ({ helper }) => {
    await helper.seedData([
      { ...sampleAccount("1", "TestApp", "alice", TEST_SECRET), period: 60 }
    ])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const expected = expectedOtp({
        secret: TEST_SECRET,
        step: 60,
        date: FIXED_TIME
      })
      const expectedWithStep30 = expectedOtp({
        secret: TEST_SECRET,
        step: 30,
        date: FIXED_TIME
      })
      expect(expected).not.toBe(expectedWithStep30)

      const card = cards(popup).first()
      await expect(currentOtpOf(card)).toHaveText(expected)
      await expect(nextOtpOf(card)).toHaveText(
        expectedNextOtp({ secret: TEST_SECRET, step: 60, date: FIXED_TIME })
      )

      // 进度条：max 与剩余秒数都得按 60 走（当前实现把 30 写死了）
      const progress = progressOf(card)
      await expect(progress).toHaveAttribute("max", "60")
      await expect(progress).toHaveAttribute(
        "value",
        String(expectedRemainingTime(FIXED_TIME, 60))
      )
    } finally {
      await popup.close()
    }
  })

  test("脏数据兜底：digits=999 / period=-5 回退默认，不渲染畸形码", async ({
    helper
  }) => {
    // 这些值过不了 parseOtpAuthUrl 的校验，但能通过「导入设置」等路径直接落库
    await helper.seedData([
      {
        ...sampleAccount("1", "TestApp", "alice", TEST_SECRET),
        digits: 999,
        period: -5
      }
    ])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      // digits=999 若不归一：10**999 为 Infinity，% 不生效 → 渲染出 999 个字符
      const expected = expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME })
      const card = cards(popup).first()
      const otpElement = currentOtpOf(card)
      await expect(otpElement).toHaveText(expected)
      // 防 digits=999 渲染多字符：归一前会渲出 999 字符的「码」
      expect(await otpElement.textContent()).toHaveLength(6)

      // period=-5 若不归一：counter 变负数 → 垃圾码；progress max 也会是负数
      const progress = progressOf(card)
      await expect(progress).toHaveAttribute("max", "30")
      await expect(progress).toHaveAttribute(
        "value",
        String(expectedRemainingTime(FIXED_TIME, 30))
      )
    } finally {
      await popup.close()
    }
  })

  test("Case 32 (P1): fake time 推进后 progress.value 递减（每秒刷新）", async ({
    helper
  }) => {
    // setFixedTime 不会自动推进 fake clock；要触发 useOtpTick 的 setInterval
    // 必须 fastForward。否则 progress.value 永远是固定值。
    await helper.seedData([sampleAccount("1", "TestApp", "alice", TEST_SECRET)])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const progress = progressOf(cards(popup).first())
      const value1 = parseInt((await progress.getAttribute("value")) ?? "0")

      await popup.clock.fastForward(1000)
      await expect(progress).toHaveAttribute("value", String(value1 - 1), {
        timeout: 5_000
      })

      await popup.clock.fastForward(2000)
      await expect(progress).toHaveAttribute("value", String(value1 - 3), {
        timeout: 5_000
      })
    } finally {
      await popup.close()
    }
  })

  test("Case 33 (P1): 点击 OTP 复制 → 剪贴板含 OTP + toast 节点出现", async ({
    helper
  }) => {
    await helper.seedData([sampleAccount("1", "TestApp", "alice", TEST_SECRET)])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)

      const expected = expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME })
      await currentOtpOf(cards(popup).first()).click()

      // 剪贴板含完整 OTP
      const clip = (await popup.evaluate(() => navigator.clipboard.readText())).trim()
      expect(clip).toBe(expected)

      // toast 节点存在（toast.ts 加了 data-testid="toast" + kind 属性）
      // 不验颜色与文案——进 e2e 的是功能（toast 应该出现），不是样式。
      const toastNode = popup.locator('[data-testid="toast"]')
      await expect(toastNode).toBeVisible({ timeout: 5_000 })
      await expect(toastNode).toHaveAttribute("data-testid-toast-kind", "success")
    } finally {
      await popup.close()
    }
  })

  test("Case 35a (P1): 剩余 >10s → 蓝色 progress-primary", async ({
    helper
  }) => {
    // FIXED_TIME 剩余 23s（>10）→ primary
    await helper.seedData([sampleAccount("1", "TestApp", "alice", TEST_SECRET)])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)
      const progress = progressOf(cards(popup).first())
      await expect(progress).toHaveClass(/progress-primary/)
      await expect(progress).not.toHaveClass(/progress-warning/)
      await expect(progress).not.toHaveClass(/progress-error/)
    } finally {
      await popup.close()
    }
  })

  test("Case 35b (P1): 剩余 ≤10s 且 >3s → 黄色 progress-warning", async ({
    helper
  }) => {
    // FIXED_TIME - 15s → epoch%30=22 → remaining=8 → warning（4 ≤ 8 ≤ 10）
    const warnTime = new Date(FIXED_TIME.getTime() - 15_000)
    await helper.seedData([sampleAccount("1", "TestApp", "alice", TEST_SECRET)])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, warnTime)
      const progress = progressOf(cards(popup).first())
      await expect(progress).toHaveClass(/progress-warning/)
      await expect(progress).not.toHaveClass(/progress-primary/)
      await expect(progress).not.toHaveClass(/progress-error/)
    } finally {
      await popup.close()
    }
  })

  test("Case 35c (P1): 剩余 ≤3s → 红色 progress-error", async ({ helper }) => {
    // FIXED_TIME + 21s → epoch%30=28 → remaining=2 → error（≤3）
    const dangerTime = new Date(FIXED_TIME.getTime() + 21_000)
    await helper.seedData([sampleAccount("1", "TestApp", "alice", TEST_SECRET)])
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, dangerTime)
      const progress = progressOf(cards(popup).first())
      await expect(progress).toHaveClass(/progress-error/)
      await expect(progress).not.toHaveClass(/progress-primary/)
      await expect(progress).not.toHaveClass(/progress-warning/)
    } finally {
      await popup.close()
    }
  })
})
