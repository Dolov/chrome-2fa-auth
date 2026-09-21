/**
 * 与扩展运行时交互的探测函数
 */

/** 当前 active tab 是否能注入 content script */
export const canInjectContentScript = async (): Promise<boolean> => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const currentTab = tabs[0]
    if (!currentTab?.id) return false
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => true
    })
    return true
  } catch {
    return false
  }
}
