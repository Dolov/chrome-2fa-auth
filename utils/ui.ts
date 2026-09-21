import { generateOtp, getRemainingTime } from "./auth"
import { copyTextToClipboard } from "./clipboard-utils"
import { COLORS, GRADIENT, type DataProps } from "./constant"
import { isRecoveryCodesSaved, saveOTP } from "./storage"
import message from "./message"

/** 用于生成唯一的 CSS 类名前缀，避免样式冲突 */
const PREFIX = "github-2fa-1746543013856" as const
/** 动画循环周期时长 */
const ANIMATION_DURATION = "6s"

/** 渐变容器组件的返回类型 */
interface StyleContainer {
  container: HTMLDivElement
  textElement: HTMLParagraphElement
}

/**
 * 动态插入样式表，如果已存在则跳过
 * @param styleId 样式表的唯一标识
 * @param styleContent 样式内容
 */
const insertStyleIfNeeded = (styleId: string, styleContent: string) => {
  let style = document.getElementById(styleId)
  if (style) {
    return style
  }
  style = document.createElement("style")
  style.id = styleId
  style.textContent = styleContent
  document.head.appendChild(style)
  return style
}

/**
 * 创建一个带有渐变边框和文本的容器
 * @param containerStyle 容器的自定义样式
 * @returns 包含容器和文本元素的对象
 */
export const createGradientTextContainer = (
  containerStyle?: Partial<CSSStyleDeclaration>
): StyleContainer => {
  const container = document.createElement("div")
  const textElement = document.createElement("p")
  textElement.textContent = "🌈"
  container.appendChild(textElement)

  container.classList.add(`${PREFIX}-rainbow-border`)
  textElement.classList.add(`${PREFIX}-rainbow-text`)

  if (containerStyle) {
    for (const key in containerStyle) {
      if (containerStyle[key] !== undefined) {
        container.style[key] = containerStyle[key]
      }
    }
  }

  insertStyleIfNeeded(
    `${PREFIX}-rainbow-style`,
    `
      @keyframes ${PREFIX}-rainbowFlow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      .${PREFIX}-rainbow-border {
        position: relative;
        padding: 6px 12px;
        background: transparent;
        z-index: 0;
      }

      .${PREFIX}-rainbow-border::before {
        content: "";
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: ${GRADIENT};
        background-size: 300% 300%;
        animation: ${PREFIX}-rainbowFlow ${ANIMATION_DURATION} linear infinite;
        border-radius: 6px;
        z-index: -1;
        padding: 2px;
        mask: 
          linear-gradient(#fff 0 0) content-box, 
          linear-gradient(#fff 0 0);
        mask-composite: exclude;
        -webkit-mask-composite: destination-out;
      }

      .${PREFIX}-rainbow-text {
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        margin: 0;
        padding: 0;
        color: transparent;
        background: ${GRADIENT};
        background-clip: text;
        -webkit-background-clip: text;
        background-size: 300% 300%;
        animation: ${PREFIX}-rainbowFlow ${ANIMATION_DURATION} ease infinite;
      }
    `
  )

  return { container, textElement }
}

/**
 * 为元素添加高亮动画效果
 * @param element 需要高亮的 HTML 元素
 */
export const highlightElement = (element: HTMLElement) => {
  let index = 0
  let count = 0
  const maxBlinks = COLORS.length

  const pulse = () => {
    const color = COLORS[index]
    Object.assign(element.style, {
      boxShadow: `0 0 20px 8px ${color}`,
      transform: "scale(1.05)",
      opacity: "0.9",
      transition: "box-shadow 0.3s ease, transform 0.3s ease, opacity 0.3s ease"
    })

    index = (index + 1) % COLORS.length
    count++

    setTimeout(() => {
      Object.assign(element.style, {
        boxShadow: "none",
        transform: "scale(1)",
        opacity: "1"
      })
    }, 300)

    if (count < maxBlinks) {
      setTimeout(pulse, 400)
    }
  }

  pulse()
}

/**
 * 创建一个可拖动的选择框，带有渐变边框效果
 * @param startX 起始X坐标
 * @param startY 起始Y坐标
 * @param zIndex 选择框的层级
 * @returns 包含选择框元素和控制方法的对象
 */
