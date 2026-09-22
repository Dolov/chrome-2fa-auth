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
 * 只校验 action。
 *
 * 不能要求 `"payload" in env`：Chrome 的消息走 JSON 序列化，发送侧
 * `{ action, payload: undefined }` 到达对端会被丢弃成 `{ action }`，
 * 带 undefined payload 的 action（AUTOSCAN / CAPTURE_SCREENSHOT）永远匹配不上。
 */
const isEnvelopeOf = <K extends keyof MessageMap>(
  message: unknown,
  action: K
): message is { action: K; payload: InboundPayload<K> } => {
  if (typeof message !== "object" || message === null) return false
  const env = message as { action?: unknown; payload?: unknown }
  return env.action === action
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

/** 提供 onInvalidated 的失效作用域（WXT ContentScriptContext 的子集） */
interface InvalidationScope {
  onInvalidated(callback: () => void): () => void
}

/**
 * 在 content script 的 ctx 内注册某个 action 的 handler。
 *
 * 必须用 runtime.onMessage.addListener，不能用 ctx.addEventListener：
 * 后者是 DOM EventTarget 专用（签名 `(target, type, handler)`），
 * 传 runtime.onMessage 时 `target.addEventListener` 不存在，会静默 no-op，
 * listener 根本不会注册（表现为发送端 “Receiving end does not exist”）。
 *
 * @param ctx   ContentScriptContext（用于失效时清理）
 * @param target browser.runtime.onMessage
 * @param action MessageMap 的 key
 * @param handler 业务回调：in 类型自动推断
 */
export const handleSiteAction = <K extends keyof MessageMap>(
  ctx: InvalidationScope,
  target: typeof browser.runtime.onMessage,
  action: K,
  handler: MessageHandler<K>
): void => {
  const listener = buildListener(action, handler) as RuntimeListener
  target.addListener(listener)
  ctx.onInvalidated(() => target.removeListener(listener))
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
