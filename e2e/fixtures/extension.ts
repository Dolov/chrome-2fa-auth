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
 *
 * 设计：
 * - sharedContext: worker scope，单例 BrowserContext（启动开销大）
 * - helper: 每个 test 自动清空 + 注入 seed 数据（保证 idempotent）
 * - popup: 依赖 helper，确保 storage 清空后才打开 popup
 */
import { test as base, chromium, type BrowserContext, type Page } from "@playwright/test"

const EXT_PATH = process.env.EXT_PATH ?? "build/chrome-mv3-prod"

/**
 * 简化的 DataProps shape（不 import 项目 utils/constant）
 * 字段与项目一致，仅用于 fixture 测试数据 seed
 */
export type DataProps = {
  id: string
  type: "totp" | "hotp"
  secret: string
  account: string
  issuer: string
  digits?: number
  period?: number
  algorithm?: "SHA1" | "SHA256" | "SHA512" | "MD5"
  pinned?: boolean
  remark?: string
  deleted?: boolean
  recoveryCodes?: Array<{ value: string; copied: boolean }>
}

export type Helpers = {
  seedData(data: DataProps[]): Promise<void>
  clearStorage(): Promise<void>
  getStorage(): Promise<Record<string, unknown>>
  gotoPopup(): Promise<Page>
}

export const test = base.extend<
  {
    extensionId: string
    popup: Page
    helper: Helpers
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
    let [serviceWorker] = context.serviceWorkers()
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker")
    }
    const id = serviceWorker.url().split("/")[2]
    await use(id)
  },

  helper: async ({ sharedContext: context, extensionId }, use) => {
    const getSw = () => {
      const [sw] = context.serviceWorkers()
      if (!sw) throw new Error("MV3 service worker not started")
      return sw
    }
    const h: Helpers = {
      seedData: async (data) => {
        // plasmo @plasmohq/storage 双重序列化：set 之前 JSON.stringify(value)，然后 chrome.storage.sync.set 又自动序列化
        // 所以 raw storage 里 data 字段是 JSON string，而不是 object
        const serialized = JSON.stringify(data)
        await getSw().evaluate(
          (s) => chrome.storage.sync.set({ data: s }),
          serialized
        )
      },
      clearStorage: async () => {
        const [sw] = context.serviceWorkers()
        if (sw) await sw.evaluate(() => chrome.storage.sync.clear())
      },
      getStorage: async () => {
        return await getSw().evaluate(() => chrome.storage.sync.get(null))
      },
      gotoPopup: async () => {
        const page = await context.newPage()
        await page.goto(`chrome-extension://${extensionId}/popup.html`)
        await page.waitForLoadState("domcontentloaded")
        return page
      }
    }
    await h.clearStorage()
    await use(h)
    await h.clearStorage()
  },

  popup: async ({ helper, sharedContext: _ctx }, use) => {
    const page = await helper.gotoPopup()
    await use(page)
    await page.close()
  }
})

export const expect = test.expect