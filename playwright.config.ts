import { defineConfig, devices } from "@playwright/test"

/**
 * 黑盒 E2E 配置
 * - 不依赖任何项目内部代码
 * - 通过加载 unpacked 扩展 + 模拟用户操作验证
 * - Plasmo 构建产物路径：build/chrome-mv3-prod
 *   （迁移到 WXT 后改为 .output/chrome-mv3）
 *
 * 设计要点：
 * - globalSetup: 跑一次 build + patch，避免每个 worker 重复
 * - workers=1: 单 worker 复用 BrowserContext（worker-scope fixture）
 * - channel 默认系统 Chrome（跳过 chromium 下载），CI 切 chromium
 */
export default defineConfig({
  testDir: "./e2e/specs",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    actionTimeout: 5_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 400, height: 700 }
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 无头运行：以后再跑自动化统一使用 headless
        launchOptions: { headless: true }
      }
    }
  ]
})