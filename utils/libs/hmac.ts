/**
 * SHA-1 / SHA-256 / SHA-512 与基于它们的 HMAC。
 *
 * 为什么手写而不走 `crypto.subtle`：
 * - `crypto.subtle` 只有 Promise 接口，会把 `generateOtp` 变成异步，牵动
 *   popup 渲染与 content 注入两条调用链；本文件保持同步。
 * - 手写实现不依赖 secure context，`http://` 页面同样可用。
 *
 * 为什么手写而不继续用 otplib：otplib 内部 `require('crypto')`，会把
 * `vite-plugin-node-polyfills` 的 4 个 Node 垫片（实测 442.5 KB × 3 个 bundle）
 * 拖进每个产物。otplib 本体只有约 10 KB。
 *
 * 正确性由两组外部参照保证：
 * - 开发期：与 node `crypto` / `otplib` 随机对拍（RFC 4231 向量包含在内）。
 * - 长期：`e2e/specs/05-otp.spec.ts` 用独立 otplib 算期望值做黑盒断言。
 *
 * 注：各压缩函数的循环边界是编译期固定的，数组下标必然命中，故用 `!` 标注。
 */

/** 支持的哈希算法（与 otplib `HashAlgorithms` 的运行时值一致，全小写） */
export const HMAC_ALGORITHMS = ["sha1", "sha256", "sha512"] as const
export type HmacAlgorithm = (typeof HMAC_ALGORITHMS)[number]

const BLOCK_SIZES: Record<HmacAlgorithm, number> = {
  sha1: 64,
  sha256: 64,
  sha512: 128
}

const DIGEST_SIZES: Record<HmacAlgorithm, number> = {
  sha1: 20,
  sha256: 32,
  sha512: 64
}

const rotl32 = (value: number, bits: number): number =>
  ((value << bits) | (value >>> (32 - bits))) >>> 0

const rotr32 = (value: number, bits: number): number =>
  ((value >>> bits) | (value << (32 - bits))) >>> 0

const readUint32BE = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset]! << 24) |
    (bytes[offset + 1]! << 16) |
    (bytes[offset + 2]! << 8) |
    bytes[offset + 3]!) >>>
  0

const writeUint32BE = (
  bytes: Uint8Array,
  offset: number,
  value: number
): void => {
  bytes[offset] = (value >>> 24) & 0xff
  bytes[offset + 1] = (value >>> 16) & 0xff
  bytes[offset + 2] = (value >>> 8) & 0xff
  bytes[offset + 3] = value & 0xff
}

/**
 * 尾部补位：`0x80` + 若干 `0x00` + 大端比特长度。
 * `lengthFieldBytes` 为 8（SHA-1/256）或 16（SHA-512）；128 位字段的高 8 字节
 * 恒为 0，因为 JS 数字能表示的比特数远小于 2^64。
 */
const padMessage = (
  message: Uint8Array,
  blockSize: number,
  lengthFieldBytes: number
): Uint8Array => {
  const bitLength = message.length * 8
  const paddedLength =
    Math.ceil((message.length + 1 + lengthFieldBytes) / blockSize) * blockSize
  const padded = new Uint8Array(paddedLength)

  padded.set(message)
  padded[message.length] = 0x80
  writeUint32BE(padded, paddedLength - 8, Math.floor(bitLength / 0x100000000))
  writeUint32BE(padded, paddedLength - 4, bitLength >>> 0)

  return padded
}

const SHA1_INIT = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]

/** SHA-1 的 4 组 20 轮：每组一个常量与一个逻辑函数（查表替代 switch） */
const SHA1_ROUNDS = [
  { count: 20, k: 0x5a827999, f: (b: number, c: number, d: number) => (b & c) | (~b & d) },
  { count: 20, k: 0x6ed9eba1, f: (b: number, c: number, d: number) => b ^ c ^ d },
  { count: 20, k: 0x8f1bbcdc, f: (b: number, c: number, d: number) => (b & c) | (b & d) | (c & d) },
  { count: 20, k: 0xca62c1d6, f: (b: number, c: number, d: number) => b ^ c ^ d }
]

