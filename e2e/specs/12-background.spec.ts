/**
 * F12. Background & 迁移 → `12-background.spec.ts`
 *
 * 历史背景：原本计划实现 9 条 Background & 迁移 case（SPECS.md F12）。
 * 核实后判定 v1.7（GitHub v2 分支，1.7.0）和 v3.0.0（当前）的 `DataProps`
 * 形态完全一致（sync:data / recoveryCodes.copied / 字段集都对得上），
 * 不需要保留 `adaptLegacyData` 迁移函数。原 Case 85 / 86 / 86b 删除。
 *
 * 本次保留：
 * - Case 87 (P0) 持久化关 popup — 关 popup 重开 → 数据仍在
 *
 * 右键菜单（Case 81-84）、CAPTURE_SCREENSHOT（Case 89-90）、saveOTP
 * 三段逻辑（Case 91-92）、i18n（Case 93）留待后续补全。
 */
import { expect, test } from "../fixtures/extension"
import { TEST_SECRET } from "../fixtures/test-secret"

test.describe("F12 background > 持久化", () => {
  test("Case 87 (P0): 关 popup 重开 → 数据仍在", async ({ helper }) => {
    await helper.seedData([
      {
        id: "persist-1",
        type: "totp",
        secret: TEST_SECRET,
        account: "alice",
        issuer: "PersistApp"
      }
    ])

    const popup1 = await helper.gotoPopup()
    try {
      await expect(popup1.getByText("PersistApp").first()).toBeVisible({
        timeout: 10_000
      })
    } finally {
      await popup1.close()
    }

    // 重开一个新 popup（不重启 SW / context，验证 chrome.storage.sync 持久）
    const popup2 = await helper.gotoPopup()
    try {
      await expect(popup2.getByText("PersistApp").first()).toBeVisible({
        timeout: 10_000
      })
    } finally {
      await popup2.close()
    }
  })
})