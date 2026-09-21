/**
 * E2E 测试用 mock OTP 数据
 *
 * 故意不 import 项目内 utils/constant（黑盒）。
 * TOTP secret 用 ASCII 占位符，不与真实账号关联。
 */
import type { DataProps } from "../../utils/constant"

export const MOCK_DATA: DataProps[] = [
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
