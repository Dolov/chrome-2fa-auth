/**
 * F2. Header → `02-header.spec.ts`
 * 4 P0 + 2 P1 = 6 spec
 *
 * 仅断言功能行为：dropdown 开关、filter 切换、搜索过滤、新 tab 打开。
 * 文案（"已删除" / "全部" / "设置" 等）不验——文案易调整，不进 e2e。
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

/** Header 菜单触发器（汉堡键） */
const menuTrigger = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="header-menu-trigger"]')

/** Header 搜索 / X 切换按钮 */
const searchToggle = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="header-search-toggle"]')

/** Header 搜索输入框 */
const searchInput = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="header-search-input"]')

/** dropdown 展开后的菜单容器 */
const dropdownMenu = (popup: { locator: (s: string) => any }) =>
  popup.locator("ul.menu.dropdown-content")

/** 列表项（ListItem 上声明的 data-testid） */
const listItems = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="otp-list-item"]')

test.describe("F2 header > 菜单 / 搜索 / 过滤", () => {
  test("Case 6 (P0): 菜单展开 → 列出当前视角下的过滤项 + 设置入口", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "OldApp", "bob", { deleted: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(2, { timeout: 10_000 })

      await menuTrigger(popup).click()
      const menu = dropdownMenu(popup)
      await expect(menu).toBeVisible({ timeout: 5_000 })

      // filter=normal + deletedCount>0：菜单项 testid 存在即可
      await expect(menu.locator('[data-testid="header-menu-deleted"]')).toBeVisible()
      await expect(menu.locator('[data-testid="header-menu-settings"]')).toBeVisible()
      // 「全部」入口只在 filter=deleted 时出现
      await expect(menu.locator('[data-testid="header-menu-all"]')).toHaveCount(0)
    } finally {
      await popup.close()
    }
  })

  test("Case 7 (P0): 搜索 issuer 子串 → List 实时过滤", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "NPM", "bob"),
      sampleAccount("3", "GitLab", "carol")
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(3, { timeout: 10_000 })

      await searchToggle(popup).click()
      await searchInput(popup).waitFor({ timeout: 5_000 })
      await searchInput(popup).fill("git")

      // 列表项实时过滤：「git」匹配 GitHub / GitLab，NPM 被过滤
      await expect(listItems(popup)).toHaveCount(2, { timeout: 5_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 8 (P0): 清空搜索 → List 恢复全部", async ({ helper }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "NPM", "bob")
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(2, { timeout: 10_000 })

      // 搜索后只剩 1 项
      await searchToggle(popup).click()
      await searchInput(popup).fill("git")
      await expect(listItems(popup)).toHaveCount(1, { timeout: 5_000 })

      // 退出搜索：toggle 按钮 → 同时清空 keyword
      await searchToggle(popup).click()
      await expect(listItems(popup)).toHaveCount(2, { timeout: 5_000 })
      await expect(searchInput(popup)).toHaveCount(0)
    } finally {
      await popup.close()
    }
  })

  test("Case 9 (P1): 菜单 → 设置 → 新 tab 打开 settings.html", async ({
    helper,
    sharedContext: context
  }) => {
    const popup = await helper.gotoPopup()
    try {
      const settingsPagePromise = context.waitForEvent("page", { timeout: 10_000 })

      await menuTrigger(popup).click()
      await dropdownMenu(popup).waitFor({ timeout: 5_000 })
      await dropdownMenu(popup).locator('[data-testid="header-menu-settings"]').click()

      const settingsPage = await settingsPagePromise
      await expect(settingsPage).toHaveURL(/\/settings\.html$/)
    } finally {
      await popup.close()
    }
  })

  test("Case 10 (P1): 过滤 → 已删除 → List 只显示 deleted 项", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "OldApp", "bob", { deleted: true }),
      sampleAccount("3", "OldApp2", "carol", { deleted: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(3, { timeout: 10_000 })

      // filter=normal → 点「已删除」入口
      await menuTrigger(popup).click()
      await dropdownMenu(popup).locator('[data-testid="header-menu-deleted"]').click()

      // 列表切到「已删除」：只剩 2 项
      await expect(listItems(popup)).toHaveCount(2, { timeout: 5_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 11 (P1): 切回「全部」 → 切回 normal 过滤", async ({ helper }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "OldApp", "bob", { deleted: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(2, { timeout: 10_000 })

      // 先切到「已删除」
      await menuTrigger(popup).click()
      await dropdownMenu(popup).locator('[data-testid="header-menu-deleted"]').click()
      await expect(listItems(popup)).toHaveCount(1, { timeout: 5_000 })

      // 再点「全部」→ 切回 normal
      await menuTrigger(popup).click()
      await dropdownMenu(popup).locator('[data-testid="header-menu-all"]').click()
      await expect(listItems(popup)).toHaveCount(1, { timeout: 5_000 })
    } finally {
      await popup.close()
    }
  })
})