import { Issuers } from "~/utils/constant"

/**
 * 单个内容脚本要支持的页面动作。
 *
 * - fill-otp：用户已登录、站点索要 OTP
 * - read-qr：用户在设置页扫描我们识别的二维码
 * - recover：用户在恢复码页把恢复码保存到本地
 */
export type PageAction = "fill-otp" | "read-qr" | "recover"

/** 单个站点对内容脚本的行为描述。 */
export interface SiteAdapter {
  /** 显示名（用于日志/调试） */
  name: string

  /** 该账号在 chrome.storage DATA 里的 issuer 字段 */
  issuer: keyof typeof Issuers

  /** URL 路由判别 */
  isFillOTPPage(pathname: string): boolean
  isReadQRPage(pathname: string): boolean
  isRecoverCodesPage(pathname: string): boolean

  /** 从当前页面/URL 取本机账号（GitHub 从 meta，NPM 从 URL segment） */
  resolveAccount(): Promise<string | null>

  /** DOM 选择器 */
  selectors: {
    /** OTP 输入框（login / sudo） */
    otpInput: string
    /** 启用 2FA 页的 verify 框（可与 otpInput 同源） */
    otpVerifyInput?: string
    /** 二维码图片（GitHub 有 class；NPM 不固定，靠 scanPage） */
    qrImage?: string
    /** 保存按钮（GitHub 有 data-target；NPM 用 type=submit） */
    qrSaveButton?: string
    /** 恢复码容器（GitHub 是 ul，NPM 是 div[role=button]） */
    recoveryList?: string
    /** 单条恢复码选择器 */
    recoveryItem?: string
  }

  /**
   * 自定义扫描：未提供时调用 utils/qr.scanPage()
   * 命中返回 {data, element}，未命中返回 null
   */
  scanQr?(): Promise<{ data: string; element: HTMLElement } | null>

  /**
   * 自定义恢复码抽取：未提供时按 recoveryList/recoveryItem 读 innerText
   * 未命中返回 null
   */
  extractRecoveryCodes?(): Promise<string[] | null>

  /** fill-otp 注入项之间的样式（每个站点可能略不同） */
  fillOtpItemStyle?: Partial<CSSStyleDeclaration>
  /** recovery prompt 容器下边距 */
  recoveryContainerStyle?: Partial<CSSStyleDeclaration>
}

/** adapter.classify() 的标准实现 */
export const classifyByPathname = (
  adapter: SiteAdapter,
  pathname: string
): PageAction | null => {
  if (adapter.isRecoverCodesPage(pathname)) return "recover"
  if (adapter.isReadQRPage(pathname)) return "read-qr"
  if (adapter.isFillOTPPage(pathname)) return "fill-otp"
  return null
}
