/**
 * 写入剪贴板的两种实现：
 * - `copyTextToClipboard`：fallback（textarea + execCommand），
 *   受限页面（无 navigator.clipboard）下唯一可用入口
 * - `copyTextToClipboardV2`：现代 Clipboard API
 *
 * 入口仍同时暴露两条路径，按权限/场景选用。
 */

/** 写入剪贴板：fallback 路径 */
export const copyTextToClipboard = (text: string) => {
  const textArea = document.createElement("textarea")
  textArea.value = text
  document.body.appendChild(textArea)
  textArea.select()

  try {
    const hasCopied = document.execCommand("copy")
    console.log(hasCopied ? "已复制到剪贴板" : "复制失败")
  } catch (err) {
    console.error("无法复制文本", err)
  }
  document.body.removeChild(textArea)
}

/** 写入剪贴板：现代 Clipboard API */
export const copyTextToClipboardV2 = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    console.log("已复制到剪贴板")
  } catch (err) {
    console.error("复制失败", err)
  }
}
