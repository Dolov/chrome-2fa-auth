/**
 * 领域类型与枚举：popup / content / background 共享的契约。
 *
 * 与 `constants.ts` 的分工——本文件只有类型与枚举；
 * 任何需要运行时值的常量（含主题色）都放 `constants.ts`。
 */

export enum StorageKey {
  DATA = "data",
  LEGACY_DATA = "DATA_SOURCE",
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

/** `chrome.storage.sync.settings` 的形状；默认值见 `constants.ts` 的 DEFAULT_SETTINGS */
export interface Settings {
  theme: string
  faviconType: FaviconType
  containerType: ContainerType
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
