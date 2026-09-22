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
      // WXT 下 no-data.svg 是打包后的文件 URL（assets/no-data-*.svg）
      await popup
        .locator('img[src*="no-data"]')
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
    const popup = await helper.gotoPopup()
    try {
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
    const popup = await helper.gotoPopup()
    try {
      const workers = popup.context().serviceWorkers()
      if (workers.length > 0) {
        await workers[0]!.evaluate(() => {
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
      // React hydrate + useEffect 后才会 setAttribute(data-theme, ...)；
      // 等该属性出现，避免拿到上一次会话残留
      await popup.waitForFunction(
        () => document.documentElement.dataset.theme === "dark",
        undefined,
        { timeout: 10_000 }
      )
    } finally {
      await popup.close()
    }
  })

  test("Case 5 (P1): PHONE 布局 → mockup-phone 容器", async ({ helper }) => {
    const popup = await helper.gotoPopup()
    try {
      const workers = popup.context().serviceWorkers()
      if (workers.length > 0) {
        await workers[0]!.evaluate(() => {
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
      // 布局由 React 读 settings 渲染，domcontentloaded 后等元素出现
      await popup.locator(".mockup-phone").first().waitFor({ timeout: 10_000 })
    } finally {
      await popup.close()
    }
  })
})