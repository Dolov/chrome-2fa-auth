# ADR-0003: 抽出类型化消息协议（S10 决策）

> 状态：已采纳（feat/migrate-wxt-clean @ S10 — 候选 B）

## 上下文

popup ↔ content / content ↔ background 之间的消息 payload 形状**三处独立 inline 定义**：

| 方向 | 文件 | 入参 | 出参 |
|---|---|---|---|
| popup → global.content | `components/home/create.tsx:60-108` | `{ action }` | inline `QRScanResult { success, data?, error? }` |
| popup → global.content | `create.tsx:115` | `{ action, message }` | 无 |
| content → background | `global.content/overlay.ts:103-115` | `{ action: "CAPTURE_SCREENSHOT" }` | `{ success: !!dataUrl, image }` inline |

加新 action 必须手抄两边；callback 参数重命名不会编译失败（因为 callback 类型已 inline）。

## 决策

新增 `features/messaging/`：

```ts
// features/messaging/messageMap.ts
export interface MessageMap {
  AUTOSCAN: { in: void; out: { success: boolean; data?: string; error?: string } }
  MANUAL_SCREENSHOT: { in: { message: string }; out: void }
  CAPTURE_SCREENSHOT: { in: void; out: { success: boolean; image?: string } }
}

export const sendSiteAction = <K extends keyof MessageMap>(
  action: K,
  payload: MessageMap[K]['in']
): Promise<MessageMap[K]['out']> => { /* ... */ }

export const defineMessageListener = <K extends keyof MessageMap>(
  action: K,
  cb: (payload: MessageMap[K]['in']) => MessageMap[K]['out'] | Promise<MessageMap[K]['out']>
): RuntimeMessageListener => { /* ... */ }
```

五个发送/接收点切换：

- popup 端：`create.tsx` 的 `browser.tabs.sendMessage` → `sendSiteAction('AUTOSCAN')` / `sendSiteAction('MANUAL_SCREENSHOT')`。
- global.content 端：`global.content/index.ts` 的 ctx.addEventListener → `defineMessageListener('AUTOSCAN', cb)` 等。
- content → background：`overlay.ts` → `sendSiteAction('CAPTURE_SCREENSHOT')`。
- background：`background.ts` → `defineMessageListener('CAPTURE_SCREENSHOT', cb)`。

## 后果

- ✅ payload 形状一处定义；TS 在收到端编译报错，发送端不会发错。
- ✅ listener callback 参数类型自动推断；不再 inline `QRScanResult` / `CaptureScreenshotResponse`。
- ✅ 新 action 加两行（注册到 Map）+ 一处发送，type-check 自动接管。
- ❌ 每次发送有 ~5 行模板代码（构造 `sendMessage` 包装）。
- ❌ `sendSiteAction` 必须 polyfill `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage` 两条路径——内部抽 `dispatch(action, payload)`。

## 反向引用

- 实现 PR：S10 commit `TBD`
- 词汇：见 `CONTEXT.md` 第 13 节（Message Protocol）。

## 备选方案（已否决）

- **方案 B：保持 inline + 文档注释**：违背"接口即测试面"；改名不会报错。
- **方案 C：用 Protobuf / ts-rpc 全量替代**：过度；本仓库只有 3 条消息，不需要 RPC。
