/**
 * F7. 二维码扫描 → `07-qr-scan.spec.ts`
 *
 * 本次只覆盖**上传截图**这条路径（清单 45 / 46），因为 jsQR 的懒加载改造
 * 必须先在真实浏览器里证明「独立 chunk 能在运行时被加载并解码」。
 * 自动扫描（42-44）、粘贴（47）、手动截图（50-55）留到后续补全 F7。
 *
 * 三个 case 正好覆盖 `entrypoints/popup/components/upload-modal.tsx::processFile` 的三条分支：
 *   解码成功 + 是 otpauth   → preview 显示 OTP
 *   解码成功 + 非 otpauth   → data-upload-error="invalid-otpauth"
 *   解码失败（无二维码）     → data-upload-error="file-read"
 *
 * 断言只依赖 data-testid / data-* 与数值，不依赖任何 UI 文案或颜色——
 * 文案与配色会随 i18n / 主题调整变化，不作为 e2e 断言依据。
 */
import { expect, test } from "../fixtures/extension"
import type { Page } from "@playwright/test"
import {
  NOT_OTPAUTH_QR_PATH,
  NO_QR_IMAGE_PATH,
  OTPAUTH_QR_PATH
} from "../fixtures/qr-fixtures"
import {
  FIXED_TIME,
  TEST_SECRET,
  expectedOtp
} from "../fixtures/test-secret"

/** 上传模态框（按 data-testid 定位，避免与其它 dialog 混淆） */
const uploadModalOf = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="upload-modal"]')

const fileInputOf = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="upload-file-input"]')

const uploadErrorOf = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="upload-error"]')

/** 展开 FAB 后点「上传二维码截图」 */
const openUploadModal = async (popup: any) => {
  await popup.locator('[data-testid="fab-main"]').click()
  await popup.locator('[data-testid="fab-qr-upload"]').click()
  await expect(fileInputOf(popup)).toBeVisible()
}

/** 固定 popup 时钟并重载，保证 OtpText 首次渲染就用固定时间 */
const pinTime = async (popup: any, time: Date) => {
  await popup.clock.setFixedTime(time)
  await popup.reload()
  await popup.waitForLoadState("domcontentloaded")
}

test.describe("F7 qr > 上传二维码截图", () => {
  test("Case 45 (P0): 上传有效 QR → 预览 OTP，且数值与独立 otplib 一致", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      await pinTime(popup, FIXED_TIME)
      await openUploadModal(popup)

      await fileInputOf(popup).setInputFiles(OTPAUTH_QR_PATH)

      const modal = uploadModalOf(popup)
      const previewOtp = modal.locator('[data-testid="otp-current"]')
      await expect(previewOtp).toBeVisible({ timeout: 10_000 })

      const expected = expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME })
      expect((await previewOtp.innerText()).replace(/\s/g, "")).toBe(expected)

      // 有 account（TestApp:testuser）→ 不应出现补账号输入框
      await expect(
        modal.locator('[data-testid="upload-account-input"]')
      ).toHaveCount(0)
      // 进度条随 preview 一起渲染
      await expect(modal.locator("progress")).toBeVisible()
    } finally {
      await popup.close()
    }
  })

  test("Case 46a (P0): 上传含非 otpauth 二维码的图 → 解码成功但格式不符", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      await openUploadModal(popup)
      await fileInputOf(popup).setInputFiles(NOT_OTPAUTH_QR_PATH)

      const alert = uploadErrorOf(popup)
      await expect(alert).toBeVisible({ timeout: 10_000 })
      // 关键：证明 jsQR 确实跑起来了（能解码出内容，只是内容不是 otpauth）
      await expect(alert).toHaveAttribute("data-upload-error", "invalid-otpauth")
    } finally {
      await popup.close()
    }
  })

  test("Case 46b (P0): 上传不含二维码的图 → 读取失败（未找到二维码）", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      await openUploadModal(popup)
      await fileInputOf(popup).setInputFiles(NO_QR_IMAGE_PATH)

      const alert = uploadErrorOf(popup)
      await expect(alert).toBeVisible({ timeout: 10_000 })
      await expect(alert).toHaveAttribute("data-upload-error", "file-read")
    } finally {
      await popup.close()
    }
  })

  test("jsQR 确实按需加载：打开模态框不请求，触发解码才请求", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    const jsQrRequests: string[] = []
    popup.on("request", (request) => {
      if (/jsqr/i.test(request.url())) jsQrRequests.push(request.url())
    })
    try {
      await openUploadModal(popup)
      // 打开模态框还不够触发解码：此时不应已经下载 jsQR chunk
      expect(jsQrRequests).toHaveLength(0)

      await fileInputOf(popup).setInputFiles(OTPAUTH_QR_PATH)
      await expect(
        uploadModalOf(popup).locator('[data-testid="upload-preview"]')
      ).toBeVisible({
        timeout: 10_000
      })

      // 解码发生时才拉取 jsQR；一旦它被内联回主包，这条会失败
      expect(jsQrRequests.length).toBeGreaterThan(0)
      expect(jsQrRequests[0]).toMatch(/jsqr/i)
    } finally {
      await popup.close()
    }
  })
})

/** 「自动扫描 / 手动截图」按钮：disabled 状态挂在内部 <button> 上 */
const autoScanButton = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="fab-qr-auto"] button')

const manualScanButton = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="fab-qr-manual"] button')

/**
 * 让「另一个 tab」成为当前 active tab，再重载 popup，触发
 * `canInjectContentScript()` 用真实 active tab 重新探测（popup 自身是
 * chrome-extension:// 页，新 page 打开后即获得焦点）。
 */
const reloadWithActiveTab = async (
  popup: Page,
  activeTabUrl: string
): Promise<Page> => {
  const activeTab = await popup.context().newPage()
  await activeTab.route(activeTabUrl, (route) =>
    route.fulfill({ contentType: "text/html", body: "<h1>mock</h1>" })
  )
  await activeTab.goto(activeTabUrl)
  await popup.reload()
  await popup.waitForLoadState("domcontentloaded")
  return activeTab
}

test.describe("F7 qr > 可注入性门控（自动扫描 / 手动截图）", () => {
  test("Case 54a (P2): 受限页面 → 两个按钮 disabled", async ({ helper }) => {
    const popup = await helper.gotoPopup()
    let restricted: Page | undefined
    try {
      restricted = await popup.context().newPage()
      await restricted.goto("chrome://version/")
      await popup.reload()
      await popup.waitForLoadState("domcontentloaded")

      await expect(autoScanButton(popup)).toBeDisabled({ timeout: 10_000 })
      await expect(manualScanButton(popup)).toBeDisabled()
      // 不依赖注入的两个入口不受影响
      await expect(
        popup.locator('[data-testid="fab-qr-upload"] button')
      ).toBeEnabled()
      await expect(popup.locator('[data-testid="fab-form"] button')).toBeEnabled()
    } finally {
      await restricted?.close()
      await popup.close()
    }
  })

  test("Case 54b (P2): 可注入页面 → 两个按钮 enabled", async ({ helper }) => {
    const popup = await helper.gotoPopup()
    let activeTab: Page | undefined
    try {
      activeTab = await reloadWithActiveTab(popup, "https://injectable.test/")

      await expect(autoScanButton(popup)).toBeEnabled({ timeout: 10_000 })
      await expect(manualScanButton(popup)).toBeEnabled()
    } finally {
      await activeTab?.close()
      await popup.close()
    }
  })
})