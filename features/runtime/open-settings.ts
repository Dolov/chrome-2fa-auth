/**
 * 打开扩展设置页。
 *
 * 组件不直接触碰 `browser.tabs`，扩展 API 统一收口在 features 层。
 */
export const openSettingsPage = (): void => {
  void browser.tabs.create({
    url: browser.runtime.getURL("/settings.html")
  })
}
