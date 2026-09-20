/**
 * Hello Popup — 验证基建（扩展加载 + popup 打开 + storage 清空）
 * 不依赖任何项目代码
 */
import { expect, test } from "../fixtures/extension"

test.describe("hello-popup > smoke", () => {
  test("扩展加载 + popup 可访问", async ({ extensionId, popup }) => {
    expect(extensionId).toMatch(/^[a-p]{32}$/)
    await expect(popup).toHaveURL(new RegExp(`chrome-extension://${extensionId}/popup\\.html`))
    const body = popup.locator("body")
    await expect(body).toBeAttached()
  })

  test("popup 包含 2FA Auth 标题", async ({ popup }) => {
    await popup.locator("text=2FA Auth").first().waitFor({ timeout: 15_000 })
  })

  test("每个 test 隔离：chrome.storage 默认空", async ({ sharedContext }) => {
    // 通过任意 page 触发 SW 启动，然后 evaluate
    const probe = await sharedContext.newPage()
    await probe.close()
    const sw = sharedContext.serviceWorkers()[0]
    if (sw) {
        const data = await sw.evaluate(async () => {
          const v = await chrome.storage.local.get(null)
          return v
        })
        // 默认空（每个 test 隔离由 auto fixture 保证）
        expect(Object.keys(data)).toHaveLength(0)
      }
  })
})