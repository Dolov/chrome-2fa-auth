import { storage } from "@wxt-dev/storage"

import { ActionType, StorageKey } from "~/utils/constant"

/** 定义右键菜单列表 */
const menuList: (chrome.contextMenus.CreateProperties & {
  action?(tab: chrome.tabs.Tab): void
})[] = [
  {
    id: "issue",
    title: "Issues & 需求",
    contexts: ["action"],
    action() {
      chrome.tabs.create({
        url: "https://github.com/Dolov/chrome-github-2fa/issues"
      })
    }
  },
  {
    id: "source",
    title: "查看源码",
    contexts: ["action"],
    action() {
      chrome.tabs.create({
        url: "https://github.com/Dolov/chrome-github-2fa"
      })
    }
  },
  {
    id: "settings",
    title: "设置",
    contexts: ["action"],
    action() {
      chrome.tabs.create({
        url: browser.runtime.getURL("/settings.html")
      })
    }
  }
]

// 将 v1 版本的数据迁移到新数据格式
const adaptLegacyData = async () => {
  const data = await storage.getItem<DataProps[]>(StorageKey.DATA)
  if (Array.isArray(data) && data.length) return

  const legacyData = await storage.getItem<Record<string, any>>(
    StorageKey.LEGACY_DATA
  )
  if (!legacyData) return
  const keys = Object.keys(legacyData)
  if (!keys.length) return

  const list = keys
    .map((key) => {
      const item = legacyData[key]
      if (!item?.secret || !item?.issuer || !item?.account) {
        return null
      }
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
          .map((code: any) => {
            if (!code?.value) return null
            const { value, copyed } = code
            return {
              value,
              copied: !!copyed
            }
          })
          .filter(Boolean)
      }
    })
    .filter(Boolean)

  if (list.length) {
    try {
      await storage.setItem(StorageKey.DATA, list)
    } catch (error) {
      console.error("Legacy data migration failed:", error)
    }
  }
}

export default defineBackground(() => {
  // 初始化右键菜单
  chrome.runtime.onInstalled.addListener(() => {
    menuList.forEach((item) => {
      const { action, ...menuProps } = item
      chrome.contextMenus.create(menuProps)
    })
    adaptLegacyData()
  })

  // 监听右键菜单点击
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const menu = menuList.find((item) => item.id === info.menuItemId)
    if (!menu) return
    menu.action?.(tab!)
  })

  // 内容脚本消息路由
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === ActionType.CAPTURE_SCREENSHOT) {
      chrome.tabs.captureVisibleTab(
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