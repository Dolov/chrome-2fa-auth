/**
 * E2E 测试用 mock OTP 数据
 *
 * 黑盒：不 import 项目内任何代码，记录形状在本地结构化声明。
 * 存储契约变了这里必须同步改（这是刻意的，防止「改实现顺手改测试」）。
 * TOTP secret 用 ASCII 占位符，不与真实账号关联。
 */

/** chrome.storage `sync:data` 单条记录的形状（项目内对应类型 DataProps） */
interface MockOtpRecord {
  id: string
  type: "totp" | "hotp"
  issuer: string
  secret: string
  account: string
}

export const MOCK_DATA: MockOtpRecord[] = [
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
]
