/**
 * F4. 账户 CRUD → `04-account-crud.spec.ts`
 * 7 P0 + 4 P1 = 11 spec
 *
 * 仅断言功能行为：表单提交 / 必填校验 / 编辑 / 软删 / 恢复 / 硬删 /
 * 置顶 / 取消置顶 / QR 弹层 / QR 复制 / QR 下载。
 *
 * 文案（"确定删除？" / "删除后不可恢复" / placeholder 等）不验——
 * 软删 / 硬删的功能区别由「切到 deleted 视角能否看到」验证。
 */
import { expect, test, type DataProps } from "../fixtures/extension"

const TEST_SECRET = "JBSWY3DPEHPK3PXP"

const sampleAccount = (
  id: string,
  issuer: string,
  account: string,
  options: Partial<DataProps> = {}
): DataProps => ({
  id,
  type: "totp",
  secret: TEST_SECRET,
  issuer,
  account,
  ...options
})

const listItems = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="otp-list-item"]')

const menuTrigger = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="header-menu-trigger"]')

const dropdownMenu = (popup: { locator: (s: string) => any }) =>
  popup.locator("ul.menu.dropdown-content")

/** 展开 FAB 后点指定 testid 的按钮 */
const clickFab = async (
  popup: { locator: (s: string) => any },
  testId: string
): Promise<void> => {
  await popup.locator('[data-testid="fab-main"]').click()
  await popup.locator(`[data-testid="${testId}"]`).click()
}

/** OtpForm 字段 */
const formIssuer = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="form-issuer"]')

const formSecret = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="form-secret"]')

const formAccount = (popup: { locator: (s: string) => any }) =>
  popup.locator('[data-testid="form-account"]')

/** Modal OK 按钮：只取当前打开（[open]）的 dialog，避免匹配到隐藏的弹层 */
const modalOkButton = (popup: { locator: (s: string) => any }) =>
  popup.locator('dialog.modal[open] [data-testid="modal-confirm"]')

/** 打开 ItemActionSheet（hover 项 → FileCog 按钮） */
const openItemActionSheet = async (
  popup: { locator: (s: string) => any }
): Promise<void> => {
  const card = listItems(popup).first()
  await card.hover()
  await card.locator('[data-testid="list-item-cog"]').click({ force: true })
}

const fillForm = async (
  popup: { locator: (s: string) => any },
  issuer: string,
  secret: string,
  account: string
): Promise<void> => {
  await formIssuer(popup).fill(issuer)
  await formSecret(popup).fill(secret)
  await formAccount(popup).fill(account)
}

