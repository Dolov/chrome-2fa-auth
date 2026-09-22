# CONTEXT — 2fa-auth-otp-authenticator 领域词汇

> 本文件是仓库的**领域词汇表**。新增功能前先在此登记新词；评审架构、给新协作者 / AI 助手对齐心智模型时，**先读本文**。

## 怎么读

每个词条四要素：

- **是什么**：用一句话说清楚边界与作用。
- **在哪里**：`源码文件路径`。
- **典型用法**：一段最少代码示例。
- **边界 / 不变式**：列 3–5 条不能违反的事实，避免误用。

## 分层不变式（执行环境）

生产代码按**运行环境**分层。这是硬约束，不是风格偏好——改目录或加 import 前先确认落在哪一层。

| 层 | 目录 | 允许 | 禁止 |
|---|---|---|---|
| 双端纯原语（辅助） | `utils/`（5 个文件：`clipboard` `cn` `constants` `qr-decode` `types`） | 纯函数、纯类型、浏览器标准 API | import React；注入持久 DOM 节点；调用 `chrome.*` / `browser.*` 扩展 API；持有业务状态；**内联第三方库替代**（见下一栏） |
| 双端纯原语（核心算法内联） | `utils/libs/`（4 个文件：`base32` `hmac` `otpauth` `totp`，ADR-0006） | 同上，且**必须替代第三方库** | 同上；动态行为偏离上游（保留怪癖以兼容独立 otplib） |
| 页面注入 UI | `features/page-ui/` | 操作宿主页面 DOM 与 CSS（`mountStyle` 是唯一 `<style>` 注入通道） | import React |
| React 页面状态 | `features/ui-state/`（hooks）、`components/ui/`（设计原语）、`entrypoints/{popup,settings}/components/`（页面专属组件）、`components/favicons.tsx`（跨页面领域组件） | React hooks / 组件 | 被 content script import |
| React 业务状态 | `features/otp-store/`；`context.tsx` 是唯一 React 入口 | Provider + mutators | 被 content script import；向 content 侧 re-export `dataStore` |
| content 专属 | `features/site-content/dom/`、`entrypoints/*.content/` | 依赖宿主页面结构（SPA 路由、DOM 选择器） | 被 popup / settings import |
| 跨层桥接（React-free） | `features/messaging/`、`features/runtime/`、`features/otp-intake/{intake,intake.types,index,adapters/content}.ts` | 可被 popup / settings / content / background 任一侧调用 | 持有持久业务状态 |
| 跨层 React adapter | `features/otp-intake/adapters/popup.tsx` | popup 侧 React 适配器 | 被 content script import |

### 硬规则 1：barrel 不变式

**content script 会 import 的 barrel 必须 React-free。**

项目未声明 `package.json` 的 `sideEffects: false`，Rollup 无法 tree-shake 掉带副作用的模块。
因此 barrel 里一行 `export { useX } from "./x.tsx"` 就足以把 react + react-dom 打进**每个** content bundle（实测每 entry +6.4 KB）。

- `features/otp-intake/index.ts`、`features/messaging/index.ts` 属此列，只导出 React-free 面。
- popup-only 适配器走深路径，不进 barrel（如 `features/otp-intake/adapters/popup`）。

### 硬规则 2：content bundle 预算

`global.content` 的 `matches` 是 `<all_urls>`，它的体积要乘以「用户访问的每个网页」。
改动 content 侧依赖后跑 `pnpm build`，对比 `content-scripts/*.js`：

| entrypoint | 预算 | 当前内含 |
|---|---|---|
| `global.js` | < 200 KB | QR 扫描 + intake，不算 OTP |
| `github.js` / `npm.js` | < 620 KB | `generateOtp`（零依赖内联）+ jsQR |

TOTP 去依赖见 `docs/adr/0006-inline-hmac-replaces-otplib.md`；
jsQR 按需加载（content 侧受 IIFE 限制未完成）见 `docs/adr/0007-lazy-load-jsqr.md`。

### 硬规则 2.1：不要静态 import 大体积库

压缩后 >50 KB 的库（如 jsQR）一律用动态 `import()`。ESM 页面（popup/settings）
会真正拆包；content script（IIFE）会内联，但至少不把负担转嫁给弹窗。

### 硬规则 3：不引入位图品牌素材

品牌标识一律用 `components/ui/icon.tsx` 里已有的矢量图标，**不新增 PNG/JPG**。
需要新品牌标识时先查那个文件。

## 模块词汇（按依赖顺序）

### 1. OTPAuth URL

- **是什么**：RFC 6238 描述的 `otpauth://totp/<label>?secret=...&issuer=...` 字符串。
- **在哪里**：`utils/libs/otpauth.ts` 的 `parseOtpAuthUrl` / `isOtpAuthUrl` / `generateOtpAuthUrl`；
  数值生成在 `utils/libs/totp.ts`（内联 HMAC，零依赖，见 ADR-0006）。
