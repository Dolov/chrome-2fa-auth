/**
 * Hello Popup — 验证基建（扩展加载 + popup 打开 + storage 清空）
 * 不依赖任何项目代码
 */
import { expect, test } from "../fixtures/extension"

test.describe("hello-popup > smoke", () => {
  test("扩展加载 + popup 可访问", async ({ extensionId, popup }) => {
    expect(extensionId).toMatch(/^[a-p]{32}$/)
    await expect(popup).toHaveURL(
      new RegExp(`chrome-extension://${extensionId}/popup\\.html`)
    )
    await expect(popup.locator("body")).toBeAttached()
  })

  test("popup 包含 2FA Auth 标题", async ({ popup }) => {
    await popup.locator("text=2FA Auth").first().waitFor({ timeout: 15_000 })
  })

  test("每个 test 隔离：chrome.storage 默认空", async ({ helper }) => {
    const data = await helper.getStorage()
    expect(Object.keys(data)).toHaveLength(0)
  })
})