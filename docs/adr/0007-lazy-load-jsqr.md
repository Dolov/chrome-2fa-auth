# ADR-0007: jsQR 按需加载

> 状态：部分采纳（popup 侧已完成；content 侧待前置测试补齐）

## 决策

**统一把 `jsQR` 改为动态 `import()`，让各产物自行决定能否拆包。**

`utils/qr-decode.ts` 内 jsQR 的加载收敛到一个 memoized 的 `loadDecoder()`：

- 四个导出函数**本来就是 Promise 接口**，改成异步加载对调用方零影响。
- 加载失败时清空缓存，让下次调用可重试而不是永久失败。

### popup / settings：已完成，真正生效

ESM 页面，`import()` 被拆成独立 chunk（`chunks/jsQR-<hash>.js`），触发前不下载。

- 共享 chunk **363.5 → 236.2 KB**（下载总量不变，少的是**弹窗启动时的解析量**）。
- 顺带修掉一个既有问题：`components/home/upload-modal.tsx` 里原本就有
  `await import("~/utils/qr-decode")` 的懒加载意图，但因为 `qr-decode.ts` 同时被
  `features/otp-intake/intake.ts` 静态 import，bundler 报
  `[INEFFECTIVE_DYNAMIC_IMPORT]` 并原样内联 —— 那个懒加载从来没生效过。
  把动态边界从「模块级」下移到「jsQR 这一层」之后才真正拆开。

### content script：IIFE 导致无法拆包，本 ADR 不解决

content script 产物是 IIFE，Rolldown 只能内联动态 import，体积不变。
即 `global.js` 仍是 149.6 KB、`github.js` / `npm.js` 仍是 ~159.5 KB。

**剩下 382 KB 需要改造扫描链路**——AUTOSCAN / MANUAL_SCREENSHOT 两条链路的 E2E
（清单 42-44 / 50-55）尚未编写，在无验收网的前提下重组消息流属于「看不见的管线改动」。

## 后果

- popup 启动时少解析/求值 127 KB（363.5 → 236.2 KB 主包）；jsQR 移到
  `chunks/jsQR-<hash>.js`（126.9 KB），只在上传/扫描时拉取。
- **下载体积不变**：拆包只是搬家，包内总字节几乎相同（约 +0.7 KB 的 runtime chunk）。
  本次是启动/解析优化，不是体积优化 —— 不要把它计入"总体积下降"。
- content 侧体积不变。`global.js` 149.6 KB 中 85% 仍是 jsQR。

## 备选方案（针对 content 侧，均未采纳）

| 方案 | 能修哪个 bundle | 优点 | 缺点 / 风险 |
|---|---|---|---|
| **A. 手动拆 chunk + 运行时 import** | `global` / `github` / `npm` | 只动 `qr-decode` + 构建配置，不碰业务链路 | 依赖 bundler 的 chunk 命名与 ESM 格式细节，脆弱；`web_accessible_resources` 要手写（WXT 不会自动加），清单与产物有漂移风险；需要新 E2E 兜底 |
| **B. `global.content` 改按需注入** | `global` | **收益最大**：从「每页 149.6 KB」变成零；顺带不再需要 `<all_urls>` content script（只留 `activeTab` + `scripting`），是权限/隐私层面的改善 | 要处理注入时机与幂等（重复注入会重复注册监听器）；需确认 `canInjectContentScript` 语义一致；覆盖 AUTOSCAN + MANUAL_SCREENSHOT 两条链路 |
| **C. 解码搬到 background SW** | `global` / `github` / `npm` | content 侧彻底无 jsQR | `AUTOSCAN` 要把每个候选 canvas/img 的 `ImageData` 传过去，大图可达数 MB，消息开销与内存峰值不可接受；`MANUAL_SCREENSHOT` 只传选区（小）是可行的，但只解决一半 |

**建议顺序**：先补 F7 的自动扫描（42-44）与手动截图（50-55）验收网，再评估 **B**
（收益最大且附带权限收益）。A 只在不愿动链路时作为退路。
注意 `github.js` / `npm.js` 承载站点自动填充，必须是常驻 content script，
B 对它们无效 —— 那两个 bundle 只能走 A 或 C。

工作状态见 `AGENTS.md` 待办。