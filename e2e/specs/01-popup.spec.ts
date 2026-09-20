/**
 * F1. Popup 主界面加载与渲染 → `01-popup.spec.ts`
 * 3 P0 + 2 P1 = 5 spec
 *
 * 用 helper.gotoPopup() 自管理 page，spec 内部负责 close（避免 fixture page 残留污染）
 */
import { expect, test, type DataProps } from "../fixtures/extension"

const TEST_SECRET = "JBSWY3DPEHPK3PXP"

const sampleAccount = (
  id: string,
  issuer: string,
  account: string
): DataProps => ({
  id,
  type: "totp",
  secret: TEST_SECRET,
  issuer,
  account
})

test.describe("F1 popup > 主界面加载与渲染", () => {
  test("Case 1: 首次安装无数据 → 显示 no-data.svg", async ({ helper }) => {
    const popup = await helper.gotoPopup()
    try {
      // no-data.svg 是 base64 data URI
      await popup
        .locator('img[src^="data:image/svg+xml"]')
        .first()
        .waitFor({ timeout: 10_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 2: 已有账户 → 渲染 List 显示全部账户", async ({ helper }) => {
    await helper.seedData([
      sampleAccount("1", "TestApp1", "alice"),
      sampleAccount("2", "TestApp2", "bob")
    ])
    // debug: 检查 seed 是否成功
    const stored = await helper.getStorage()
    console.log("[debug] storage after seed:", JSON.stringify(stored))
    const popup = await helper.gotoPopup()
    try {
      // debug: 看 popup 内容
      const html = await popup.content()
      console.log("[debug] popup html length:", html.length, "contains TestApp1:", html.includes("TestApp1"))
      await popup.locator("text=TestApp1").first().waitFor({ timeout: 10_000 })
      await popup.locator("text=alice").first().waitFor({ timeout: 10_000 })
      await popup.locator("text=TestApp2").first().waitFor({ timeout: 10_000 })
      await popup.locator("text=bob").first().waitFor({ timeout: 10_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 3: 加载性能 <2s 出列表", async ({ helper }) => {
    await helper.seedData([sampleAccount("1", "TestApp", "alice")])
    const popup = await helper.gotoPopup()
    try {
      const start = Date.now()
      await popup.locator("text=TestApp").first().waitFor({ timeout: 10_000 })
      const dur = Date.now() - start
      expect(dur).toBeLessThan(2000)
    } finally {
      await popup.close()
    }
  })

  test("Case 4 (P1): dark 主题 → 背景为暗色", async ({ helper }) => {
    const ctx = helper // alias for ctx access
    void ctx
    const popup = await helper.gotoPopup()
    try {
      const workers = popup.context().serviceWorkers()
      if (workers.length > 0) {
        await workers[0].evaluate(() => {
          return chrome.storage.sync.set({
            settings: {
              theme: "dark",
              faviconType: "elegant",
              containerType: "default"
            }
          })
        })
      }
      await popup.reload()
      await popup.waitForLoadState("domcontentloaded")
      await popup
        .locator("html[data-theme='dark']")
        .first()
        .waitFor({ timeout: 10_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 5 (P1): PHONE 布局 → mockup-phone 容器", async ({ helper }) => {
    const popup = await helper.gotoPopup()
    try {
      const workers = popup.context().serviceWorkers()
      if (workers.length > 0) {
        await workers[0].evaluate(() => {
          return chrome.storage.sync.set({
            settings: {
              theme: "light",
              faviconType: "elegant",
              containerType: "phone"
            }
          })
        })
      }
      await popup.reload()
      await popup.waitForLoadState("domcontentloaded")
      await popup
        .locator(".mockup-phone")
        .first()
        .waitFor({ timeout: 10_000 })
    } finally {
      await popup.close()
    }
  })
})