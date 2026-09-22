# ADR-0006: 用内联 HMAC 取代 otplib，移除 Node 垫片

> 状态：已采纳

## 决策

**内联实现 SHA-1 / SHA-256 / SHA-512 与 HMAC，逐条复刻 otplib 语义。**

拆成三个文件，各司其职：

| 文件 | 职责 |
|---|---|
| `utils/libs/base32.ts` | base32 解码（移植 `thirty-two@1.0.2`） |
| `utils/libs/hmac.ts` | SHA-1/256/512 + HMAC（RFC 2104） |
| `utils/libs/totp.ts` | TOTP 组装，**公开 API 一个字符不变** |

### 必须逐条复刻的 otplib 语义

**不要「顺手改成标准做法」**：

1. secret 按 **base32 解码**（`Authenticator.keyDecoder` = thirty-two），不是当 ASCII 用。
2. **key 补足规则**：解码后 hex 串长度 < minLength（sha1=20 / sha256=32 / sha512=64）
   时，把 hex 串重复到至少 minLength **字节**再截断到 minLength 字节；否则原样使用。
   阈值用 **hex 字符数**、目标用 **字节数**，是 otplib 自身的不一致，必须保留。
   效果：secret ≥ 10 字节时 sha1 不补；< 10 字节时补到 20 字节。
3. counter = `Math.floor(epoch / step / 1000)`。
4. counter 消息体 = `counter.toString(16)` 左补 `'0'` 到 16 个 hex 字符（超 16 位不截断）。
5. 截断 = RFC 4226 动态截断 + 左补 `'0'` 到 digits 位。
6. 剩余秒数 = `step - (Math.floor(epoch / 1000) % step)`，整数。
7. **忽略 `type` / `counter` 字段**（otplib 的 `authenticator` 是 TOTP 类，hotp 条目
   也按时间生成）。这是既有行为，不是本次引入的缺陷。

`utils/libs/base32.ts` 同理保留了 `thirty-two` 的怪癖（大小写都收、遇 `=` 即停、
`byteTable` 里 `0xff` 的字符不抛错而是产出错误数据、非 ASCII 才抛错）。

## 后果

- `vite-plugin-node-polyfills` 从 devDependencies 移除，`vite.plugins` 只剩 `tailwindcss()`。
- 顺带清掉 `wxt.config.ts` 里未使用的 `fileURLToPath` import。
- `otplib` 变为**测试专用** devDependency（只被 `e2e/fixtures/test-secret.ts` 使用），
  这正是它本来就该有的位置。
- 三个 content bundle 中 Node 垫片痕迹归零（`createHmac` / `randomBytes` 均为 0）。

## 验证

- 开发期对拍：用 node `crypto.createHmac` + otplib 跑了 182,694 项对拍 0 失败。
- 黑盒验收网：`e2e/specs/05-otp.spec.ts` 4 条用独立 `otplib` 算期望值 + 固定时钟精确断言。
- 验收网区分力：变异测试 `epoch += 5s` / `epoch += 30s` 已验证断言咬住了行为。

## 代价与残留风险

- **维护责任**：手写密码学原语进了仓库。缓解：两组外部参照（node `crypto` + otplib）
  已在开发期穷尽对拍，且 E2E 用独立 otplib 长期盯着；`utils/libs/hmac.ts` 的常量数组
  一旦手误会立刻被对拍发现。
- **SHA-256/512 无 E2E 覆盖**：`generateOtp` 的 `algorithm` / `digits` / `period`
  参数 UI 只走 SHA1/6/30，黑盒测不到另外两种。这两种算法靠开发期 182,694 项对拍保证。
- **base32 的怪癖被固化了**：为了与旧行为逐字节一致，保留了上游的宽松与静默错数据
  行为。将来若要收紧校验，属于独立决策。