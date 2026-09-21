import type {
  InboundPayload,
  MessageHandler,
  MessageMap,
  OutboundPayload
} from "./message-map"

/** WXT ContentScriptContext.addEventListener 期望的 listener 签名 */
type ContextListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | void

/** browser.runtime.onMessage.addListener 的 listener 签名 */
type RuntimeListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | void

/**
 * 内部：从 unknown 中安全取出 envelope
 */
const isEnvelopeOf = <K extends keyof MessageMap>(
  message: unknown,
  action: K
): message is { action: K; payload: InboundPayload<K> } => {
  if (typeof message !== "object" || message === null) return false
  const env = message as { action?: unknown; payload?: unknown }
  return env.action === action && "payload" in env
}

/**
 * 内部：把 handler 包成 runtime/content 共用的 listener
 *
 * - 如果 cb 异步返回 Promise 且未同步用 sendResponse，则 listener 返回 true
 *   让 chrome 知道 sendResponse 会异步生效（msg-return-true-for-async）
 */
const buildListener = <K extends keyof MessageMap>(
  action: K,
  handler: MessageHandler<K>
): ContextListener => {
  return (message, sender, sendResponse) => {
    if (!isEnvelopeOf(message, action)) return false
    try {
      const result = handler(message.payload, sender)
      if (result instanceof Promise) {
        result
          .then((value) => sendResponse(value))
          .catch((error: Error) => {
            console.error(`[handleSiteAction:${String(action)}]`, error)
            sendResponse(undefined)
          })
        return true
      }
      sendResponse(result)
      return false
    } catch (error) {
      console.error(`[handleSiteAction:${String(action)}]`, error)
      sendResponse(undefined)
      return false
    }
  }
}

/**
 * 在 WXT ctx.addEventListener 注册某个 action 的 handler
 *
 * @param ctx   ContentScriptContext
 * @param target 例如 browser.runtime.onMessage（WXT 会自动在 invalidate 时清理）
 * @param action MessageMap 的 key
 * @param handler 业务回调：in 类型自动推断
 */
export const handleSiteAction = <K extends keyof MessageMap>(
  ctx: { addEventListener: (target: unknown, listener: unknown) => void },
  target: unknown,
  action: K,
  handler: MessageHandler<K>
): void => {
  const listener = buildListener(action, handler)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx.addEventListener(target, listener as any)
}

/**
 * 在 background.ts 中直接注册到 browser.runtime.onMessage.addListener
 */
export const registerRuntimeHandler = <K extends keyof MessageMap>(
  action: K,
  handler: MessageHandler<K>
): void => {
  const listener = buildListener(action, handler) as RuntimeListener
  browser.runtime.onMessage.addListener(listener)
}

// 让 OutboundPayload 在公共 API 暴露（消费方可从 map 读 out）
export type { OutboundPayload }
