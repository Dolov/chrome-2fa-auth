export enum StorageKey {
  DATA = "data",
  LEGACY_DATA = "DATA_SOURCE",
  SETTINGS = "settings"
}

export enum SourceType {
  POPUP = "popup",
  SETTINGS = "settings"
}

export enum ContainerType {
  PHONE = "phone",
  DEFAULT = "default"
}

export enum FaviconType {
  ELEGANT = "elegant",
  MINIMAL = "minimal"
}

export const DEFAULT_SETTINGS: {
  theme: string
  faviconType: FaviconType
  containerType: ContainerType
} = {
  theme: "light",
  faviconType: FaviconType.ELEGANT,
  containerType: ContainerType.DEFAULT
}

export enum ActionType {
  AUTOSCAN = "AUTOSCAN",
  MANUAL_SCREENSHOT = "MANUAL_SCREENSHOT",
  CAPTURE_SCREENSHOT = "CAPTURE_SCREENSHOT"
}

export interface OtpAuthConfig {
  type: "totp" | "hotp"
  secret: string
  account: string
  issuer: string
  digits?: number
  period?: number // Only for TOTP
  counter?: number // Only for HOTP
  algorithm?: "SHA1" | "SHA256" | "SHA512" | "MD5"
}

export interface DataProps extends OtpAuthConfig {
  id: string
  pinned?: boolean
  remark?: string
  deleted?: boolean
  recoveryCodes?: {
    value: string
    copied: boolean
  }[]
}

export enum Issuers {
  /** 存储于 chrome.storage DataProps.issuer 的字面量值（大小写敏感）。 */
  NPM = "NPM",
  /** 历史数据保留 "GitHub" 大小写（v1 真实存盘值），迁移期不动。 */
  GITHUB = "GitHub"
}

export const COLORS = [
  "#422ad5", // 靛蓝
  "#00bafe", // 湖蓝
  "#00d3bb", // 青绿
  "#00d390", // 草绿
  "#fcb700", // 金黄
  "#f43098", // 玫红
  "#ff637d" // 粉红
]

export const GRADIENT = `linear-gradient(to right, ${COLORS.join(", ")})`

// otpauth://totp/GitHub:acloudfly?secret=N2CNXSJV7LG75BUI&issuer=GitHub
// otpauth://totp/shisongyan?secret=YMKVIYF4GLUR33S72SLEIWOCOJYSSAPE&issuer=npm
