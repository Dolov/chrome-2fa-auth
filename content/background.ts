import { storage } from "@wxt-dev/storage"

import { LEGACY_KEY, dataStore } from "~/utils/storage"
import { ActionType, StorageKey } from "~/utils/constant"

/**
 * 右键菜单列表
 * 类型用 browser.contextMenus.CreateProperties（WXT auto-imports browser）
 */
const menuList: (browser.contextMenus.CreateProperties & {
  action?(tab: browser.tabs.Tab): void
})[] = [
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

/**
 * 将 v1 版本的数据迁移到新数据格式
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
      await dataStore.setValue(list)
    } catch (error) {
      console.error("[background] Legacy data migration failed:", error)
    }
  }
}

interface LegacyOTPItem {
  id: string
  type: "totp"
  issuer: string
  account: string
  secret: string
  recoveryCodes: Array<{ value: string; copied: boolean }>
}

export default defineBackground(() => {
  // svc-register-listeners-synchronously：listener 在顶层同步注册
  browser.runtime.onInstalled.addListener(() => {
    menuList.forEach((item) => {
      const { action, ...menuProps } = item
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

  // 内容脚本消息路由（msg-return-true-for-async）
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === ActionType.CAPTURE_SCREENSHOT) {
      browser.tabs.captureVisibleTab(
        sender.tab?.windowId,
        { format: "png" },
        (dataUrl) => {
          sendResponse({ success: !!dataUrl, image: dataUrl })
        }
      )
      return true
    }
    return false
  })
})