test.describe("F4 crud > 表单 / 置顶 / 删除 / QR 弹层", () => {
  test("Case 20 (P0): 手动输入 → 填齐三个字段后 List 增加一项", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(0, { timeout: 10_000 })

      await clickFab(popup, "fab-form")
      await expect(formIssuer(popup)).toBeVisible({ timeout: 5_000 })
      await fillForm(popup, "GitHub", "JBSWY3DPEHPK3PXP", "alice")

      await modalOkButton(popup).click()
      await expect(formIssuer(popup)).toHaveCount(0, { timeout: 5_000 })
      await expect(listItems(popup)).toHaveCount(1, { timeout: 10_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 21 (P0): 必填校验 → 缺字段点 OK 后 List 不增加条目", async ({
    helper
  }) => {
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(0, { timeout: 10_000 })

      await clickFab(popup, "fab-form")
      await expect(formIssuer(popup)).toBeVisible({ timeout: 5_000 })

      // 只填 issuer
      await formIssuer(popup).fill("GitHub")
      await modalOkButton(popup).click()
      await expect(formIssuer(popup)).toBeVisible()
      await expect(listItems(popup)).toHaveCount(0)

      // 再补 secret 但缺 account
      await formSecret(popup).fill("JBSWY3DPEHPK3PXP")
      await modalOkButton(popup).click()
      await expect(formIssuer(popup)).toBeVisible()
      await expect(listItems(popup)).toHaveCount(0)

      // 补齐 account → 提交成功
      await formAccount(popup).fill("alice")
      await modalOkButton(popup).click()
      await expect(listItems(popup)).toHaveCount(1, { timeout: 10_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 22 (P0): 编辑 → 改字段保存后 List 内容更新", async ({
    helper
  }) => {
    await helper.seedData([sampleAccount("1", "OldName", "olduser")])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(1, { timeout: 10_000 })
      await openItemActionSheet(popup)

      await popup.locator('[data-testid="item-action-edit"]').click()
      await expect(formIssuer(popup)).toBeVisible({ timeout: 5_000 })
      await expect(formIssuer(popup)).toHaveValue("OldName")

      await formIssuer(popup).fill("NewName")
      await modalOkButton(popup).click()

      // 数据持久化：reload 后 issuer 仍是 NewName
      const storage = await helper.getStorage()
      const data = (storage.data as DataProps[] | undefined) ?? []
      expect(data[0]?.issuer).toBe("NewName")
    } finally {
      await popup.close()
    }
  })

  test("Case 23 (P0): 软删 → deleted=true 切到「已删除」能看到", async ({
    helper
  }) => {
    await helper.seedData([sampleAccount("1", "GitHub", "alice")])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(1, { timeout: 10_000 })
      await openItemActionSheet(popup)

      await popup.locator('[data-testid="item-action-delete"]').click()
      // DeleteModal data-confirm-kind="soft"
      await expect(
        popup.locator('[data-testid="delete-modal"][data-confirm-kind="soft"]')
      ).toBeVisible({ timeout: 5_000 })
      await modalOkButton(popup).click()

      // 默认 filter=normal：List 已空
      await expect(listItems(popup)).toHaveCount(0, { timeout: 5_000 })

      // 切到「已删除」：又能看到
      await menuTrigger(popup).click()
      await dropdownMenu(popup).locator('[data-testid="header-menu-deleted"]').click()
      await expect(listItems(popup)).toHaveCount(1, { timeout: 5_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 24 (P0): 恢复 → 从已删除恢复后切回 normal 能看到", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice", { deleted: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(0, { timeout: 10_000 })

      // 切到「已删除」视角
      await menuTrigger(popup).click()
      await dropdownMenu(popup).locator('[data-testid="header-menu-deleted"]').click()
      await expect(listItems(popup)).toHaveCount(1, { timeout: 5_000 })

      // ItemActionSheet → 恢复
      await openItemActionSheet(popup)
      await popup.locator('[data-testid="item-action-restore"]').click()

      // 切回 normal：又能看到
      await menuTrigger(popup).click()
      await dropdownMenu(popup).locator('[data-testid="header-menu-all"]').click()
      await expect(listItems(popup)).toHaveCount(1, { timeout: 5_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 25 (P0): 硬删 → 已删除项再次删除后数据消失", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "OldApp", "bob", { deleted: true })
    ])
    const popup = await helper.gotoPopup()
    try {
      await menuTrigger(popup).click()
      await dropdownMenu(popup).locator('[data-testid="header-menu-deleted"]').click()
      await expect(listItems(popup)).toHaveCount(1, { timeout: 5_000 })

      await openItemActionSheet(popup)
      await popup.locator('[data-testid="item-action-delete"]').click()
      // hard delete：data-confirm-kind="hard"
      await expect(
        popup.locator('[data-testid="delete-modal"][data-confirm-kind="hard"]')
      ).toBeVisible({ timeout: 5_000 })
      await modalOkButton(popup).click()

      // List 已空 + 持久化层不再有该条
      await expect(listItems(popup)).toHaveCount(0, { timeout: 5_000 })
      const storage = await helper.getStorage()
      const data = (storage.data as DataProps[] | undefined) ?? []
      expect(data).toHaveLength(0)
    } finally {
      await popup.close()
    }
  })

  test("Case 26 (P1): 置顶 → 排在最前 + accent 条 + shadow", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice"),
      sampleAccount("2", "NPM", "bob"),
      sampleAccount("3", "GitLab", "carol")
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(3, { timeout: 10_000 })

      // 对第三项「GitLab」置顶
      const cards = listItems(popup)
      await cards.nth(2).hover()
      await cards.nth(2).locator('[data-testid="list-item-cog"]').click({ force: true })
      // 未置顶项的 pin 按钮：data-pin-state="unpinned"
      await expect(
        popup.locator('[data-testid="item-action-pin"][data-pin-state="unpinned"]')
      ).toBeVisible({ timeout: 5_000 })
      await popup.locator('[data-testid="item-action-pin"]').click()

      // 第 0 项现在应该是 GitLab
      await expect(cards).toHaveCount(3, { timeout: 5_000 })
      await expect(cards.nth(0).locator(".bg-accent")).toBeVisible()
      await expect(cards.nth(0)).toHaveClass(/shadow-lg/)
    } finally {
      await popup.close()
    }
  })

  test("Case 27 (P1): 取消置顶 → 恢复普通顺序", async ({ helper }) => {
    await helper.seedData([
      sampleAccount("1", "PinnedApp", "alice", { pinned: true }),
      sampleAccount("2", "GitHub", "bob")
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(2, { timeout: 10_000 })
      const cards = listItems(popup)

      // 取消置顶前第 0 项是 PinnedApp（带 accent）
      await expect(cards.nth(0).locator(".bg-accent")).toBeVisible()

      // 取消置顶
      await openItemActionSheet(popup)
      await expect(
        popup.locator('[data-testid="item-action-pin"][data-pin-state="pinned"]')
      ).toBeVisible({ timeout: 5_000 })
      await popup.locator('[data-testid="item-action-pin"]').click()

      // 顺序恢复：accent 条消失
      await expect(cards).toHaveCount(2, { timeout: 5_000 })
      await expect(cards.nth(0).locator(".bg-accent")).toHaveCount(0)
      await expect(cards.nth(0)).not.toHaveClass(/shadow-lg/)
    } finally {
      await popup.close()
    }
  })

  test("Case 28 (P1): QR 弹层 → 显示 QRCodeCanvas", async ({ helper }) => {
    await helper.seedData([sampleAccount("1", "GitHub", "alice")])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(1, { timeout: 10_000 })
      await openItemActionSheet(popup)

      await popup.locator('[data-testid="item-action-qr"]').click()

      const canvas = popup.locator("dialog.modal canvas")
      await expect(canvas).toBeVisible({ timeout: 10_000 })
    } finally {
      await popup.close()
    }
  })

  test("Case 29 (P1): QR 复制 → 剪贴板含完整 otpauth URL", async ({
    helper
  }) => {
    await helper.seedData([
      sampleAccount("1", "GitHub", "alice", { secret: TEST_SECRET })
    ])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(1, { timeout: 10_000 })
      await openItemActionSheet(popup)
      await popup.locator('[data-testid="item-action-qr"]').click()

      const copyButton = popup.locator('[data-testid="qr-modal-copy"]')
      await expect(copyButton).toBeVisible({ timeout: 10_000 })
      await copyButton.click()

      const clip = await popup.evaluate(() => navigator.clipboard.readText())
      expect(clip).toMatch(/^otpauth:\/\/totp\//)
      expect(clip).toContain("secret=JBSWY3DPEHPK3PXP")
      expect(clip).toContain("issuer=GitHub")
      expect(clip).toContain("alice")
    } finally {
      await popup.close()
    }
  })

  test("Case 30 (P1): QR 下载 → 触发 PNG 下载，文件名含 issuer-account", async ({
    helper
  }) => {
    await helper.seedData([sampleAccount("1", "GitHub", "alice")])
    const popup = await helper.gotoPopup()
    try {
      await expect(listItems(popup)).toHaveCount(1, { timeout: 10_000 })
      await openItemActionSheet(popup)
      await popup.locator('[data-testid="item-action-qr"]').click()

      const downloadButton = popup.locator('[data-testid="qr-modal-download"]')
      await expect(downloadButton).toBeVisible({ timeout: 10_000 })

      const downloadPromise = popup.waitForEvent("download", { timeout: 10_000 })
      await downloadButton.click()
      const download = await downloadPromise

      expect(download.suggestedFilename()).toMatch(/GitHub-alice-.*\.png$/)
    } finally {
      await popup.close()
    }
  })
})