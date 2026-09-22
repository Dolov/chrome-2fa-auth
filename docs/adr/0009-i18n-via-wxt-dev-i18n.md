# ADR-0009: 用 WXT 官方 `@wxt-dev/i18n`，并放弃「扩展内切换语言」

> 状态：已采纳

## 背景

popup / settings / background / content 里所有面向用户的文案原本是硬编码中文。
要支持多语言，且**不能再出现硬编码**。

调研后确认三件事：

1. `chrome.i18n` 只有 `getMessage`，**没有任何覆盖 locale 的 API**。
2. WXT 官方文档把这个限制写死了两次：
   - `wxt.dev/guide/essentials/i18n.html`：*"there is one major downside to the vanilla API
     **and any packages built on top of it**: Language cannot be changed without changing your
     browser/system language"*
   - `wxt.dev/i18n`：*"Like the `browser.i18n` API, to change the language, **users must change
     the browser's language**"*
3. WXT 对「要能切语言」只指了一个方向：换成 i18next / vue-i18n 这类**非扩展专用**库。

## 决策

### 1. 采用 WXT 官方 `@wxt-dev/i18n`

它是 `browser.i18n` 的**类型安全薄封装**，不是替代实现：

| 选它，而不是手写 wrapper | 收益 |
|---|---|
| key 类型安全 | key 写错 → **编译期报错**（手写 wrapper 只能静默回退成 key 名） |
| 复数形式 / 具名占位符 `{name}` | 免自造 |
| 生成 `_locales` 产物 | 不用手写 `__MSG_*__` 之外的 manifest 胶水 |
| 不把翻译打进每个 entrypoint | 同步加载，content bundle 只多 ~1 KB |

locale 文件从 `public/_locales/<lang>/messages.json` 迁到 **`locales/<lang>.json`**
（模块的 `build:publicAssets` hook 再生成回 `_locales`）。格式不变，标准 messages
格式原样可用，`description` 保留。

### 2. 明确放弃「扩展内切换语言」

这是**接受上游限制**，不是遗漏：

- 想要"设置里选语言"就必须走 i18next 一类，代价是**丢掉 manifest / CSS 本地化、
  失去同步加载、翻译被打进多个 entrypoint**。
- 后者直接撞硬规则 2 的 content bundle 预算（`global.js` < 200 KB，当前 ~154 KB），
  也与 ADR-0006「剥离第三方库 + 内联实现」的取向相反。
- 所以**不做**。语言跟随浏览器 UI 语言；用户要换语言就换浏览器语言，
  或在测试时用 `--lang=ko` + 独立 `--user-data-dir`。

### 3. 只保留一个手写件：`utils/document-lang.ts`

文案统一走 `#i18n` 的 `i18n.t()`；仅 `<html lang>` 需要在运行时对齐 UI 语言
（静态 `lang="en"` 只是 fallback，否则读屏语言错配、选字体/断行规则用错）。

## 踩坑记录

1. **popup 的 `<title>` 会覆盖 manifest 的 `action.default_title`。**
   WXT 把 popup 入口的 `<title>` 提升为 `action.default_title`，且展开顺序上
   晚于 `wxt.config.ts` 的 `manifest.action`（`...manifest[actionKey], ...options`），
   所以配置里写 `default_title` 是**死代码**。已删掉两者 → manifest 不带
   `default_title` → Chrome 回退到已本地化的 `manifest.name`。`entrypoints/popup/index.html`
   里留了注释防止回加。

2. **WXT 自动导入会扫到项目里叫 `i18n` 的导出。**
   原先手写的 `utils/i18n.ts` 导出 `i18n`，与模块的 `#i18n` 冲突：
   `WARN Duplicated imports "i18n", the one from "#i18n" has been ignored`。
   已拆成 `utils/document-lang.ts`，`#i18n` 成为唯一来源。

3. **`i18n.t` 的类型由 `default_locale`（en）推导，替换值必须传数组。**
   裸数字会被当成复数计数（`i18n.t(key, 5)` ≠ `$1 = 5`），所以 `$1` 必须写
   `i18n.t(key, [value])`。迁移时类型系统一次性抓出 13 处写法错误 —— 这正是选它的理由。

## 后果

- 硬规则 7 改为：文案走 `i18n.t()`，key 写进 `locales/<lang>.json`，**6 个 locale 必须同步**。
- **`en.json`（default_locale）是类型的唯一来源**：它必须带 `$1..$9` 占位符，
  否则类型层不允许传参；其他 locale 少 key 会回退到 `en`。
- manifest 名称/描述、工具栏提示、右键菜单、注入 UI 全部跟随浏览器语言。
- 运行时切语言**不可用**，且这是有意的边界 —— 需求变更时先回看本 ADR。
