/**
 * 写入剪贴板的两种实现：
 * - `copyTextToClipboard`：fallback（textarea + execCommand），
 *   受限页面（无 navigator.clipboard）下唯一可用入口
 * - `copyTextToClipboardV2`：现代 Clipboard API
 *
 * 入口仍同时暴露两条路径，按权限/场景选用。
 *
 * 失败处理：函数本身只吞错；调用方（OtpText 等）负责 toast。
 * 这避免 SW / content script 里 console.log 噪音。
 */

/** 写入剪贴板：fallback 路径 */
export const copyTextToClipboard = (text: string) => {
  const textArea = document.createElement("textarea")
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.select()

  try {
    document.execCommand("copy")
  } catch {
    // 静默失败：调用方决定是否 toast 提示
  }
  document.body.removeChild(textArea)
}

/** 写入剪贴板：现代 Clipboard API */
export const copyTextToClipboardV2 = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 静默失败：调用方决定是否 toast 提示
  }
}
