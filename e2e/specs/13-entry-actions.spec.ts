/**
 * F13. FAB 入口操作 → `13-entry-actions.spec.ts`
 * 2 P0 + 1 P1 = 3 spec
 *
 * 覆盖 EntryActions（右下角 FAB）的两条纯 UI 状态机行为，均只断言功能状态：
 *   1. 空账列表 → popup 打开后自动展开操作项（空态引导）
 *   2. 点击 FAB 外部空白 → 收起
 *   3. 有普通账户 → 不自动展开（避免老用户开 popup 就弹菜单）
 *
 * 展开 / 收起以操作项容器的**透明度**为信号：它是真实的显示机制，
 * 不含任何色值 / 文案依赖（符合 SPECS §2 断言策略）。
 */
import { expect, test, type DataProps } from "../fixtures/extension"

const sampleAccount = (
  id: string,
  issuer: string,
  account: string
): DataProps => ({
  id,
  type: "totp",
  secret: "JBSWY3DPEHPK3PXP",
  issuer,
  account
})

/** 展开后才会亮起的操作项容器（含输入 / 扫描 / 截图 / 上传四个按钮） */
const fabActions = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="fab-actions"]')

test.describe("F13 entry-actions > 空态自动展开 / 点击空白收起", () => {
  test("Case 1 (P0): 首次安装无数据 → 打开 popup 自动展开 FAB 操作项", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      // 前提：存储确实为空（若上一条用例的种子数据残留，则本用例不成立）
      await expect(
        popup.locator('[data-testid="otp-list-item"]')
      ).toHaveCount(0, { timeout: 10_000 })
      // 初始为收起（opacity-0）；列表加载完成后空态应自动展开到 opacity-1
      await expect(fabActions(popup)).toHaveCSS("opacity", "1", {
        timeout: 10_000
      })
    } finally {
      await popup.close()
    }
  })

  test("Case 2 (P0): 点击 FAB 外部空白 → 收起", async ({ helper }) => {
    const popup = await helper.gotoPopup()
    try {
      await expect(fabActions(popup)).toHaveCSS("opacity", "1", {
        timeout: 10_000
      })

      // 左下角空白（远离右下角 FAB 容器）
      await popup.mouse.click(10, 600)
      await expect(fabActions(popup)).toHaveCSS("opacity", "0")
    } finally {
      await popup.close()
    }
  })

  test("Case 3 (P1): 已有普通账户 → 不自动展开", async ({ helper }) => {
    await helper.seedData([sampleAccount("1", "GitHub", "alice")])
    const popup = await helper.gotoPopup()
    try {
      await expect(
        popup.locator('[data-testid="otp-list-item"]')
      ).toHaveCount(1, { timeout: 10_000 })
      await expect(fabActions(popup)).toHaveCSS("opacity", "0")
    } finally {
      await popup.close()
    }
  })
})
