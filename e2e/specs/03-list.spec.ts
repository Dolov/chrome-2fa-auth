/**
 * F3. List → `03-list.spec.ts`
 * 5 P0 + 3 P1 + 2 P2 = 10 spec
 *
 * 仅断言功能行为 + daisyUI 语义 className（状态分类，主题色切换不影响）。
 * 文案（"下一个" / issuer / account）不验——文案易调整，不进 e2e。
 */
import { expect, test, type DataProps } from "../fixtures/extension"

const TEST_SECRET = "JBSWY3DPEHPK3PXP"

const sampleAccount = (
  id: string,
  issuer: string,
  account: string,
  options: Partial<DataProps> = {}
): DataProps => ({
  id,
  type: "totp",
  secret: TEST_SECRET,
  issuer,
  account,
  ...options
})

const listItems = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="otp-list-item"]')

const menuTrigger = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="header-menu-trigger"]')

const dropdownMenu = (popup: { locator: (s: string) => any }) =>
  popup.locator("ul.menu.dropdown-content")

test.describe("F3 list > 空态 / 列表项 / 视觉分组", () => {
  test("Case 12 (P0): 空列表 → 显示 no-data.svg 脉冲动画", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      const noData = popup.locator('img[src*="no-data"]').first()
      await noData.waitFor({ timeout: 10_000 })
      // 脉冲动画：daisyUI animate-pulse（语义类，主题切换不影响 className）
      await expect(noData).toHaveClass(/animate-pulse/)
    } finally {
      await popup.close()
    }
  })

  test("Case 13 (P0): 列表项 → 含 OTP 当前 / 下一 / 操作按钮", async ({
    helper
  }) => {
    await helper.seedData([sampleAccount("1", "GitHub", "alice")])
    const popup = await helper.gotoPopup()
    try {
      const card = listItems(popup).first()
      await expect(card).toBeVisible({ timeout: 10_000 })
      // 当前 OTP + 下一 OTP 都是 data-testid 元素
      await expect(card.locator('[data-testid="otp-current"]')).toBeVisible()
      await expect(card.locator('[data-testid="otp-next"]')).toBeVisible()
      // FileCog 操作按钮：hover 时显示（testid 永远在 DOM）
      await expect(card.locator('[data-testid="list-item-cog"]')).toBeAttached()
    } finally {
      await popup.close()
    }
  })

  test("Case 13 Favicon (TODO): GitHub issuer → card 内渲染 Favicon svg", async ({
    helper
  }) => {
    // ListItem 内 FileCog button 永远存在一个 svg，Favicon 渲染会再加一个；
    // 数量差是「Favicon 真实渲染 svg（非 null）」的稳定信号。
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "UnknownApp", "bob")
    ])
    const popup = await helper.gotoPopup()
    try {
      const cards = listItems(popup)
      await expect(cards).toHaveCount(2, { timeout: 10_000 })

      const githubSvgCount = await cards.nth(0).locator("svg").count()
      const unknownSvgCount = await cards.nth(1).locator("svg").count()
      expect(githubSvgCount).toBeGreaterThan(unknownSvgCount)
    } finally {
      await popup.close()
    }
  })

  test("Case 14 (P0): hover 项 → FileCog 操作按钮从隐藏变可见", async ({
    helper
  }) => {
    await helper.seedData([sampleAccount("1", "GitHub", "alice")])
    const popup = await helper.gotoPopup()
    try {
      const card = listItems(popup).first()
      await expect(card).toBeVisible({ timeout: 10_000 })

      const cogButton = card.locator('[data-testid="list-item-cog"]')
      await expect(cogButton).toHaveClass(/opacity-0/)
      await expect(cogButton).toHaveClass(/group-hover:opacity-100/)

      // hover 整个卡片 → group-hover 触发 → opacity 变 1
      await card.hover()
      await expect(cogButton).toHaveCSS("opacity", "1", { timeout: 5_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 15 (P1): pinned 项 → 左侧 accent 条 + shadow", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice", { pinned: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      const card = listItems(popup).first()
      await expect(card).toBeVisible({ timeout: 10_000 })
      // 左侧 accent 条（语义类，主题切换不影响 className）
      await expect(card.locator(".bg-accent")).toBeVisible()
      await expect(card).toHaveClass(/shadow-lg/)
    } finally {
      await popup.close()
    }
  })

  test("Case 16 (P1): deleted 项 → 背景变为 base-300", async ({ helper }) => {
    await helper.seedData([
      sampleAccount("1", "OldApp", "bob", { deleted: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      const card = listItems(popup).first()
      await expect(card).toBeVisible({ timeout: 10_000 })
      // bg-base-300 是 deleted 状态语义类（主题切换不影响类名）
      await expect(card).toHaveClass(/bg-base-300/)
    } finally {
      await popup.close()
    }
  })

  test("Case 17 (P1): 已删除过滤 → 不显示 normal 项", async ({ helper }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "OldApp", "bob", { deleted: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(2, { timeout: 10_000 })

      await menuTrigger(popup).click()
      await dropdownMenu(popup).locator('[data-testid="header-menu-deleted"]').click()

      await expect(listItems(popup)).toHaveCount(1, { timeout: 5_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 18 (P2): normal 视角下 deletedCount=0 时，「已删除」入口隐藏", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      await menuTrigger(popup).click()
      const menu = dropdownMenu(popup)
      await expect(menu).toBeVisible({ timeout: 5_000 })
      await expect(menu.locator('[data-testid="header-menu-deleted"]')).toHaveCount(0)
      await expect(menu.locator('[data-testid="header-menu-settings"]')).toBeVisible()
    } finally {
      await popup.close()
    }
  })

  test("Case 18b (P2): normal 视角下 deletedCount>0 时，「已删除」入口出现", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "OldApp", "bob", { deleted: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      await menuTrigger(popup).click()
      const menu = dropdownMenu(popup)
      await expect(menu).toBeVisible({ timeout: 5_000 })
      await expect(menu.locator('[data-testid="header-menu-deleted"]')).toBeVisible()
    } finally {
      await popup.close()
    }
  })

  test("Case 19 (P2): deleted 视角下显示「全部」入口 + 「已删除」入口隐藏", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "OldApp", "bob", { deleted: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      await menuTrigger(popup).click()
      await dropdownMenu(popup).locator('[data-testid="header-menu-deleted"]').click()
      await expect(listItems(popup)).toHaveCount(1, { timeout: 5_000 })

      await menuTrigger(popup).click()
      const menu = dropdownMenu(popup)
      await expect(menu).toBeVisible({ timeout: 5_000 })
      await expect(menu.locator('[data-testid="header-menu-all"]')).toBeVisible()
      await expect(menu.locator('[data-testid="header-menu-deleted"]')).toHaveCount(0)
    } finally {
      await popup.close()
    }
  })
})