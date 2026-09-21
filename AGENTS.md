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

- 加载 unpacked 扩展（`build/chrome-mv3`）
- 模拟用户操作（点按钮、输文本）
- 断言 DOM、剪贴板、`chrome.storage`、扩展 ID 注入
- TOTP 用独立 `otplib` 算期望值对比，不调用项目 `utils/auth.ts`

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

## 验收标准

E2E 跑通 + CI 全绿后，才允许开始 WXT 迁移。迁移过程中每完成一个模块，跑同一份 spec，必须 0 regression。

## 待办

- [x] 装 playwright + 跑通 hello-popup 测试
- [ ] 写 P0 5 个 spec（不含第三方）
- [ ] 用户提供 GitHub / NPM test 账号后，写 F8 / F9 真实集成 spec
- [ ] 写 F7 QR 扫描 4 条路径（mock 摄像头）
- [ ] F1-F6 + F10-F12 主体 spec 全绿
- [ ] CI 接入（GitHub Actions secrets 注入 test 账号）
- [ ] 复核 spec 数是否覆盖真实分支密度（必要时增减）