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

const EXT_PATH = process.env.EXT_PATH ?? ".output/chrome-mv3"

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

/**
 * v1 存盘形态 — 预留位置。原本用于「v1 → v2」迁移回归，核实 v1.7 与 v3.0.0
 * 的 `DataProps` 形态完全一致（sync:data / copied / 字段集全部相同）后
 * 判定不需要迁移，相关 fixture 一并删除。
 */

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
        headless: process.env.PW_HEADLESS ? process.env.PW_HEADLESS === "true" : true,
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
    const id = serviceWorker.url().split("/")[2] ?? ""
    await use(id)
  },

  helper: async ({ sharedContext: context, extensionId }, use) => {
    const getSw = () => {
      const [sw] = context.serviceWorkers()
      if (!sw) throw new Error("MV3 service worker not started")
      return sw
    }

    // 收集 test 期间的 pageerror；use(h) 之后若非空就抛，让该 test 失败。
    // React 渲染期 unhandled rejection / throw 都从这里走出来 —— 验收
    // 「断言绿但页面报 unhandled 错误」这种最常见假阳性。
    const pageErrors: string[] = []
    const onPage = (page: Page) => {
      page.on("pageerror", (err) =>
        pageErrors.push(`pageerror: ${err.message}`)
      )
    }
    for (const page of context.pages()) onPage(page)
    context.on("page", onPage)

    const h: Helpers = {
      seedData: async (data) => {
        // WXT storage：data 存在 sync:data（features/otp-store/store.ts 的 dataStore）
        // 注意 StorageKey.DATA = "data" 小写
        await getSw().evaluate(
          (d) => chrome.storage.sync.set({ data: d }),
          data as unknown[]
        )
      },
      clearStorage: async () => {
        // 复用 getSw() 的「先取再等事件」路径：避免首测试启动时
        // serviceWorkers() 尚为空、storage 残留导致断言失败
        await getSw().evaluate(() => {
          chrome.storage.sync.clear()
          chrome.storage.local.clear()
        })
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
    context.off("page", onPage)
    if (pageErrors.length > 0) {
      throw new Error(
        `Unexpected page errors during test:\n  ${pageErrors.join("\n  ")}`
      )
    }
    await h.clearStorage()
  },

  popup: async ({ helper, sharedContext: _ctx }, use) => {
    const page = await helper.gotoPopup()
    await use(page)
    await page.close()
  }
})

export const expect = test.expect