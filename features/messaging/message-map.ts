import type { ActionType } from "~/utils/types"

/**
 * 消息协议类型表（候选 B / ADR-0003）
 *
 * 每条 action 的 in/out 形状一处定义；发送端 / 接收端都从同一张表读类型，
 * 加新 action 加一行 TS 编译自动接管。
 *
 * 设计要点：
 * - `in: void` 表示没有 payload
 * - `out: void` 表示不需要响应
 * - 接收方在 WXT ctx 内通过 handleSiteAction(action, cb) 注册，
 *   cb 的参数类型自动推断为 MessageMap[K]['in']
 */

export interface MessageMap {
  [ActionType.AUTOSCAN]: {
    in: void
    out: AutoScanResult
  }
  [ActionType.MANUAL_SCREENSHOT]: {
    in: { message: string }
    out: void
  }
  [ActionType.CAPTURE_SCREENSHOT]: {
    in: void
    out: CaptureScreenshotResult
  }
}

/** AUTOSCAN 出参：扫到 QR data 或失败信息 */
export interface AutoScanResult {
  success: boolean
  data?: string
  error?: string
}

/** CAPTURE_SCREENSHOT 出参：截图 PNG dataUrl */
export interface CaptureScreenshotResult {
  success: boolean
  image?: string
}

/** 通过 action 名称推断 in/out 类型 */
export type InboundPayload<K extends keyof MessageMap> = MessageMap[K]["in"]
export type OutboundPayload<K extends keyof MessageMap> = MessageMap[K]["out"]

/** 接收方 cb 签名：out 为 void 时返回 undefined；其他返回 out */
export type MessageHandler<K extends keyof MessageMap> = (
  payload: InboundPayload<K>,
  sender: chrome.runtime.MessageSender
) => OutboundPayload<K> | Promise<OutboundPayload<K>>
