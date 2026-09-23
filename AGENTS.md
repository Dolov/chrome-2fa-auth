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
| `utils/libs/` | 核心算法内联实现（HMAC / Base32 / OTPAuth URL / TOTP，ADR-0006） |

业务逻辑按**执行环境**分到 `features/{page-ui,ui-state,otp-store,site-content}/` + `utils/` + `utils/libs/`。
目录落点由执行环境决定，不是按领域——改动前先看 [CONTEXT.md 分层不变式](./CONTEXT.md#分层不变式执行环境)。

## 硬规则（先读这 10 条）

1. **content script 的 barrel 必须 React-free**。项目未声明 `sideEffects: false`，一行 React 导出 +6.4 KB / content bundle。详见 [CONTEXT.md 硬规则 1](./CONTEXT.md#硬规则-1barrel-不变式)。
2. **content bundle 预算**：`global.js` < 200 KB，`github.js` / `npm.js` < 620 KB。改动 content 依赖后跑 `pnpm build` 对比 `content-scripts/*.js`。
3. **OTP 渲染收 `config` 而非 `secret`**：`digits` / `period` / `algorithm` 必须从存储条目透传到 `generateOtp`（[ADR-0008](./docs/adr/0008-otp-generation-params-passthrough.md)）。丢字段 = 该账户永远显示错的码。
4. **OTPAuth `algorithm` 必须经 `toHmacAlgorithm()` 归一**：规范是大写 `SHA1`，`generateOtp` 要求小写 `sha1|sha256|sha512`。缺省回退 `"sha1"`，绝不能传 `undefined`。
5. **不引入位图品牌素材**：用 [`components/ui/icon.tsx`](./components/ui/icon.tsx) 的矢量图标，需要新品牌标识先查这个文件。
6. **核心算法的内联实现必须落 `utils/libs/`**：HMAC / Base32 / OTPAuth URL / TOTP 是项目长期策略（[ADR-0006](./docs/adr/0006-inline-hmac-replaces-otplib.md)），目的是剥离 otplib 及其 Node 垫片（实测 442.5 KB × 3 个 bundle）。**新增第三方库前先问「能否内联 + 黑盒 e2e 兜底」；一旦内联，统一放 `utils/libs/`，不要散落到 `utils/`**。正确性兜底：`e2e/specs/05-otp.spec.ts` 用独立 otplib 算期望值做黑盒断言。
7. **零硬编码文案**：所有面向用户的字符串一律走 `i18n.t("key")`（来自 `#i18n`，即 WXT 官方 [`@wxt-dev/i18n`](./docs/adr/0009-i18n-via-wxt-dev-i18n.md)）。key 写进 `locales/<lang>.json`（`en` / `zh_CN` / `zh_TW` / `ja` / `ko` / `es`），**新增 key 必须 6 个 locale 同步**。`en` 是 `default_locale`，也是**类型与占位符的唯一来源**——它必须带 `$1..$9`，否则类型层不允许传参；替换值必须传数组（`i18n.t(k, [v])`，裸数字会被当成复数计数）。改完跑 `pnpm build`。语言跟随浏览器 UI 语言，**运行时切语言不支持**（`chrome.i18n` 固有限制，见 ADR-0009）。
8. **content bundle 隔离**：从 `entrypoints/*.content/` 入口静态可达的依赖链**只**允许纯 DOM / I/O 工具、数据契约、以及通过 dynamic import 拆 chunk 的重 lib；**不能**包含 popup/settings 专属代码（React 组件、popup-only utils、UI 状态）。判断方式：从 content 入口追溯 import 树，谁把 React 或 popup-only 模块拉进来就重构或拆 dynamic import。**dead code（无 import 者的模块）立刻删除**——未来某次误 import 会让死代码复活并污染 content bundle。复用于 content 的 feature 入口（如 `features/otp-intake/index.ts`）必须在文件头注释里显式声明「本 barrel 必须 React-free」，让 reviewer 一眼看见。
9. **注入 UI 的 CSS_PREFIX + z-index 命名约定**（[css-portal.ts](./features/page-ui/css-portal.ts)）：content script 插入宿主页面的 DOM/类名/动画名/data 属性**全部**走 [`CSS_PREFIX`](./features/page-ui/css-portal.ts) 常量 (`g2fa-portal`)，禁止任何文件硬编码 `g2fa-portal-*` 字面量（除 css-portal.ts 内的 `PREFIX` 定义本身）。具体三项：
   - **类名**：`${CSS_PREFIX}-<role>`——`<role>` 描述用途（callout / selection-box / toast / screenshot-overlay），**不**描述视觉（rainbow / gradient）。
   - **mountStyle dedup key**：`${CSS_PREFIX}-<role>-style`。
   - **z-index**：必须从 `ContentLayer` (`Background` / `Surface`) 选；禁止写 `contentBaseZindex + N` 或裸数字（历史 bug：旧 `createSelectionBox` 默认 `zIndex = 9999` 曾与 `contentBaseZindex + 1` 跨数量级撞车）。
   - 同一层（Surface）的多元素靠 DOM 顺序决定谁画在上面；**真需要第三层时再开** `ContentLayer.Modal`，不要预留 Reserved 占位。
10. **`mountStyle` 注入的 CSS 必须是顶层规则**（[toast.ts](./features/page-ui/toast.ts)）：禁止把带 selector 的 CSS 字符串内插到另一个规则块内部。历史回归：`toast.ts::buildCss` 把 `kindRules` 拼到 `.g2fa-portal-toast { … }` 块**内**，Chrome (≥112) 原生 CSS 嵌套把内层 selector 展开成后代选择器（`.g2fa-portal-toast .g2fa-portal-toast[data-testid-toast-kind="info"]`），永远命中不到节点自身 → `background-color` 整条丢失，视觉表现「白字无背景 = toast 没样式」。
   - **拒绝**形态：`.foo { …; .foo[data-x]{…}; }`——selector 必须站在顶层。
   - **正确**形态：所有 selector 作为顶层规则并列；`${kindRules}` 插在 `}` **之后**、`${CSS_PREFIX}-toast[data-toast-state="visible"] { … }` 之前。
   - 验收：DevTools 找到 `<style id="g2fa-portal-style-sheet">`，肉眼复核规则都在顶层。一旦「属性已设置但 computed style 没生效」，先怀疑嵌套。

## 测试

- 黑盒 E2E（89 条 spec 索引）：[`e2e/SPECS.md`](./e2e/SPECS.md)
- 基建踩坑：[`e2e/TROUBLESHOOTING.md`](./e2e/TROUBLESHOOTING.md)
- 约定：不写单元测试
- 跑 E2E 的时机：**大改动**或用户明确要求时跑全量；平时只跑改动覆盖到的 spec。
- 断言策略（**只关注功能**，不测文案 / 颜色）：[`e2e/SPECS.md` §2](./e2e/SPECS.md)
- 工作状态：[`docs/TODO.md`](./docs/TODO.md)（按需读取，不进 AGENTS.md 上下文）