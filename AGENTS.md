# AGENTS.md

> 本文件定义项目意图与重构路线，供 AI 助手与协作者对齐。

## 必读

> 进入本仓库后，**先读 [`CONTEXT.md`](./CONTEXT.md)** 了解领域词汇（SiteAdapter / OtpMutators / Intake / CSS Portal 等）。架构评审、新增功能、命名冲突都从这里查。

## 重构意图

当前项目（`2fa-auth-otp-authenticator` v1.7.0）基于 **Plasmo 0.88.0 + React 18 + MV3 + daisyUI 4**，约 3500 行 TS/TSX，无任何测试，长期靠手工 QA 与用户反馈维护。

**目标**：迁移到 **WXT**（Vite-based、MV3 一等公民、维护活跃）。

**核心约束**：**不破坏现有功能**。重构完成后，1.7.0 的所有用户路径必须行为一致。

## 分支策略

| 分支 | 角色 |
|---|---|
| `v2` | 冻结归档当前 Plasmo 版本（origin/v2） |
| `main` | 上游稳定（origin/main） |
| `dev` | 日常重构基线（origin/dev） |
| `feat/*` | 子特性分支，从 `dev` 拉 |

## 迁移路线

```
feat/test-e2e   → E2E 全绿 → feat/migrate-wxt → 阶段化迁移 → release
```

## 第一步：补全黑盒 E2E（当前进行中）

**目的**：先用测试钉死现状，迁移时同一份 spec 不改一行就能复用。

**原则：黑盒**。E2E 不依赖、不 import 项目内部代码，仅通过：

- 加载 unpacked 扩展（`.output/chrome-mv3`）
- 模拟用户操作（点按钮、输文本）
- 断言 DOM、剪贴板、`chrome.storage`、扩展 ID 注入
- TOTP 用独立 `otplib` 算期望值对比，不调用项目 `utils/totp.ts`
  （E2E 侧类型也本地结构化声明，不 import 项目内任何代码）

**真实 / Mock 边界**：

- ✅ **真实**：浏览器（Playwright bundled chromium）、扩展加载、MV3 SW、`chrome.*` API、DOM 交互、chrome.storage 持久化、Content Script 注入、OTP 计算、**GitHub / NPM 第三方页面（用专用 test 账号 + TOTP secret）**
- 🔶 **Mock**：仅 QR 扫描（用 `qrcode` 库生成 PNG 测试 4 条路径，不接真手机摄像头）

**凭证管理**：GitHub / NPM test 账号写入 `e2e/.env.e2e`（gitignore），跑 spec 前由 `e2e/setup/reset-2fa.ts` 自动 disable 现有 2FA，保证 idempotent。

**不写单元测试**。

**栈**：`playwright` + `@playwright/test`，`otplib` 仅用于断言。

**范围**（草案，落地前需复核代码分支密度）：

- P0（5）：popup 加载、手动添加、OTP 刷新、复制 OTP、重启持久化
- P1（7）：QR 上传、GitHub/NPM 自动填充、recovery codes、设置页（导出/导入/主题/语言）
- P2（5）：QR 摄像头/选区、错误 secret、重名检测

## 目录分层（改文件前必读）

生产代码按**执行环境**分层，详见 `CONTEXT.md` 的 `## 分层不变式（执行环境）` 与
[`docs/adr/0004`](./docs/adr/0004-execution-environment-layering.md)。速查：

| 目录 | 定位 | 硬性禁止 |
|---|---|---|
| `utils/` | 双端纯原语（仅 7 个文件） | import React；注入持久 DOM；调用扩展 API；持有业务状态 |
| `features/page-ui/` | 宿主页面 DOM/CSS 注入 | import React |
| `features/ui-state/` | React hooks（theme / storage / modal） | 被 content script import |
| `features/otp-store/` | `store.ts` 存储层 + `context.tsx` 唯一 React 入口 | content 侧 re-export `dataStore`；被 content 绕过 mutators |
| `features/site-content/dom/` | content-only 的 SPA 等待 / 路由匹配 | 被 popup 或 settings import |

两条硬规则：

1. **content script 会 import 的 barrel 必须 React-free**（`features/otp-intake`、`features/messaging`）。
   项目没有 `sideEffects: false`，Rollup 无法 tree-shake，barrel 里一行 React 导出就会让每个 content bundle +6.4 KB。
2. **content bundle 预算**：`global.js` < 200 KB，`github.js` / `npm.js` < 620 KB。
   改动 content 侧依赖后必须 `pnpm build` 对比 `content-scripts/*.js`。

## 验收标准

E2E 跑通 + CI 全绿后，才允许开始 WXT 迁移。迁移过程中每完成一个模块，跑同一份 spec，必须 0 regression。

## 待办

- [x] 装 playwright + 跑通 hello-popup 测试
- [x] 写 P0 5 个 spec（不含第三方）—— F1 popup 加载/渲染 5 条全绿
- [x] WXT 迁移后的架构重构（S0-S8：类型修复 / CONTEXT.md / OTP intake /
      消息协议 / auth 纯化 / useModalStack / kebab 命名），E2E 8/8 全绿
