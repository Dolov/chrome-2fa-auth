/**
 * 当前 active tab 是否允许注入 content script。
 *
 * 用 browser.* 而非 chrome.*（CONTEXT.md 约定：WXT 同时暴露两者，统一 browser.*）；
 * 两者都是 Promise 形态，探测失败一律降级为 false，由调用方决定提示。
 */
export const canInjectContentScript = async (): Promise<boolean> => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    const currentTab = tabs[0]
    if (!currentTab?.id) return false
    await browser.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => true
    })
    return true
  } catch {
    return false
  }
}
