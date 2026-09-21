# CONTEXT — 2fa-auth-otp-authenticator 领域词汇

> 本文件是仓库的**领域词汇表**。所有 S1–S8 重构以及新增功能必须在此登记新词。
> 评审架构、给新协作者 / AI 助手对齐心智模型时，**先读本文**。

## 怎么读

每个词条四要素：

- **是什么**：用一句话说清楚边界与作用。
- **在哪里**：`源码文件路径`。
- **典型用法**：一段最少代码示例。
- **边界 / 不变式**：列 3–5 条不能违反的事实，避免误用。

## 模块词汇（按依赖顺序）

### 1. OTPAuth URL

- **是什么**：RFC 6238 描述的 `otpauth://totp/<label>?secret=...&issuer=...` 字符串。
- **在哪里**：`utils/auth.ts` 的 `parseOtpAuthUrl` / `isOtpAuthUrl` / `generateOtpAuthUrl`。
- **典型用法**：从 GitHub 设置页 QR 解码出来的字符串 → `parseOtpAuthUrl(data)` → `OtpAuthConfig`。
- **边界**：
  - URL 必须以 `otpauth://` 开头且包含 `secret=`，否则 `isOtpAuthUrl` 返回 false。
  - `parseOtpAuthUrl` 抛异常时调用方负责降级（toast / 重试）。
  - **algorithm 归一不变式**：otplib v12 的 `Authenticator.generate()` 要求
    algorithm 严格等于 `"sha1" | "sha256" | "sha512"`（小写）。OTPAuth 规范
    写的是大写 `SHA1`，因此 `generateOtp()` 内部必须经 `toOtpHashAlgorithm()`
    归一，**缺省回退 `"sha1"`，绝不能传 `undefined`**。违反此不变式会导致
    popup 一有数据就白屏（见 commit `496abe9`）。

### 2. OtpItem（= `DataProps`）

- **是什么**：单条账户（issuer + account + secret + 时间参数 + 元数据），扩展自 `OtpAuthConfig`。
- **在哪里**：`utils/constant.ts` 的 `DataProps`；渲染列表在 `components/home/list.tsx`。
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

### 3. OtpStore

- **是什么**：chrome.storage 中所有 OTP 条目的**单一数据源**（`storage.defineItem<DataProps[]>(DATA_KEY, { fallback: [] })`）。
- **在哪里**：`utils/storage.ts` 的 `dataStore`。
- **典型用法**：永远不直接调用 `dataStore.setValue`，只通过 `OtpProvider` 派发的 mutators。
- **边界**：
  - 数据存 `sync:` 区（与 Plasmo 旧版兼容，跨设备同步）。
  - 单条上限 8KB（10 条账户约 1–2KB，典型足够）。
  - 写入前必须经过 `addOtp` 纯函数处理去重 / 软删合并（见 ADR-0001）。

### 4. OtpProvider

- **是什么**：React Context，把 OtpStore 暴露为 `items` + `mutators`。挂在 popup root 与 settings root。
- **在哪里**：`state/otp-store.tsx`。
- **典型用法**：
  ```tsx
  <OtpProvider>
    <Main />
  </OtpProvider>
  ```
- **边界**：
  - Provider 内部 watch + setState，所有订阅者同步重渲染。
  - **不在 content script 内使用**（content 没有 React 树）；content 直接读 `dataStore`。

### 5. OtpMutators

- **是什么**：9 个变更原语的接口，封装去重 / 软删合并语义。
- **在哪里**：`state/otp-store.tsx` 的 `OtpMutators` 接口。
- **典型用法**：
  ```tsx
  const { add, update, softDelete, hardDelete, pin, exists } = useOtpMutators()
  ```
- **边界**：
  - 所有写入经过 mutators；不允许直接 `setValue`。
  - `exists()` 必须先于 `add()` 调用以避免重复提示不一致。
  - 不写测试时不要拆分 mutators；9 条原子操作是经实测收敛的边界。

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

### 7. SiteAdapter