- **典型用法**：从 GitHub 设置页 QR 解码出来的字符串 → `parseOtpAuthUrl(data)` → `OtpAuthConfig`。
- **边界**：
  - URL 必须以 `otpauth://` 开头且包含 `secret=`，否则 `isOtpAuthUrl` 返回 false。
  - `parseOtpAuthUrl` 抛异常时调用方负责降级（toast / 重试）。
  - **algorithm 归一不变式**：OTPAuth 规范写的是大写 `SHA1`，而 `generateOtp()`
    内部要求小写 `sha1 | sha256 | sha512`。因此必须经 `utils/libs/totp.ts` 的
    `toHmacAlgorithm()` 归一，**缺省回退 `"sha1"`，绝不能传 `undefined`**。
    违反此不变式会导致 popup 一有数据就白屏。
  - **参数透传不变式**：`digits` / `period` / `algorithm` 必须由调用方从存储条目
    一路传到 `generateOtp`。组件收的是 `config` 而不是 `secret`（ADR-0008）。
  - `utils/libs/totp.ts` 会对越界的 `digits` / `period` 做防御性归一（导入的脏数据
    能绕开 `parseOtpAuthUrl` 的校验）。

### 2. OtpItem（= `DataProps`）

- **是什么**：单条账户（issuer + account + secret + 时间参数 + 元数据），扩展自 `OtpAuthConfig`。
- **在哪里**：`utils/types.ts` 的 `DataProps`；渲染列表在 `components/home/list.tsx`。
- **典型用法**：
  ```ts
  const item: DataProps = {
    id: "1700000000000",
    type: "totp",
    issuer: "GitHub",
    account: "alice",
    secret: "JBSWY3DPEHPK3PXP"
  }
  ```
- **边界**：
  - `id` 在 storage 层用 `Date.now()` 生成；不要在前端复用。
  - `deleted: true` 是软删状态，仍占用列表位置。
  - `pinned: true` 时排到顶部，渲染层排序而非存储层。
  - `recoveryCodes?: { value: string; copied: boolean }[]` 是恢复码列表；存在时列表项多一个入口。
  - `remark?: string` 是用户备注。

### 3. OtpStore

- **是什么**：chrome.storage 中所有 OTP 条目的**单一数据源**（`storage.defineItem<DataProps[]>(DATA_KEY, { fallback: [] })`）。
- **在哪里**：`features/otp-store/store.ts` 的 `dataStore`（存储层与 `context.tsx` 分开：前者无 React，content / background 走深路径）。
- **典型用法**：永远不直接调用 `dataStore.setValue`，只通过 `OtpProvider` 派发的 mutators。
- **边界**：
  - 数据存 `sync:` 区，跨设备同步。
  - 单条上限 8KB（10 条账户约 1–2KB，典型足够）。
  - 写入前必须经过 `addOtp` 纯函数处理去重 / 软删合并（见 ADR-0001）。
  - `store.ts` 还维护进程内缓存与订阅：`getCachedOtpList` / `subscribeOtpList`
    给 React 侧同步读取，`mutateOtpList` 基于最新缓存做纯变更再落库。
    非 React 侧（content / background）仍走 `dataStore` + `saveOTP`，不依赖缓存。

### 4. OtpProvider

- **是什么**：React Context，把 OtpStore 暴露为 `items` + `mutators`。挂在 popup root 与 settings root。
- **在哪里**：`features/otp-store/context.tsx`；对外表面 `features/otp-store/index.ts`（只导出 React 侧）。
- **典型用法**：
  ```tsx
  <OtpProvider>
    <Main />
  </OtpProvider>
  ```
- **边界**：
  - Provider 经 `useSyncExternalStore` 订阅 `store.ts` 的列表缓存，跨 tab 由 `storage.watch` 同步。
  - 写入统一走 `mutateOtpList`：基于最新缓存计算，避免并发调用互相覆盖。
  - **不在 content script 内使用**（content 没有 React 树）；content 直接读 `dataStore`。

### 5. OtpMutators

- **是什么**：9 个变更原语的接口，封装去重 / 软删合并语义。
- **在哪里**：`features/otp-store/context.tsx` 的 `OtpMutators` 接口。
- **典型用法**：
  ```tsx
  const { add, update, softDelete, restore, hardDelete, pin, exists } = useOtpMutators()
  ```
  完整 9 个：`add` / `update` / `softDelete` / `restore` / `hardDelete` / `pin` / `exists` / `isRecoveryCodesSavedFor` / `markRecoveryCodeCopied`。
