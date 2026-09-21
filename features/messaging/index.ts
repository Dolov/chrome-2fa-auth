/**
 * Public surface of features/messaging
 *
 * 类型化消息协议（候选 B / ADR-0003）：popup ↔ content ↔ background
 * 共享 MessageMap 类型表，新增 action 在一处加一行，TS 自动接管收尾。
 */
export type {
  MessageMap,
  AutoScanResult,
  CaptureScreenshotResult,
  MessageHandler,
  InboundPayload,
  OutboundPayload
} from "./messageMap"
export {
  sendSiteAction,
  sendAutoScanToActiveTab,
  sendManualScreenshotToActiveTab,
  sendCaptureScreenshot,
  type SendTarget
} from "./sendSiteAction"
export { handleSiteAction, registerRuntimeHandler } from "./handleSiteAction"
