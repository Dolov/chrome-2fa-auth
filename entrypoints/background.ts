import type { Browser } from "wxt/browser"

import { ActionType } from "~/utils/types"
import { registerRuntimeHandler } from "~/features/messaging"
import { i18n } from "~/utils/i18n"

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
    title: i18n("background_menu_issue"),
    contexts: ["action"],
    action() {
      browser.tabs.create({
        url: "https://github.com/Dolov/chrome-github-2fa/issues"
      })
    }
  },
  {
    id: "source",
    title: i18n("background_menu_source"),
    contexts: ["action"],
    action() {
      browser.tabs.create({
        url: "https://github.com/Dolov/chrome-github-2fa"
      })
    }
  },
  {
    id: "settings",
    title: i18n("background_menu_settings"),
    contexts: ["action"],
    action() {
      browser.tabs.create({
        url: browser.runtime.getURL("/settings.html")
      })
    }
  }
]

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
