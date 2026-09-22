# 踩坑笔记

> 记录 E2E 基建过程中踩过的坑，避免重复。
> 每条都标注：现象 / 根因 / 解决。

## 1. `channel: 'chrome'` 系统 Chrome 不加载扩展

**现象**：`--load-extension=...` 加载后，扩展不生效；`context.serviceWorkers()` 空；SW target 不在 CDP `Target.getTargets` 里；popup URL 显示 `chrome-error://chromewebdata/`。

**根因**：[Playwright 官方文档](https://playwright.dev/docs/chrome-extensions) 明确说：
> Google Chrome and Microsoft Edge removed the command-line flags needed to side-load extensions, so use **Chromium that comes bundled with Playwright**.

**解决**：`channel: 'chromium'`（**必须**，不能 fallback 到 'chrome'）。`global-setup` 里跑 `pnpm exec playwright install chromium` 装 Playwright bundled chromium（~94MB）。

```ts
// ❌ 失败：SW 不启动，popup 被 Chrome 阻止
channel: "chrome"

// ✅ 官方推荐
channel: "chromium"
```

## 2. MV3 SW 不 eager 启动，`waitForEvent('serviceworker')` 看似 timeout

**现象**：fixtures 里直接 `waitForEvent("serviceworker")` 30s 超时。

**根因**：MV3 SW 是 event-driven，Chrome 加载扩展时**不启动** SW。要等真实事件触发（chrome.runtime.onMessage、alarm、tabs.onCreated 等）。

**解决**：fixture 写法按官方文档，**SW 启动依赖被测项目本身的触发**。本项目 `background.ts` 顶层调用 `chrome.contextMenus.create` 会立即触发 SW 启动，所以 `serviceWorkers()` 或 `waitForEvent('serviceworker')` 都能拿到。

```ts
let [serviceWorker] = context.serviceWorkers()
if (!serviceWorker) {
  serviceWorker = await context.waitForEvent("serviceworker")
}
const id = serviceWorker.url().split("/")[2]
```

> 如果被测扩展的 SW 顶层没有 trigger，需要测试代码主动发消息（`page.evaluate(() => chrome.runtime.sendMessage(...))`）来启动 SW。

## 3. 不要预测 extension ID

**现象**：用 `SHA256(extension_path)[:16].hex` 预测的 ID 跟 Chrome 给的 ID 不一致。

**根因**：Chrome unpacked extension ID 算法**不公开**，是基于 manifest public key + 内部 salt，不是简单 path hash。社区尝试过 SHA256 / SHA1 / MD5 / file URL / 大小写变换，全失败。

**解决**：永远不要预测。**从 SW URL 反推**：`new URL(sw.url()).host`。

## 4. `page.goto('chrome-extension://...')` 在系统 Chrome 下被拦截

**现象**：`net::ERR_BLOCKED_BY_CLIENT`。

**根因**：同 #1，Chrome 系统版本的安全策略禁止非 chrome-extension origin 导航。

**解决**：用 `channel: 'chromium'`（Playwright bundled chromium 无此限制），可直接 `page.goto`。

## 5. Chrome extension ID 字符集

**现象**：regex `/^[a-f0-9]{32}$/` 不匹配真实 ID（如 `piaafndnfibjmgkojohbfkjdklgkonc`）。

**根因**：Chrome extension ID 是 base16 编码 128 bit，但**字母只到 p**（a-p），不是 hex 的 a-f。

**解决**：regex 用 `/^[a-p]{32}$/`，或更宽松 `/^[a-z]{32}$/`（包含非 a-p 的边角情况）。

## 6. `popup fixture` 不能用 Playwright 内置 `context`

**现象**：`base.extend({ context: async ... }, { scope: 'worker' })` 报错 "Fixture 'context' has already been registered"。

**根因**：Playwright 内置 `context` fixture 已是 test scope，**不允许 override 为 worker scope**。

**解决**：改名为 `sharedContext`，其他 fixture 通过 `sharedContext: context` 解构引用。

```ts
// ❌ 失败
base.extend<{}, { context: BrowserContext }>({
  context: [..., { scope: 'worker' }]
})

// ✅
base.extend<{...}, { sharedContext: BrowserContext }>({
  sharedContext: [..., { scope: 'worker' }]
})
```

## 7. Playwright `globalSetup` 必须 `export default` 单个函数

**现象**：`Error: e2e/global-setup.ts: file must export a single function.`

**根因**：Playwright 1.x 要求 `globalSetup` 导出 default async 函数，不能在顶层调函数。

**解决**：
```ts
// ❌ 失败
function main() { ... }
main()

// ✅
export default async function globalSetup() { ... }
```

## 8. pnpm 11 不再读 `package.json` 里的 `pnpm.onlyBuiltDependencies`

**现象**：即使配 `"pnpm": { "onlyBuiltDependencies": [...] }`，build scripts 仍被 ignore。

**根因**：pnpm 11 把 settings 从 `package.json` 的 `pnpm` 嵌套对象移到 `pnpm-workspace.yaml`（[官方 changelog](https://pnpm.io/settings)）。

**解决**：在 `pnpm-workspace.yaml`（不是 `package.json`）声明：
```yaml
packages:
  - .
onlyBuiltDependencies:
  - sharp
  - "@parcel/watcher"
  - "@swc/core"
  - esbuild
  - lmdb
  - msgpackr-extract
```