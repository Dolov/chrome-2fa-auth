# ADR-0006: 用内联 HMAC 取代 otplib，移除 Node 垫片

> 状态：已采纳（v2.0.0 迁移期）

## 上下文

ADR-0005 的受控实验把产物体积按项归因后，最大的单项是 **Node 垫片 442.5 KB ×
3 个 bundle = 1327 KB，占当时总体积的 45%**：

| 实验 | github.js | npm.js | global.js | popup chunk | 原始总计 |
|---|---|---|---|---|---|
| E0 基线 | 605.5 | 605.7 | 149.5 | 809.7 | 2.96 MB |
| E1 去 `nodePolyfills`（otplib 保留） | 163.0 | 163.2 | 149.5 | 367.1 | 1.60 MB |
| E2 去 otplib | 152.7 | 152.8 | 149.5 | 356.7 | 1.57 MB |

由此得出：**垫片 442.5 KB/bundle，而 otplib 本体只有 10.3 KB**。也就是说
`vite-plugin-node-polyfills` 的 4 个垫片只为一个 10 KB 的库服务，触发点是
otplib 内部一行 `require('crypto')`。

## 三个候选方案

| 维度 | ① Web Crypto `crypto.subtle` | ② 换浏览器原生 TOTP 库 | ③ 内联实现 HMAC（选定） |
|---|---|---|---|
| 接口 | **只有 Promise**，`generateOtp` 必须变异步 | 取决于库 | 与现状一样同步 |
| 牵动的调用点 | `components/otp-text.tsx`（React 渲染路径）、`components/otp-remaining.tsx`、`features/page-ui/otp-autofill.ts`（content 注入）全要改 | 未知 | **0 个** |
| secure context | ⚠️ 非安全上下文 `undefined` | 取决于库 | 不依赖 |
| 新增依赖 | 0 | +1 | 0 |
| 风险面 | 中（改 API + React 渲染路径） | 中（新依赖需评估体积与同步性） | 低（API 不变，行为对拍验证） |
| 代码量 | ~60 行 | 0 | ~380 行（sha1/sha256/sha512 + HMAC + base32） |

补充事实（决定排除方案 ①）：ADR-0004 曾担心 `http://` 页面需要纯 JS HMAC 兜底。
核实后**该风险按当前架构不成立** —— 调用 OTP 生成的全部路径都在安全上下文
（popup 是 `chrome-extension://`；github / npm content 的 `matches` 均为 `https://`；
唯一匹配 `<all_urls>` 的 `global.content` 不碰 OTP 生成）。
所以方案 ① 的 secure context 问题不是决定因素，**它的致命伤是异步接口**。

## 决策

**方案 ③：内联实现 SHA-1 / SHA-256 / SHA-512 与 HMAC，逐条复刻 otplib 语义。**

拆成三个文件，各司其职：

| 文件 | 职责 |
|---|---|
| `utils/base32.ts` | base32 解码（移植 `thirty-two@1.0.2`） |
| `utils/hmac.ts` | SHA-1/256/512 + HMAC（RFC 2104） |
| `utils/totp.ts` | TOTP 组装，**公开 API 一个字符不变** |

### 必须逐条复刻的 otplib 语义

都有实测依据，**不要「顺手改成标准做法」**：

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

`utils/base32.ts` 同理保留了 `thirty-two` 的怪癖（大小写都收、遇 `=` 即停、
`byteTable` 里 `0xff` 的字符不抛错而是产出错误数据、非 ASCII 才抛错）。

## 验证

### 1. 开发期对拍（临时脚本，未入库）

| 对拍 | 参照物 | 规模 | 结果 |
|---|---|---|---|
| HMAC-SHA1/256/512 | node `crypto.createHmac` | 边界长度 + 1200 组随机 + RFC 4231 向量 | 2,367 项 0 失败 |
| base32 解码 | `thirty-two@1.0.2` | 3,000 组随机 + 固定边界 | 2,900 项 0 失败 |
| `generateOtp` / `getRemainingTime` | `otplib` `authenticator` | 16 种 secret × 3 算法 × 3 digits × 4 step × ~312 epoch + next 语义 + RFC 6238 向量 | **182,694 项 0 失败** |

