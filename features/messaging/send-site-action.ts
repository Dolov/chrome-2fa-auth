import { ActionType } from "~/utils/constant"

import type {
  InboundPayload,
  MessageHandler,
  MessageMap,
  OutboundPayload
} from "./message-map"

/** 发送目标：active tab 的 content script 或 background SW */
export type SendTarget =
  | { kind: "tab"; tabId: number }
  | { kind: "runtime" }

interface Envelope<K extends keyof MessageMap> {
  action: K
  payload: InboundPayload<K>
}

/**
 * 构造发送的 envelope；K 走 MessageMap 推断入参类型
 */
const wrap = <K extends keyof MessageMap>(
  action: K,
  payload: InboundPayload<K>
): Envelope<K> => ({ action, payload })

/**
 * 发送消息并拿到 promise 形式的 response
 *
 * - target=tab → browser.tabs.sendMessage(tabId, ...)
 * - target=runtime → browser.runtime.sendMessage(...)
 *
 * 调用方不用关心 chrome.tabs/runtime 的 callback 形态。
 */
export const sendSiteAction = <K extends keyof MessageMap>(
  action: K,
  payload: InboundPayload<K>,
  target: SendTarget
): Promise<OutboundPayload<K>> => {
  const envelope = wrap(action, payload)
  const raw = new Promise<unknown>((resolve, reject) => {
    const dispatch = (targetPort: chrome.tabs.Tab | undefined) => {
      if (target.kind === "tab") {
        browser.tabs.sendMessage(target.tabId, envelope, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve(response)
        })
      } else {
        browser.runtime.sendMessage(envelope, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
          resolve(response)
        })
      }
    }
    void dispatch(undefined)
  })
  return raw as Promise<OutboundPayload<K>>
}

/**
 * 便利：发送 AUTOSCAN 到当前活动 tab 的 content script
 */
export const sendAutoScanToActiveTab = (): Promise<AutoScanOutcome> =>
  new Promise((resolve, reject) => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const firstTab = tabs[0]
      if (!firstTab?.id) {
        reject(new Error("No active tab"))
        return
      }
      sendSiteAction(ActionType.AUTOSCAN, undefined, { kind: "tab", tabId: firstTab.id })
        .then(resolve)
        .catch(reject)
    })
  })

/** 便利：发送 MANUAL_SCREENSHOT 到当前活动 tab */
export const sendManualScreenshotToActiveTab = (message: string): Promise<void> =>
  new Promise((resolve, reject) => {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const firstTab = tabs[0]
      if (!firstTab?.id) {
        reject(new Error("No active tab"))
        return
      }
      sendSiteAction(
        ActionType.MANUAL_SCREENSHOT,
        { message },
        { kind: "tab", tabId: firstTab.id }
      )
        .then(() => resolve())
        .catch(reject)
    })
  })

/** 便利：content script 请求 background 截图 */
export const sendCaptureScreenshot = (): Promise<CaptureScreenshotOutcome> =>
  sendSiteAction(ActionType.CAPTURE_SCREENSHOT, undefined, { kind: "runtime" })

// 类型别名
type AutoScanOutcome = OutboundPayload<typeof ActionType.AUTOSCAN>
type CaptureScreenshotOutcome = OutboundPayload<typeof ActionType.CAPTURE_SCREENSHOT>

// 防御：保 MessageHandler / InboundPayload 在 ambient 类型上仍可用
export type { MessageHandler }