const sha1 = (message: Uint8Array): Uint8Array => {
  const padded = padMessage(message, 64, 8)
  const state = [...SHA1_INIT]
  const w = new Uint32Array(80)

  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = readUint32BE(padded, block + i * 4)
    for (let i = 16; i < 80; i++) {
      w[i] = rotl32(w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!, 1)
    }

    let a = state[0]!
    let b = state[1]!
    let c = state[2]!
    let d = state[3]!
    let e = state[4]!

    let round = 0
    for (const { count, k, f } of SHA1_ROUNDS) {
      for (let i = 0; i < count; i++, round++) {
        const temp = (rotl32(a, 5) + f(b, c, d) + e + k + w[round]!) >>> 0
        e = d
        d = c
        c = rotl32(b, 30)
        b = a
        a = temp
      }
    }

    state[0] = (state[0]! + a) >>> 0
    state[1] = (state[1]! + b) >>> 0
    state[2] = (state[2]! + c) >>> 0
    state[3] = (state[3]! + d) >>> 0
    state[4] = (state[4]! + e) >>> 0
  }

  const digest = new Uint8Array(20)
  for (let i = 0; i < 5; i++) writeUint32BE(digest, i * 4, state[i]!)
  return digest
}

const SHA256_INIT = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19
]

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]

const sha256 = (message: Uint8Array): Uint8Array => {
  const padded = padMessage(message, 64, 8)
  const state = [...SHA256_INIT]
  const w = new Uint32Array(64)

  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = readUint32BE(padded, block + i * 4)
    for (let i = 16; i < 64; i++) {
      const prev15 = w[i - 15]!
      const prev2 = w[i - 2]!
      const s0 = rotr32(prev15, 7) ^ rotr32(prev15, 18) ^ (prev15 >>> 3)
      const s1 = rotr32(prev2, 17) ^ rotr32(prev2, 19) ^ (prev2 >>> 10)
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0
    }

    let a = state[0]!
    let b = state[1]!
    let c = state[2]!
    let d = state[3]!
    let e = state[4]!
    let f = state[5]!
    let g = state[6]!
    let h = state[7]!

    for (let i = 0; i < 64; i++) {
      const sum1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25)
      const choose = (e & f) ^ (~e & g)
      const temp1 = (h + sum1 + choose + SHA256_K[i]! + w[i]!) >>> 0
      const sum0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22)
      const majority = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (sum0 + majority) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    const working = [a, b, c, d, e, f, g, h]
    for (let i = 0; i < 8; i++) state[i] = (state[i]! + working[i]!) >>> 0
  }

  const digest = new Uint8Array(32)
  for (let i = 0; i < 8; i++) writeUint32BE(digest, i * 4, state[i]!)
  return digest
}

const MASK64 = (1n << 64n) - 1n

const rotr64 = (value: bigint, bits: bigint): bigint =>
  ((value >> bits) | (value << (64n - bits))) & MASK64

const readBigUint64BE = (bytes: Uint8Array, offset: number): bigint => {
  let value = 0n
  for (let i = 0; i < 8; i++) value = (value << 8n) | BigInt(bytes[offset + i]!)
  return value
}

const writeBigUint64BE = (
  bytes: Uint8Array,
  offset: number,
  value: bigint
): void => {
  for (let i = 7; i >= 0; i--) {
    bytes[offset + i] = Number(value & 0xffn)
    value >>= 8n
  }
}

const SHA512_INIT = [
  0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn,
  0xa54ff53a5f1d36f1n, 0x510e527fade682d1n, 0x9b05688c2b3e6c1fn,
  0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n
]