- **边界**：
  - 所有写入经过 mutators；不允许直接 `setValue`。
  - `exists()` 必须先于 `add()` 调用以避免重复提示不一致。

### 6. Intake（候选 A 引入）

- **是什么**：把 QR 文本（或文件、URL）转化为 OtpItem 的**唯一业务入口**。
- **在哪里**：`features/otp-intake/intake.ts`（候选 A 落点）。
- **典型用法**：
  ```ts
  const result = await intakeOtp({ kind: 'qr-data', data: qrString }, {
    account: { promptAccount: (issuer) => window.prompt(issuer) },
    writer: popupWriter,
    notifier: popupNotifier,
  })
  ```
- **边界**：
  - 三类来源统一收口：`qr-data` / `file` / `parsed-config`。
  - 解析失败、缺账号、重复、未实现——四种状态分别走 toast 路径，不抛异常。
  - 调用方负责持久化（writer）与提示（notifier），intake 只做编排。
  - **barrel 不变式**：`features/otp-intake/index.ts` 必须 React-free（content script 会 import 它）；
    popup 适配器走深路径 `features/otp-intake/adapters/popup.tsx`（**唯一带 React 的文件**，content 禁止 import）。

### 7. SiteAdapter

- **是什么**：单个站点对内容脚本行为的**声明式描述**（路由判别、DOM 选择器、account 抽取）。
- **在哪里**：`features/site-content/site-adapter.ts` 的 `SiteAdapter` 接口；两个实例在 `adapters/{github,npm}.ts`。
- **典型用法**：
  ```ts
  export const githubAdapter: SiteAdapter = { name, issuer, isFillOTPPage, ... }
  ```
- **边界**：
  - 一个站点一个 adapter，不在一个文件里塞两个站点。
  - `issuer` 必须匹配 `Issuers` 枚举的字面量值。`Issuers.GITHUB = "GitHub"`（**历史大小写保留**——v1 真实存盘值，迁移期不动）；`Issuers.NPM = "NPM"`。
  - 选择器（`selectors.*`）尽量用站点原生 class/id，不要依赖自动生成。

### 8. SiteScript（ContentScript）

- **是什么**：注入到目标站点的 content script；只负责**调用 `dispatchSiteAction(adapter, ctx)`**。
- **在哪里**：`entrypoints/{github,npm}.content/index.ts`。
- **典型用法**：
  ```ts
  export default defineContentScript({
    matches: ["https://github.com/*"],
    main(ctx) { dispatchSiteAction(githubAdapter, ctx) }
  })
  ```
- **边界**：
  - 不在 SiteScript 里写业务逻辑，只负责 dispatch + SPA 重跑。
  - listener 必须经 `ctx.addEventListener` 注册，让 WXT 失效时自动清理。

### 9. PageAction

- **是什么**：SiteScript 在某个 URL 上要做的事，三选一：`fill-otp` / `read-qr` / `recover`。
- **在哪里**：`features/site-content/site-adapter.ts` 的 `PageAction` 类型。
- **典型用法**：由 `classifyByPathname(adapter, pathname)` 解析。
- **边界**：
  - `recover` 优先于 `read-qr` 优先于 `fill-otp`，三者互斥。
  - URL 没匹配上返回 `null`，dispatch 不做事。

### 10. GlobalContentScript

- **是什么**：跨站点通用工具的 content script（popup 主动触发），不做站点差异化逻辑。
- **在哪里**：`entrypoints/global.content/{index,manual-scan,crop,overlay}.ts`。
- **典型用法**：popup 发 `AUTOSCAN` 或 `MANUAL_SCREENSHOT` 消息，global.content 接管渲染 / 截图。
- **边界**：
  - matches 是 `<all_urls>`，只跑 `scanPage` / 截图叠加，不注入样式到敏感页面。
  - z-index 基线 `contentBaseZindex`，叠加元素 z-index +1。

### 11. CSS Portal

- **是什么**：内容脚本注入样式的**单一 host `<style>`**（id=`g2fa-portal-style-sheet`），按 dedupe key 幂等。
- **在哪里**：`features/page-ui/css-portal.ts` 的 `mountStyle`。
- **典型用法**：
  ```ts
  mountStyle(`${CSS_PREFIX}-selection-style`, `...CSS...`)
  ```
- **边界**：
  - `CSS_PREFIX = "g2fa-portal"`（构建时常量），所有特性共用一个 host。
  - 重复 `mountStyle` 调用是安全的（dedupe by key）。
  - **不要**直接在页面 `appendChild(<style>)`。

### 12. Layout Container

