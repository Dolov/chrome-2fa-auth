export const contentBaseZindex = 10000000

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

export const mockData = [
  {
    id: "1",
    type: "totp",
    issuer: "GitHub",
    secret: "N2CNXSJV7LG75BUI",
    account: "acloudfly"
  },
  {
    id: "2",
    type: "totp",
    issuer: "cloudflare",
    secret: "O4V3Q7JG25ROPMDE",
    account: "dolov"
  }
  // {
  //   id: "2",
  //   type: "totp",
  //   issuer: "NPM",
  //   secret: "VCFUM2XPIS7JKTOT2HHZ2MFVJ22SNL6Z",
  //   account: "npmDev42"
  // },
  // {
  //   id: "3",
  //   type: "totp",
  //   issuer: "GitLab",
  //   secret: "IJKLMNOP",
  //   account: "michaelGitlab"
  // },
  // {
  //   id: "4",
  //   type: "totp",
  //   issuer: "Bitbucket",
  //   secret: "QRSTUVWX",
  //   account: "bitbucketCoder"
  // },
  // {
  //   id: "5",
  //   type: "totp",
  //   issuer: "Docker",
  //   secret: "YZ123456",
  //   account: "dockerMaster"
  // },
  // {
  //   id: "6",
  //   type: "totp",
  //   issuer: "AWS",
  //   secret: "789ABCDE",
  //   account: "awsArchitect"
  // },
  // {
  //   id: "7",
  //   type: "totp",
  //   issuer: "GoogleCloud",
  //   secret: "FGHIJKLM",
  //   account: "gcpDevMike"
  // },
  // {
  //   id: "8",
  //   type: "totp",
  //   issuer: "Azure",
  //   secret: "NOPQRSTU",
  //   account: "azurePro"
  // },
  // {
  //   id: "9",
  //   type: "totp",
  //   issuer: "Cloudflare",
  //   secret: "VWXYZ012",
  //   account: "cfAdmin88"
  // },
  // {
  //   id: "10",
  //   type: "totp",
  //   issuer: "DigitalOcean",
  //   secret: "34567890",
  //   account: "doceanManager"
  // },
  // {
  //   id: "11",
  //   type: "totp",
  //   issuer: "Twitter",
  //   secret: "ABCDEFGH",
  //   account: "tweetKing"
  // },
  // {
  //   id: "12",
  //   type: "totp",
  //   issuer: "Facebook",
  //   secret: "IJKLMNOP",
  //   account: "fbMarketer99"
  // },
  // {
  //   id: "13",
  //   type: "totp",
  //   issuer: "Instagram",
  //   secret: "QRSTUVWX",
  //   account: "instaInfluencer"
  // },
  // {
  //   id: "14",
  //   type: "totp",
  //   issuer: "LinkedIn",
  //   secret: "YZ123456",
  //   account: "linkedinRecruiter"
  // },
  // {
  //   id: "15",
  //   type: "totp",
  //   issuer: "Discord",
  //   secret: "789ABCDE",
  //   account: "discordMod"
  // },
  // {
  //   id: "16",
  //   type: "totp",
  //   issuer: "Reddit",
  //   secret: "FGHIJKLM",
  //   account: "redditGuru"
  // },
  // {
  //   id: "17",
  //   type: "totp",
  //   issuer: "Gmail",
  //   secret: "NOPQRSTU",
  //   account: "gmailPoweruser"
  // },
  // {
  //   id: "18",
  //   type: "totp",
  //   issuer: "Outlook",
  //   secret: "VWXYZ012",
  //   account: "outlookManager"
  // }
]
