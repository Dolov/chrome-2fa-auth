/**
 * 黑盒扩展 fixture
 *
 * 基于 Playwright 官方 chrome-extensions 文档：
 * https://playwright.dev/docs/chrome-extensions
 *
 * 关键事实（来自官方文档）：
 * - Extensions only work with chromium channel（系统 Chrome/Edge 移除了 --load-extension flag）
 * - MV3 SW 是 event-driven，必须用 waitForEvent('serviceworker') 等事件触发
 * - Popup 可直接 page.goto('chrome-extension://<id>/popup.html')
 */
import { test as base, chromium, type BrowserContext, type Page } from "@playwright/test"

const EXT_PATH = process.env.EXT_PATH ?? "build/chrome-mv3-prod"

export const test = base.extend<
  {
    extensionId: string
    popup: Page
  },
  {
    sharedContext: BrowserContext
  }
>({
  sharedContext: [
    async ({}, use) => {
      const ctx = await chromium.launchPersistentContext("", {
        channel: "chromium",
        headless: false,
        args: [
          `--disable-extensions-except=${EXT_PATH}`,
          `--load-extension=${EXT_PATH}`,
          "--no-sandbox"
        ],
        permissions: ["clipboard-read", "clipboard-write"]
      })
      await use(ctx)
      await ctx.close()
    },
    { scope: "worker" }
  ],

  extensionId: async ({ sharedContext: context }, use) => {
    // 官方模式：等 SW 事件触发（实际跑时会触发，e.g. SW 顶层 chrome.contextMenus.create 立即注册）
    let [serviceWorker] = context.serviceWorkers()
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker")
    }
    const id = serviceWorker.url().split("/")[2]
    await use(id)
  },

  popup: async ({ sharedContext: context, extensionId }, use) => {
    const page = await context.newPage()
    // 官方推荐：直接 page.goto
    await page.goto(`chrome-extension://${extensionId}/popup.html`)
    await use(page)
  }
})

export const expect = test.expect