- [ ] 用户提供 GitHub / NPM test 账号后，写 F8 / F9 真实集成 spec
- [ ] 写 F7 QR 扫描剩余路径：自动扫描 42-44 / 粘贴 47 / 上传缺 account 48 /
      重名 49 / 手动截图 50-55（**这是 content 侧 jsQR 改造的前置条件**，ADR-0007）
- [ ] F1-F6 + F10-F12 主体 spec 全绿
- [ ] CI 接入（GitHub Actions secrets 注入 test 账号）
- [ ] 复核 spec 数是否覆盖真实分支密度（必要时增减）
- [x] 目录重组：`utils/` 收敛为 7 个双端纯原语，其余按执行环境下沉到 `features/*`
      （ADR-0004）。实测总产物 3.44 MB → 2.96 MB，`global.content` 608 → 156 KB，
      三个 content bundle 中 React 痕迹归零；E2E 8/8 全绿
- [x] TOTP 去依赖：`utils/totp.ts` 改为内联 HMAC（`utils/hmac.ts` +
      `utils/base32.ts`），逐条复刻 otplib 语义，移除 `vite-plugin-node-polyfills`
      （ADR-0006）。开发期 18 万项对拍 0 失败；实测原始 2.96 → 1.07 MB、
      下载 1.11 → 0.34 MB，`github.js` 605 → 159 KB；E2E 12/12 全绿
- [x] **【既有 bug】** `generateOtp` 的 `algorithm/digits/period` 被丢弃（ADR-0008）——
      三类非默认配置的账户**永远显示错误的码**，content 侧还会把错的码填进
      目标网站。修复前 3 条新用例均失败且都显示同一个 SHA1/6/30 值；
      修复后同一份 spec 8/8 通过。顺带修掉 `progress max` 硬编码 30，
      并为导入的脏数据（`digits=999` 会渲染 999 字符）加防御性归一；E2E 20/20
- [ ] 补 F8/F9 后加一条「8 位码账户的自动填充值正确」——
      content 侧 `startOtpMessageUpdater` 的签名变更目前只有类型检查兜底
- [ ] `type=hotp` 与 `algorithm=MD5` 仍不支持（已在代码注释与 ADR-0008 显式声明）。
      HOTP 需要计数器递增策略与 UI，属独立特性
- [ ] `OtpText` 的位数分组写死 3+3，8 位码会显示成 3+5（视觉细节，无测试兜底）
- [x] jsQR 按需加载（popup 侧）：`utils/qr-decode.ts` 的 jsQR 改为动态 `import()`，
      顺带修掉 `upload-modal.tsx` 里从未生效的 `[INEFFECTIVE_DYNAMIC_IMPORT]`。
      popup 共享 chunk 363.5 → 236.2 KB；新增 F7 上传路径验收网 3 条 +
      懒加载断言 1 条，并做变异测试验证其区分力（ADR-0007）
- [ ] popup / settings 共享 chunk 236 KB（react-dom + qrcode.react + lucide），
      以 modulepreload 在打开 popup 时拉取；另有一个 152 KB 的 `assets/style-*.css`。
      下一步看 `assets/style-*.css` 的 32 套 daisyUI 主题（仅 +35 KB，优先级低）
- [ ] 收敛 `saveOTP` 与 `addOtp` 两个 OTP 合并入口（契约不同：前者收带 `id` 的
      `DataProps`，后者收 `Omit<DataProps,"id">`）。**前置条件**：先补 F5
      recovery code 保存路径的 E2E spec —— 当前无覆盖，不改语义先改结构等于裸奔
- [x] 去位图化：删掉 2 张 PNG 贴纸 + 4 个零引用死资源，elegant favicon 改用
      `icon.tsx` 已有的品牌 SVG（ADR-0005）。实测原始 2.96 → 2.44 MB、
      下载 1.11 → 0.71 MB；E2E 8/8 全绿
- [ ] Favicon 渲染无自动化断言（`e2e/SPECS.md` 第 81 行尚未写成 spec），
      写 F1-F6 主体 spec 时补上
- [ ] F5 剩余 case：32（每秒刷新）/ 33（点击复制）/ 35（进度条颜色）
- [ ] 待评：移除已无必要的 `web_accessible_resources: assets/*`（ADR-0005 待办 4）
- [ ] 待评：移除已无必要的 `web_accessible_resources: assets/*`（ADR-0005 待办 4）
- [ ] 待评：**content 侧 jsQR 仍占 382 KB**（`global.js` 85% / `github`·`npm` 各 80%）。
      产物是 IIFE 无法拆包，需改造扫描链路：方案 B（`global.content` 按需注入，
      每页 −127 KB + 权限收紧）优先，方案 A（手动拆 chunk）作退路。
      **前置：先补 F7 42-44 / 50-55**（ADR-0007 待办）