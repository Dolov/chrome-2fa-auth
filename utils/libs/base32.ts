/**
 * Base32 解码。
 *
 * 移植自 `thirty-two@1.0.2` 的解码器 —— otplib 的 `Authenticator` 正是用它处理
 * secret 的（`keyDecoder`）。替换 TOTP 实现时这里必须**逐字节对齐**，因此刻意
 * 保留上游的全部怪癖，不要「顺手修好」：
 *
 * - 大小写都接受（`byteTable` 对 A-Z 与 a-z 给出相同取值）。
 * - 遇到 `=` 立即结束，不校验填充是否合法。
 * - `byteTable` 中取值 `0xff` 的字符（如 `'0'`、`'1'`）**不抛错**，而是参与运算
 *   产出错误数据；编码值 < `'0'` 的字符取值为 `undefined`，在 `|` / `<<` 中按 0 处理。
 * - 编码值 ≥ 80（非 ASCII）才抛错。
 *
 * 输出长度等于实际归位的字节数 `plainPos`，而非按输入长度预估的缓冲区长度。
 */

/** `'='`(0x3d)：填充符，遇到的瞬间停止解码 */
const CODE_PADDING = 0x3d

/** `'0'`(0x30)：`byteTable` 的下标基准 */
const CODE_INDEX_BASE = 0x30

/** 0x30 起算的 5-bit 取值表，顺序与上游 `thirty-two` 完全一致 */
const BYTE_TABLE = [
  0xff, 0xff, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0xff, 0xff, 0xff, 0xff,
  0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
  0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12,
  0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff,
  0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
  0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff
]

const INVALID_INPUT_MESSAGE = "Invalid input - it is not base32 encoded string"

/** 把 base32 字符串解码为字节；非法输入的行为与上游一致（见文件头注释） */
export const decodeBase32 = (input: string): Uint8Array => {
  const encoded = new TextEncoder().encode(input)
  const decoded = new Uint8Array(Math.ceil((encoded.length * 5) / 8))
  let plainPos = 0
  let plainChar = 0
  let shiftIndex = 0

  for (const byte of encoded) {
    if (byte === CODE_PADDING) break

    const tableIndex = byte - CODE_INDEX_BASE
    if (tableIndex >= BYTE_TABLE.length) throw new Error(INVALID_INPUT_MESSAGE)

    // 越界（tableIndex < 0）时上游取到 undefined，在 | / << 中等价于 0
    const plainDigit = BYTE_TABLE[tableIndex] ?? 0

    if (shiftIndex <= 3) {
      shiftIndex = (shiftIndex + 5) % 8
      if (shiftIndex === 0) {
        plainChar |= plainDigit
        decoded[plainPos] = plainChar
        plainPos++
        plainChar = 0
      } else {
        plainChar |= 0xff & (plainDigit << (8 - shiftIndex))
      }
      continue
    }

    shiftIndex = (shiftIndex + 5) % 8
    plainChar |= 0xff & (plainDigit >>> shiftIndex)
    decoded[plainPos] = plainChar
    plainPos++
    plainChar = 0xff & (plainDigit << (8 - shiftIndex))
  }

  return decoded.slice(0, plainPos)
}