const SHA512_K = [
  0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn,
  0xe9b5dba58189dbbcn, 0x3956c25bf348b538n, 0x59f111f1b605d019n,
  0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n, 0xd807aa98a3030242n,
  0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
  0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n,
  0xc19bf174cf692694n, 0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n,
  0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n, 0x2de92c6f592b0275n,
  0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
  0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn,
  0xbf597fc7beef0ee4n, 0xc6e00bf33da88fc2n, 0xd5a79147930aa725n,
  0x06ca6351e003826fn, 0x142929670a0e6e70n, 0x27b70a8546d22ffcn,
  0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
  0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n,
  0x92722c851482353bn, 0xa2bfe8a14cf10364n, 0xa81a664bbc423001n,
  0xc24b8b70d0f89791n, 0xc76c51a30654be30n, 0xd192e819d6ef5218n,
  0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
  0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n,
  0x34b0bcb5e19b48a8n, 0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn,
  0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n, 0x748f82ee5defb2fcn,
  0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
  0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n,
  0xc67178f2e372532bn, 0xca273eceea26619cn, 0xd186b8c721c0c207n,
  0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n, 0x06f067aa72176fban,
  0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
  0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn,
  0x431d67c49c100d4cn, 0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an,
  0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n
]

const sha512 = (message: Uint8Array): Uint8Array => {
  const padded = padMessage(message, 128, 16)
  const state = [...SHA512_INIT]
  const w = Array.from({ length: 80 }, () => 0n)

  for (let block = 0; block < padded.length; block += 128) {
    for (let i = 0; i < 16; i++) w[i] = readBigUint64BE(padded, block + i * 8)
    for (let i = 16; i < 80; i++) {
      const prev15 = w[i - 15]!
      const prev2 = w[i - 2]!
      const s0 = rotr64(prev15, 1n) ^ rotr64(prev15, 8n) ^ (prev15 >> 7n)
      const s1 = rotr64(prev2, 19n) ^ rotr64(prev2, 61n) ^ (prev2 >> 6n)
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) & MASK64
    }

    let a = state[0]!
    let b = state[1]!
    let c = state[2]!
    let d = state[3]!
    let e = state[4]!
    let f = state[5]!
    let g = state[6]!
    let h = state[7]!

    for (let i = 0; i < 80; i++) {
      const sum1 = rotr64(e, 14n) ^ rotr64(e, 18n) ^ rotr64(e, 41n)
      const choose = (e & f) ^ (~e & g)
      const temp1 = (h + sum1 + choose + SHA512_K[i]! + w[i]!) & MASK64
      const sum0 = rotr64(a, 28n) ^ rotr64(a, 34n) ^ rotr64(a, 39n)
      const majority = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (sum0 + majority) & MASK64

      h = g
      g = f
      f = e
      e = (d + temp1) & MASK64
      d = c
      c = b
      b = a
      a = (temp1 + temp2) & MASK64
    }

    const working = [a, b, c, d, e, f, g, h]
    for (let i = 0; i < 8; i++) state[i] = (state[i]! + working[i]!) & MASK64
  }

  const digest = new Uint8Array(64)
  for (let i = 0; i < 8; i++) writeBigUint64BE(digest, i * 8, state[i]!)
  return digest
}

const HASHES: Record<HmacAlgorithm, (message: Uint8Array) => Uint8Array> = {
  sha1,
  sha256,
  sha512
}

/** HMAC（RFC 2104）：ipad/opad 异或拼接，超长 key 先哈希 */
export const hmac = (
  algorithm: HmacAlgorithm,
  key: Uint8Array,
  message: Uint8Array
): Uint8Array => {
  const hash = HASHES[algorithm]
  const blockSize = BLOCK_SIZES[algorithm]
  const digestSize = DIGEST_SIZES[algorithm]
  const normalizedKey = key.length > blockSize ? hash(key) : key

  const inner = new Uint8Array(blockSize + message.length)
  const outer = new Uint8Array(blockSize + digestSize)

  for (let i = 0; i < blockSize; i++) {
    const keyByte = normalizedKey[i] ?? 0
    inner[i] = keyByte ^ 0x36
    outer[i] = keyByte ^ 0x5c
  }
  inner.set(message, blockSize)

  const innerDigest = hash(inner)
  outer.set(innerDigest, blockSize)

  return hash(outer)
}
