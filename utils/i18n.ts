/**
 * utils/i18n.ts
 *
 * WXT 推荐 i18n 模式：原生 chrome.i18n.getMessage + _locales/{lang}/messages.json
 * 见 https://wxt.dev/guide/essentials/i18n.html
 *
 * 翻译文件位于 `public/_locales/{lang}/messages.json`。
 * WXT 把它们打包进 manifest，浏览器按 `default_locale` / 实际 locale 自动选文件。
 *
 * 新增 / 修改 key 后跑 `pnpm wxt prepare` 重新生成 `.wxt/types/i18n.d.ts`
 * （IDE 类型补全）。`pnpm build` 也会跑 prepare。
 *
 * 不引入 i18next / react-i18next——理由：
 * 1. popup 主包本就 390 B，但每加一个 i18n 库就是 +10~40 KB；
 * 2. chrome.i18n 同步、零 hydration 撕裂、无 Provider 包裹；
 * 3. WXT 整个生态就用 chrome.i18n，引入额外库反而割裂。
 *
 * 命名规范：`<模块>_<组件>_<用途>`（snake_case；Chrome 不允许 `-` / `.`）。
 */
import { browser } from "wxt/browser"

/**
 * 取 i18n 文案。未找到 key 时回退到 key 自己，便于排查漏译。
 *
 * @param key messages.json 里注册的 messageName
 * @param substitutions 占位符（$1 / $2 / ...），按顺序替换
 */
export const i18n = (
  key: string,
  substitutions?: string | string[]
): string => {
  // 类型放宽：fallback 模式允许任意 key（不在 messages.json 时 getMessage 返回 ""，
  // 由我们回退到 key 自己）
  const message = browser.i18n.getMessage(
    key as Parameters<typeof browser.i18n.getMessage>[0],
    substitutions
  )
  return message || key
}

/**
 * 把 `<html lang>` 对齐当前 UI 语言。
 *
 * HTML 里的静态 `lang="zh-CN"` 只作 fallback；真正显示给谁看需要在运行时
 * 覆盖，否则会造成读屏语言错配、选字体 / 断行规则用错。
 */
export const setDocumentLang = (): void => {
  document.documentElement.lang = browser.i18n.getUILanguage()
}