# AGENTS.md

> Chrome 扩展：TOTP 双因素验证器，GitHub / NPM 站点自动填充 + QR 扫描录入。
> WXT + React 18 + daisyUI + MV3。

## 入口

| 路径 | 职责 |
|---|---|
| `entrypoints/popup/` | 主页 React UI（列表 + CRUD + 模态框） |
| `entrypoints/settings/` | 主题 / 布局偏好 |
| `entrypoints/background.ts` | 右键菜单 + 截图桥 |
| `entrypoints/global.content/` | `<all_urls>` 通用工具：截图 / 扫描 |
| `entrypoints/{github,npm}.content/` | 站点自动填充（站点专属） |

业务逻辑按**执行环境**分到 `features/{page-ui,ui-state,otp-store,site-content}/` + `utils/`。
目录落点由执行环境决定，不是按领域——改动前先看 [CONTEXT.md 分层不变式](./CONTEXT.md#分层不变式执行环境)。

## 硬规则（先读这 5 条）

1. **content script 的 barrel 必须 React-free**。项目未声明 `sideEffects: false`，一行 React 导出 +6.4 KB / content bundle。详见 [CONTEXT.md 硬规则 1](./CONTEXT.md#硬规则-1barrel-不变式)。
2. **content bundle 预算**：`global.js` < 200 KB，`github.js` / `npm.js` < 620 KB。改动 content 依赖后跑 `pnpm build` 对比 `content-scripts/*.js`。
3. **OTP 渲染收 `config` 而非 `secret`**：`digits` / `period` / `algorithm` 必须从存储条目透传到 `generateOtp`（[ADR-0008](./docs/adr/0008-otp-generation-params-passthrough.md)）。丢字段 = 该账户永远显示错的码。
4. **OTPAuth `algorithm` 必须经 `toHmacAlgorithm()` 归一**：规范是大写 `SHA1`，`generateOtp` 要求小写 `sha1|sha256|sha512`。缺省回退 `"sha1"`，绝不能传 `undefined`。
5. **不引入位图品牌素材**：用 [`components/ui/icon.tsx`](./components/ui/icon.tsx) 的矢量图标，需要新品牌标识先查这个文件。

## 测试

- 黑盒 E2E（93 条 spec 索引）：[`e2e/SPECS.md`](./e2e/SPECS.md)
- 基建踩坑：[`e2e/TROUBLESHOOTING.md`](./e2e/TROUBLESHOOTING.md)
- 约定：不写单元测试
- 工作状态：[`docs/TODO.md`](./docs/TODO.md)（按需读取，不进 AGENTS.md 上下文）