- **是什么**：单个站点对内容脚本行为的**声明式描述**（路由判别、DOM 选择器、account 抽取）。
- **在哪里**：`features/site-content/site-adapter.ts` 的 `SiteAdapter` 接口；两个实例在 `adapters/{github,npm}.ts`。
- **典型用法**：
  ```ts
  export const githubAdapter: SiteAdapter = { name, issuer, isFillOTPPage, ... }
  ```
- **边界**：
  - 一个站点一个 adapter，不在一个文件里塞两个站点。
  - `issuer` 必须匹配 `Issuers` 枚举的字面量值（`"NPM"` 或 `"GitHub"`，注意 GitHub 历史大小写）。
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
- **在哪里**：`utils/css-portal.ts` 的 `mountStyle`。
- **典型用法**：
  ```ts
  mountStyle(`${CSS_PREFIX}-selection-style`, `...CSS...`)
  ```
- **边界**：
  - `CSS_PREFIX = "g2fa-portal"`（构建时常量），所有特性共用一个 host。
  - 重复 `mountStyle` 调用是安全的（dedupe by key）。
  - **不要**直接在页面 `appendChild(<style>)`。

### 12. Layout Container

- **是什么**：popup 的两种视觉容器：`PHONE`（daisyUI `mockup-phone`）和 `DEFAULT`（标准 350×600）。
- **在哪里**：`components/home/container/{index,phone}.tsx`；通过 `ContainerType` 枚举切换。
- **典型用法**：`<Container>{children}</Container>`；`useModalWidth()` 根据 `containerType` 返回对话框宽度。
- **边界**：
  - `Container` 是 React 组件名（DOM 容器），与"容器布局"概念同名但与 `chrome.tabs` 等无关。
  - 不要把它与 `ContainerType` 枚举混淆。

### 13. Message Protocol（候选 B 引入）

- **是什么**：popup ↔ content ↔ background 之间结构化消息的**类型注册表**。
- **在哪里**：`features/messaging/messageMap.ts`（候选 B 落点）。
- **典型用法**：
  ```ts
  type Map = {
    AUTOSCAN: { in: void; out: { success: boolean; data?: string; error?: string } }
    CAPTURE_SCREENSHOT: { in: void; out: { success: boolean; image?: string } }
  }
  sendSiteAction<Map, 'AUTOSCAN'>('AUTOSCAN')
  ```
- **边界**：
  - 任何新 action 必须在 `MessageMap` 注册；否则 `sendSiteAction<T>` 编译失败。
  - background 仍是裸回调（生命周期简单），但 payload 形状仍走 Map 类型。

### 14. Toast / message.ts

- **是什么**：popup 用的固定位 toast 通知，content script **不调用**。
- **在哪里**：`utils/message.ts`。
- **典型用法**：`message.success("已复制")`；`message.error("失败")`。
- **边界**：
  - 不在 popup 外（content、background、settings 独立页）调用。
  - 进程级 DOM 元素，多个 toast 叠加会自动堆叠。

## 命名冲突表（不要混）

| 易混 | 含义 |
|---|---|
| `Container` 组件 vs `ContainerType` 枚举 vs `useModalWidth` 中的"容器宽度" | 组件渲染外层；枚举是 PHONE/DEFAULT；宽度是 Modal 子属性 |
| `OtpForm`（=表单组件）vs `Form`（HTMLFormElement）| 一个组件、一个 DOM 类型 |
| `SiteAdapter`（站点描述）vs `Adapter`（react 适配器模式）| 上下文里没有第二个 Adapter，别瞎联想 |
| `global.content` vs `github.content` vs `npm.content` | global 是 <all_urls>，两个站点的内容脚本只跑对应 host |
| `chrome.*` vs `browser.*` | WXT 同时暴露两者；统一用 `browser.*`（commit history 已迁移） |

## 版本

- v2.0.0（迁移期 Plasmo → WXT）
- 词汇表会随每个 S 系列 commit 更新。

## 维护

新增领域名词时：

1. 在本文加词条（4 要素）。
2. 如果它取代了一个旧名词，把旧词条移到 `## 已弃用` 区，注明被哪个 PR 取代。
3. 同一概念如果有两种实现（如 `saveOTP` 与 `addOtpItem`），必须收敛到一个，不留双名。