### 2. 黑盒验收网（入库）

新增 `e2e/specs/05-otp.spec.ts`（F5 的数值正确性子集，4 条）：
用**独立 otplib** 算期望值，用 `page.clock.setFixedTime` 固定时钟做**精确断言**
（不是 SPECS.md 原先计划的「±1s 容差」）。

**这张网在替换前后同一份 spec 一行未改，均 4/4 通过。**

### 3. 验收网的区分力（变异测试）

先证明它不是「永远绿」：

| 变异 | 结果 | 说明 |
|---|---|---|
| `epoch += 5s` | 只有 Case 34（进度条）失败 | 5s 还在同一 30s 窗口内，OTP 本就不该变 |
| `epoch += 30s` | Case 31 / 36 / 多账户 失败，Case 34 通过 | 跨周期后 OTP 必变，而剩余秒数不变 |

两个方向都验证过，说明断言确实咬住了被测行为。

## 后果

产物（对比 ADR-0005 之后的基线）：

| | 改前 | 改后 | 变化 |
|---|---|---|---|
| 原始 | 2.96 MB | **1.07 MB** | **−64%** |
| gzip / 下载量 | 1.11 MB | **0.34 MB** | **−69%** |
| `content-scripts/github.js` | 605.5 KB | **159.4 KB** | −74% |
| `content-scripts/npm.js` | 605.7 KB | **159.6 KB** | −74% |
| popup/settings 共享 chunk | 809.6 KB | **363.4 KB** | −55% |

其他：

- `vite-plugin-node-polyfills` 从 devDependencies 移除，`vite.plugins` 只剩 `tailwindcss()`。
- 顺带清掉 `wxt.config.ts` 里未使用的 `fileURLToPath` import。
- `otplib` 变为**测试专用** devDependency（只被 `e2e/fixtures/test-secret.ts` 使用），
  这正是它本来就该有的位置。
- 三个 content bundle 中 Node 垫片痕迹归零（`createHmac` / `randomBytes` 均为 0）。

## 代价与残留风险

- **维护责任**：手写密码学原语进了仓库。缓解：两组外部参照（node `crypto` + otplib）
  已在开发期穷尽对拍，且 E2E 用独立 otplib 长期盯着；`utils/hmac.ts` 的常量数组
  一旦手误会立刻被对拍发现。
- **SHA-256/512 无 E2E 覆盖**：`generateOtp` 的 `algorithm` / `digits` / `period`
  参数**没有任何调用方传值**（见待办 1），所以 UI 只走 SHA1/6/30，黑盒测不到另外两种。
  这两种算法靠开发期 182,694 项对拍保证。
- **base32 的怪癖被固化了**：为了与旧行为逐字节一致，保留了上游的宽松与静默错数据
  行为。将来若要收紧校验，属于独立决策。

## 待办

1. **【既有 bug，本次未修】** `generateOtp` 的 `algorithm` / `digits` / `period` /
   `type` 参数从未被任何调用方传递：`components/otp-text.tsx` 只传
   `{ next }`，`features/page-ui/otp-autofill.ts` 只传 `secret`。
   结果是**存了但不用** —— 用户添加一个 `algorithm=SHA256` 的账户会看到 SHA1 码，
   无法通过验证；`type=hotp` 也一律按 TOTP 算。
   修复需要把完整条目传下去，属于行为变更，需独立 ADR + 相应 E2E。
2. F5 剩余 case：32（每秒刷新）、33（点击复制）、35（进度条颜色）。
3. jsQR 471 KB —— popup 侧已完成（ADR-0007），content 侧 382 KB 待改造。
