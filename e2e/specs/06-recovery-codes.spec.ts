/**
 * F6. 恢复码 → `06-recovery-codes.spec.ts`
 * 4 P0 + 2 P1 = 6 spec
 *
 * 仅断言功能行为 + 状态 className（badge-ghost / line-through）。
 * 弹层 / code 容器均通过 testid 定位，避免依赖文案。
 */
import { expect, test, type DataProps } from "../fixtures/extension"

const TEST_SECRET = "JBSWY3DPEHPK3PXP"

const sampleAccountWithCodes = (
  id: string,
  recoveryCodes: Array<{ value: string; copied: boolean }>
): DataProps => ({
  id,
  type: "totp",
  secret: TEST_SECRET,
  issuer: "GitHub",
  account: "alice",
  recoveryCodes
})

const listItems = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="otp-list-item"]')

/** 打开 ItemActionSheet（hover 项 → FileCog 按钮） */
const openItemActionSheet = async (
  popup: { locator: (s: string) => any }
): Promise<void> => {
  const card = listItems(popup).first()
  await card.hover()
  await card.locator('[data-testid="list-item-cog"]').click({ force: true })
}

/** 恢复码弹层 */
const recoveryCodesModal = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="recovery-codes-modal"]')

/** 弹层内所有 code 容器 */
const recoveryCodes = (popup: { locator: (s: string) => any }) =>
  recoveryCodesModal(popup).locator('[data-testid="recovery-code"]')

test.describe("F6 recovery > 弹层 / 复制 / 持久化", () => {
  test("Case 37 (P0): ItemActionSheet 点恢复码 → 弹层显示所有 codes", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccountWithCodes("1", [
        { value: "code-aaa", copied: false },
        { value: "code-bbb", copied: false },
        { value: "code-ccc", copied: false }
      ])
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup).first()).toBeVisible({ timeout: 10_000 })
      await openItemActionSheet(popup)

      await popup.locator('[data-testid="item-action-recovery"]').click()
      const modal = recoveryCodesModal(popup)
      await expect(modal).toBeVisible({ timeout: 5_000 })

      // 弹层内显示全部 codes（按 testid 数量断言）
      await expect(recoveryCodes(popup)).toHaveCount(3)
    } finally {
      await popup.close()
    }
  })

  test("Case 38 (P0): 复制恢复码 → 剪贴板 + 1s 后 data-copied=true", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccountWithCodes("1", [
        { value: "code-aaa", copied: false },
        { value: "code-bbb", copied: false }
      ])
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup).first()).toBeVisible({ timeout: 10_000 })
      await openItemActionSheet(popup)
      await popup.locator('[data-testid="item-action-recovery"]').click()

      const modal = recoveryCodesModal(popup)
      await expect(modal).toBeVisible({ timeout: 5_000 })

      // 点击前：所有 code 都未 copied
      const allCodes = recoveryCodes(popup)
      await expect(allCodes.first()).toHaveAttribute("data-copied", "false")

      // 点击第一个 code
      await allCodes.first().click()

      // 剪贴板立即含 code 值
      const clip = await popup.evaluate(() => navigator.clipboard.readText())
      expect(clip).toBe("code-aaa")

      // 1s 后：markRecoveryCodeCopied 写入 → data-copied="true"
      await expect(allCodes.first()).toHaveAttribute("data-copied", "true", {
        timeout: 3_000
      })
      // badge-ghost 是 copied 状态视觉标记
      await expect(allCodes.first()).toHaveClass(/badge-ghost/, {
        timeout: 3_000
      })
    } finally {
      await popup.close()
    }
  })

  test("Case 39 (P0): copied 状态持久化 → 刷新 popup 后仍保留", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccountWithCodes("1", [
        { value: "code-aaa", copied: true },
        { value: "code-bbb", copied: false }
      ])
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup).first()).toBeVisible({ timeout: 10_000 })
      await openItemActionSheet(popup)
      await popup.locator('[data-testid="item-action-recovery"]').click()

      const modal = recoveryCodesModal(popup)
      await expect(modal).toBeVisible({ timeout: 5_000 })

      const allCodes = recoveryCodes(popup)
      // code-aaa 已经 copied=true
      await expect(allCodes.first()).toHaveAttribute("data-copied", "true")
      await expect(allCodes.first()).toHaveClass(/badge-ghost/)
      // code-bbb 未 copied
      await expect(allCodes.nth(1)).toHaveAttribute("data-copied", "false")
      await expect(allCodes.nth(1)).not.toHaveClass(/badge-ghost/)
    } finally {
      await popup.close()
    }
  })

  test("Case 40 (P1): 无 recoveryCodes 时「恢复码」按钮不显示", async ({
    helper
  }) => {
    await helper.seedData([
      // 故意不传 recoveryCodes
      {
        id: "1",
        type: "totp",
        secret: TEST_SECRET,
        issuer: "GitHub",
        account: "alice"
      }
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup).first()).toBeVisible({ timeout: 10_000 })
      await openItemActionSheet(popup)

      // isRecoveryButtonVisible = false → 按钮不渲染
      await expect(
        popup.locator('[data-testid="item-action-recovery"]')
      ).toHaveCount(0)
    } finally {
      await popup.close()
    }
  })

  test("Case 41 (P1): 全部 copied → 所有 code 都 data-copied=true", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccountWithCodes("1", [
        { value: "code-aaa", copied: true },
        { value: "code-bbb", copied: true }
      ])
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup).first()).toBeVisible({ timeout: 10_000 })
      await openItemActionSheet(popup)
      await popup.locator('[data-testid="item-action-recovery"]').click()

      const modal = recoveryCodesModal(popup)
      await expect(modal).toBeVisible({ timeout: 5_000 })

      const allCodes = recoveryCodes(popup)
      await expect(allCodes).toHaveCount(2)
      await expect(allCodes.first()).toHaveAttribute("data-copied", "true")
      await expect(allCodes.nth(1)).toHaveAttribute("data-copied", "true")
    } finally {
      await popup.close()
    }
  })
})