- **是什么**：popup 的两种视觉壳：`PHONE`（daisyUI `mockup-phone`）和 `DEFAULT`（标准 350×600）。
- **在哪里**：`entrypoints/popup/components/layout/{index,phone-frame}.tsx`；通过 `ContainerType` 枚举切换。
- **典型用法**：`<Layout>{children}</Layout>`；`useModalWidth()` 根据 `containerType` 返回对话框宽度。
- **边界**：
  - `Layout` 是 React 组件名（外层壳），与"容器布局"概念同名但与 `chrome.tabs` 等无关。
  - 不要把它与 `ContainerType` 枚举混淆。

### 13. Message Protocol（候选 B 引入）

- **是什么**：popup ↔ content ↔ background 之间结构化消息的**类型注册表**。
- **在哪里**：`features/messaging/message-map.ts`（类型表）+ `send-site-action.ts`（发送）+ `handle-site-action.ts`（接收）。
- **典型用法**：
  ```ts
  // 发送（popup 侧）
  sendSiteAction(ActionType.AUTOSCAN, undefined)

  // 接收（content / background 侧）
  handleSiteAction(ActionType.AUTOSCAN, (payload, sender) => {
    // payload / 返回值类型由 MessageMap 自动推断
  })
  ```
- **边界**：
  - 任何新 action 必须在 `MessageMap` 注册；否则 `sendSiteAction<T>` 编译失败。
  - background 仍是裸回调（生命周期简单），但 payload 形状仍走 Map 类型。

### 14. Toast

- **是什么**：往 `document` 里插入的固定位提示条（vanilla DOM，无 React）。
- **在哪里**：`features/page-ui/toast.ts`。
- **典型用法**：`message.success("已复制")`；`message.error("失败")`。
- **边界**：
  - **双端可用**：popup 侧（`entrypoints/popup/components/otp-text.tsx`、`entrypoints/popup/components/item-action-sheet.tsx`）
    与 content 侧（`read-qr.ts`、`manual-scan.ts`、`otp-autofill.ts`）都在用。
  - z-index 取 `contentBaseZindex + 1`，压在其他注入 UI 之上。
  - 多个 toast 叠加会自动堆叠，无需上层排队。
  - 不要和 `features/messaging` 混：那是结构化 postMessage 协议，不碰宿主 DOM。

### 15. Shared OTP Clock

- **是什么**：全局唯一的秒级 ticker，供 OTP 渲染点订阅，替代"每个条目各起 2–3 个 `setInterval`"。
- **在哪里**：`features/ui-state/use-otp-tick.ts` 的 `useOtpStepIndex` / `useOtpRemaining`。
- **典型用法**：`const stepIndex = useOtpStepIndex(period)` 作为 `generateOtp` 的 `useMemo` 依赖。
- **边界**：
  - 模块级单例 interval：首个订阅者创建、订阅清空后销毁；组件内不要自行 `setInterval`。
  - 快照返回数字，`useSyncExternalStore` 在值不变时不重渲染（周期切换才重算 HMAC）。
  - `OtpText` 只由 `config` + `stepIndex` 派生，不持有 OTP 状态。

## 命名冲突表（不要混）

| 易混 | 含义 |
|---|---|
| `Container` 组件 vs `ContainerType` 枚举 vs `useModalWidth` 中的"容器宽度" | 组件渲染外层；枚举是 PHONE/DEFAULT；宽度是 Modal 子属性 |
| `OtpForm`（=表单组件）vs `Form`（HTMLFormElement）| 一个组件、一个 DOM 类型 |
| `SiteAdapter`（站点描述）vs `Adapter`（react 适配器模式）| 上下文里没有第二个 Adapter，别瞎联想 |
| `global.content` vs `github.content` vs `npm.content` | global 是 <all_urls>，两个站点的内容脚本只跑对应 host |
| `chrome.*` vs `browser.*` | API 调用统一用 `browser.*`；**两处例外必须用 `chrome.*`**：`chrome.runtime.MessageSender`（类型，来自 `@types/chrome`）与 `chrome.runtime.lastError`（错误检查，browser polyfill 不暴露） |
| `toast`（`features/page-ui/toast.ts`）vs `messaging`（`features/messaging`）| 前者是页面内 DOM 提示条，后者是 popup↔content↔background 消息协议 |
| `store.ts`（存储层）vs `context.tsx`（React Provider）| 同在 `features/otp-store/`；前者无 React，后者是唯一 React 入口 |
| `utils/qr-decode.ts` vs「生成二维码」| 库里只有解码没有生成，不要往这里加 encode |

## 维护

新增领域名词时：

1. 在本文加词条（4 要素）。
2. 如果它取代了一个旧名词，把旧词条移到 `## 已弃用` 区，注明被哪个 PR 取代。
3. 同一概念如果有两种实现（如 `saveOTP` 与 `addOtpItem`），必须收敛到一个，不留双名。
4. 新增或搬迁文件前，先对照 `## 分层不变式（执行环境）` 确认落在正确的层。