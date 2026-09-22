import { browser } from "wxt/browser"

/**
 * 把 `<html lang>` 对齐当前 UI 语言。
 *
 * HTML 里的静态 `lang="en"` 只作 fallback；真正显示给谁看需要在运行时覆盖，
 * 否则会造成读屏语言错配、选字体 / 断行规则用错。
 *
 * 注意：文案本身不在这里——统一走 `@wxt-dev/i18n` 的 `i18n.t()`（`#i18n`）。
 * 那个包是 `browser.i18n` 的薄封装，语言跟随浏览器 UI 语言，运行时不可切换
 * （WXT 官方明确列为限制）。
 */
export const setDocumentLang = (): void => {
  document.documentElement.lang = browser.i18n.getUILanguage()
}
