/**
 * F7. 二维码扫描 → `07-qr-scan.spec.ts`
 *
 * 本次只覆盖**上传截图**这条路径（清单 45 / 46），因为 jsQR 的懒加载改造
 * 必须先在真实浏览器里证明「独立 chunk 能在运行时被加载并解码」。
 * 自动扫描（42-44）、粘贴（47）、手动截图（50-55）留到后续补全 F7。
 *
 * 三个 case 正好覆盖 `entrypoints/popup/components/upload-modal.tsx::processFile` 的三条分支：
 *   解码成功 + 是 otpauth   → preview 显示 OTP
 *   解码成功 + 非 otpauth   → 「无效的 OTP Auth URL」
 *   解码失败（无二维码）     → 「无法读取文件：未找到二维码」
 */
import { expect, test } from "../fixtures/extension"
import {
  NOT_OTPAUTH_QR_PATH,
  NO_QR_IMAGE_PATH,
  OTPAUTH_QR_PATH
} from "../fixtures/qr-fixtures"
import { TEST_SECRET, expectedOtp } from "../fixtures/test-secret"

/** 固定参考时刻，与 05-otp.spec.ts 同一约定：周期开始后 7 秒 */
const FIXED_TIME = new Date("2026-01-15T00:00:07.000Z")

/** 上传模态框（按标题定位，避免与其它 dialog 混淆） */
const uploadModalOf = (popup: { locator: (s: string) => any }) =>
  popup.locator('dialog.modal:has-text("上传二维码截图")')

/** 展开 FAB 后点「上传二维码截图」 */
const openUploadModal = async (popup: any) => {
  await popup.locator("button:has(svg.lucide-plus)").first().click()
  await popup.locator('[data-tip="上传二维码截图"] button').click()
  await expect(popup.locator('input[type="file"]')).toBeVisible()
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

      await popup.locator('input[type="file"]').setInputFiles(OTPAUTH_QR_PATH)

      const modal = uploadModalOf(popup)
      const previewOtp = modal.locator(".text-primary.font-bold")
      await expect(previewOtp).toBeVisible({ timeout: 10_000 })

      const expected = expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME })
      expect((await previewOtp.innerText()).trim()).toBe(expected)

      // 有 account（TestApp:testuser）→ 不应出现「输入账户名称」
      await expect(modal.getByPlaceholder("输入账户名称")).toHaveCount(0)
      // 进度条随 preview 一起渲染
      await expect(modal.locator("progress")).toBeVisible()
    } finally {
      await popup.close()
    }
  })

  test("Case 46a (P0): 上传含非 otpauth 二维码的图 → 提示「无效的 OTP Auth URL」", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      await openUploadModal(popup)
      await popup.locator('input[type="file"]').setInputFiles(NOT_OTPAUTH_QR_PATH)

      const alert = uploadModalOf(popup).locator('[role="alert"]')
      await expect(alert).toBeVisible({ timeout: 10_000 })
      await expect(alert).toContainText("无效的 OTP Auth URL")
      // 关键：证明 jsQR 确实跑起来了（能解码出内容，只是内容不是 otpauth）
      await expect(alert).not.toContainText("无法读取文件")
    } finally {
      await popup.close()
    }
  })

  test("Case 46b (P0): 上传不含二维码的图 → 提示读取失败（未找到二维码）", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      await openUploadModal(popup)
      await popup.locator('input[type="file"]').setInputFiles(NO_QR_IMAGE_PATH)

      const alert = uploadModalOf(popup).locator('[role="alert"]')
      await expect(alert).toBeVisible({ timeout: 10_000 })
      await expect(alert).toContainText("无法读取文件")
      await expect(alert).toContainText("未找到二维码")
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

      await popup.locator('input[type="file"]').setInputFiles(OTPAUTH_QR_PATH)
      await expect(uploadModalOf(popup).locator("progress")).toBeVisible({
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
