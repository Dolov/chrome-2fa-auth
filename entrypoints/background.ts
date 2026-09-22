import { storage } from "@wxt-dev/storage"
import type { Browser } from "wxt/browser"

import { LEGACY_KEY, dataStore } from "~/features/otp-store/store"
import { ActionType } from "~/utils/types"
import { registerRuntimeHandler } from "~/features/messaging"

/** 右键菜单项：extra action 在 onClicked 时调用 */
type MenuItem = Browser.contextMenus.CreateProperties & {
  action?(tab: Browser.tabs.Tab): void
}

/**
 * 右键菜单列表
 */
const menuList: MenuItem[] = [
  {
    id: "issue",
    title: "Issues & 需求",
    contexts: ["action"],
    action() {
      browser.tabs.create({
        url: "https://github.com/Dolov/chrome-github-2fa/issues"
      })
    }
  },
  {
    id: "source",
    title: "查看源码",
    contexts: ["action"],
    action() {
      browser.tabs.create({
        url: "https://github.com/Dolov/chrome-github-2fa"
      })
    }
  },
  {
    id: "settings",
    title: "设置",
    contexts: ["action"],
    action() {
      browser.tabs.create({
        url: browser.runtime.getURL("/settings.html")
      })
    }
  }
]

interface LegacyCode {
  value: string
  /** 历史字段拼写错误（v1），迁移时归一 */
  copyed?: boolean
}

interface LegacyOTPItem {
  id: string
  type: "totp"
  issuer: string
  account: string
  secret: string
  recoveryCodes?: LegacyCode[]
}

/**
 * 将 v1 版本的数据迁移到新数据格式
 *
 * 历史字段名 `copyed` 是 v1 真实存盘值（typo），迁回时归一为 `copied`。
 */
const adaptLegacyData = async () => {
  const data = await dataStore.getValue()
  if (data.length) return

  const legacyData = await storage.getItem<Record<string, LegacyOTPItem>>(
    LEGACY_KEY
  )
  if (!legacyData) return
  const keys = Object.keys(legacyData)
  if (!keys.length) return

  const list = keys
    .map<LegacyOTPItem | null>((key) => {
      const item = legacyData[key]
      if (!item?.secret || !item?.issuer || !item?.account) return null
      const { account, issuer, secret } = item
      const recoveryCodes = Array.isArray(item.recoveryCodes)
        ? item.recoveryCodes
        : []
      return {
        issuer,
        secret,
        account,
        id: `${key}-${Date.now()}`,
        type: "totp" as const,
        recoveryCodes: recoveryCodes
          .map((code) => {
            if (!code?.value) return null
            return { value: code.value, copied: !!code.copyed }
          })
          .filter(Boolean) as Array<{ value: string; copied: boolean }>
      }
    })
    .filter((item): item is LegacyOTPItem => item !== null)

  if (list.length) {
    try {
      // 迁移后的 legacy 条目与 DataProps 完全兼容（recoveryCodes 字段类型一致），
      // 这里显式标注以收敛 TS 推断。
      await dataStore.setValue(list as unknown as DataProps[])
    } catch (error) {
      console.error("[background] Legacy data migration failed:", error)
    }
  }
}

interface CaptureScreenshotRequest {
  action: typeof ActionType.CAPTURE_SCREENSHOT
}

interface CaptureScreenshotResponse {
  success: boolean
  image?: string
}

const isCaptureScreenshot = (
  message: unknown
): message is CaptureScreenshotRequest =>
  typeof message === "object" &&
  message !== null &&
  "action" in message &&
  message.action === ActionType.CAPTURE_SCREENSHOT

export default defineBackground(() => {
  // svc-register-listeners-synchronously：listener 在顶层同步注册
  browser.runtime.onInstalled.addListener(() => {
    menuList.forEach((item) => {
      const { action: _action, ...menuProps } = item
      browser.contextMenus.create(menuProps)
    })
    adaptLegacyData()
  })

  // 监听右键菜单点击
  browser.contextMenus.onClicked.addListener((info, tab) => {
    const menu = menuList.find((item) => item.id === info.menuItemId)
    if (!menu) return
    menu.action?.(tab!)
  })

  // CAPTURE_SCREENSHOT 走候选 B 类型化注册
  registerRuntimeHandler(ActionType.CAPTURE_SCREENSHOT, (_payload, _sender) => {
    return new Promise<CaptureScreenshotResponse>((resolve) => {
      // 没有 sender.tab?.windowId 时退到 currentWindow
      browser.tabs.captureVisibleTab(
        { format: "png" },
        (dataUrl) => {
          resolve({
            success: !!dataUrl,
            image: dataUrl ?? undefined
          })
        }
      )
    })
  })
})
