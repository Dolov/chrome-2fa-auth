import message from "./toast"
import type { DataProps } from "~/utils/types"
import { isRecoveryCodesSaved, saveOTP } from "~/features/otp-store/store"
import { createGradientTextContainer } from "./gradient-border"

/** 恢复码提示的配置项 */
export interface RecoveryPromptOptions {
  containerStyle?: Partial<CSSStyleDeclaration>
}

/**
 * 在目标元素之后插入一个浮动提示：
 * 已保存 → 显示静态文案
 * 未保存 → 显示可点击触发保存的提示语
 *
 * 返回 `dispose` —— SPA 路由切换时调用，移除注入的 DOM。
 */
export const displayRecoveryCodeSaveMessage = async (
  element: HTMLElement,
  parsedData: DataProps,
  options: RecoveryPromptOptions = {}
): Promise<() => void> => {
  const { containerStyle } = options
  const { container, textElement } = createGradientTextContainer(containerStyle)

  element.insertAdjacentElement("afterend", container)

  const saved = await isRecoveryCodesSaved(parsedData)
  const savedText = `恢复码已成功保存到 github-2fa 扩展`

  if (saved) {
    textElement.textContent = savedText
    return () => container.remove()
  }

  const { account, issuer } = parsedData
  textElement.textContent = `点击将 ${issuer} - ${account} 的恢复码保存到 github-2fa 扩展`
  textElement.style.cursor = "pointer"
  container.addEventListener("click", async () => {
    await saveOTP(parsedData)
    textElement.textContent = savedText
    message.success("保存成功")
  })
  return () => container.remove()
}