export const createSelectionBox = (
  startX: number,
  startY: number,
  zIndex = 9999
) => {
  const className = `${PREFIX}-selection-box`
  const animationName = `${PREFIX}-selection-gradient`

  const box = document.createElement("div")
  Object.assign(box.style, {
    position: "fixed",
    top: `${startY}px`,
    left: `${startX}px`,
    zIndex: zIndex.toString(),
    borderRadius: "8px",
    pointerEvents: "none",
    // backdropFilter: "blur(2px)",
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  })
  box.className = className

  insertStyleIfNeeded(
    `${PREFIX}-selection-style`,
    `
      @keyframes ${animationName} {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }

      .${className}::before {
        content: "";
        position: absolute;
        top: -3px;
        left: -3px;
        right: -3px;
        bottom: -3px;
        border-radius: 10px;
        background: ${GRADIENT};
        background-size: 400% 400%;
        animation: ${animationName} ${ANIMATION_DURATION} linear infinite;
        z-index: -1;
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: exclude;
        -webkit-mask-composite: destination-out;
        padding: 3px;
      }
    `
  )

  return {
    element: box,
    update: (currentX: number, currentY: number) => {
      const width = currentX - startX
      const height = currentY - startY
      Object.assign(box.style, {
        width: `${Math.abs(width)}px`,
        height: `${Math.abs(height)}px`,
        left: `${width < 0 ? currentX : startX}px`,
        top: `${height < 0 ? currentY : startY}px`
      })
    },
    remove: () => box.remove()
  }
}

/**
 * OTP 消息更新器的配置选项
 */
interface OtpMessageOptions {
  /** 容器的自定义样式 */
  style?: Partial<CSSStyleDeclaration>
  /** 是否将 OTP 显示在输入框的 placeholder 中 */
  placeholder?: boolean
  /** 是否显示账号 */
  account?: string
  /** 是否自动填充 */
  autoFill?: boolean
}

/**
 * 启动 OTP 消息更新器
 * @param input 目标输入框元素
 * @param secret OTP 密钥
 * @param options 配置选项
 * @returns 定时器ID，可用于清理
 */
export const startOtpMessageUpdater = (
  input: HTMLInputElement,
  secret: string,
  options: OtpMessageOptions = {}
) => {
  const { style = {}, placeholder, account, autoFill = true } = options

  insertStyleIfNeeded(
    `${PREFIX}-otp-message-style`,
    `
      .${PREFIX}-gradient-link {
        color: inherit;
        text-decoration: none;
      }
      .${PREFIX}-gradient-link:hover {
        text-decoration: underline;
        text-decoration-color: #00d3bb;
        text-decoration-thickness: 1px;
        text-underline-offset: 3px;
      }
    `
  )

  const { container, textElement } = createGradientTextContainer(style)
  input.insertAdjacentElement("afterend", container)

  const updateOtpMessage = () => {
    const timeRemaining = getRemainingTime()
    const otp = generateOtp(secret)

    if (autoFill && placeholder) {
      input.placeholder = `请输入 ${otp}`
    }
    if (autoFill && !placeholder) {
      input.value = otp
    }

    const accountHtml = account
      ? `<div style="font-size:16px;font-weight:bold;text-align:center;margin-bottom:2px;">${account}</div>`
      : ""

    const infoHtml = `
      <div style="text-align:center;">
        2FA 服务由
        <a class="${PREFIX}-gradient-link" href="https://github.com/Dolov/chrome-github-2fa" target="_blank">
          github-2fa
        </a>
        扩展提供，感谢使用！(有效期：${timeRemaining}秒)
      </div>
    `

    textElement.innerHTML = `${accountHtml}${infoHtml}`
  }

  updateOtpMessage()
  container.addEventListener("click", () => {
    const code = generateOtp(secret)
    copyTextToClipboard(code)
    message.success(`已复制 ${code} 到剪贴板`)
  })

  return setInterval(updateOtpMessage, 1000)
}

/**
 * 显示恢复码保存消息
 * @param element 消息显示的目标元素
 * @param parsedData OTP 数据
 * @param options 配置选项
 */
export const displayRecoveryCodeSaveMessage = async (
  element: HTMLElement,
  parsedData: DataProps,
  options?: {
    containerStyle?: Partial<CSSStyleDeclaration>
  }
) => {
  const { containerStyle } = options || {}
  const { container, textElement } = createGradientTextContainer(containerStyle)

  element.insertAdjacentElement("afterend", container)

  const saved = await isRecoveryCodesSaved(parsedData)
  const savedText = `恢复码已成功保存到 github-2fa 扩展`

  if (saved) {
    textElement.textContent = savedText
    return
  }

  const { account, issuer } = parsedData
  textElement.textContent = `点击将 ${issuer} - ${account} 的恢复码保存到 github-2fa 扩展`
  textElement.style.cursor = "pointer"
  container.addEventListener("click", async () => {
    await saveOTP(parsedData)
    textElement.textContent = savedText
    message.success("保存成功")
  })
}
