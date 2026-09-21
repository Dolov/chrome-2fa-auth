# ADR-0008: OTP 生成参数透传（修 `digits`/`period`/`algorithm` 被丢弃）

> 状态：已采纳（v2.0.0 迁移期）

## 上下文

`digits` / `period` / `algorithm` 三个参数在链路前半段被完整处理，在最后一步被丢掉：

| 环节 | 事实 | 结论 |
|---|---|---|
| 解析 | `utils/otpauth.ts::parseOtpAuthUrl` 解析并**校验**它们：`algorithm` 限定 SHA1/SHA256/SHA512/MD5（非法值抛错）、`digits` 限定 6/7/8（非法值抛错）、`period` 取数值 | 设计上**打算支持** |
| 落库 | `features/otp-intake/intake.ts` 把整个 `config` 交给 `deps.writer.persist(config)` | 字段**确实存进去了** |
| 读取（popup） | `components/otp-text.tsx` 只声明 `secret: string`；`list.tsx` / `upload-modal.tsx` 两处调用只传 `secret`，内部调 `generateOtp(secret, { next })` | **被丢掉** |
| 读取（进度条） | `components/otp-remaining.tsx` 调 `getRemainingTime()` 不传参数，且 `<progress max={30}>` 把周期**硬编码** | **被丢掉** |
| 读取（content 自动填充） | `features/page-ui/otp-autofill.ts::startOtpMessageUpdater` 第二参数是 `secret: string`；`fill-otp.ts` / `read-qr.ts` 都只传 secret | **被丢掉** |

后果是三类账户**永远显示错误的码**（实测三条 E2E 用例在修复前全部失败，
且都显示同一个值 `644494`，即 SHA1/6/30 的结果 —— 直接证明三个参数被完全忽略）：

| 账户配置 | 修复前显示 | 后果 |
|---|---|---|
| `digits=8` | 6 位码 | **永远验证不过** |
| `algorithm=SHA256` | 按 SHA1 算的码 | **永远验证不过** |
| `period=60` | 30 秒窗口的码 | **永远验证不过**，进度条也错 |

content 侧更严重：`startOtpMessageUpdater` 会把算错的码**直接填进 GitHub / NPM 的
OTP 输入框**。8 位码与 SHA256 都有真实服务在用。

## 决策

1. **把完整条目一路透传到生成函数**，而不是三个裸参数。

   | 位置 | 改动 |
   |---|---|
   | `components/otp-text.tsx` | prop `secret: string` → `config: OtpAuthConfig`；内部按 `{ digits, period, algorithm, next }` 生成，`useEffect` 依赖改成 5 个原始值（不用对象，避免每次渲染重置定时器） |
   | `components/otp-remaining.tsx` | 新增 `period?: number`；`max` 由 `resolveOtpStep(period)` 得出（不再写死 30），与 `value` 同源 |
   | `features/page-ui/otp-autofill.ts` | 第二参数 `secret: string` → `config: OtpAuthConfig` |
   | `components/home/list.tsx` | `config={data}` + `period={period}` |
   | `components/home/upload-modal.tsx` | `config={preview}` + `period={preview.period}` |
   | `features/site-content/actions/fill-otp.ts` | 直接传 `item`（本来就是完整 `DataProps`） |
   | `features/site-content/actions/read-qr.ts` | 直接传 `parsed`（`parseOtpAuthUrl` 的返回值） |

   两个调用方**本来就持有完整配置**，所以不需要改数据流，只需要不再丢字段。

2. **在 `utils/totp.ts` 做一次防御性归一**（`resolveOtpDigits` / `resolveOtpStep`），
   而不是只在组件里判断。理由是存储里的条目可以绕开 `parseOtpAuthUrl` 的校验
   （导入设置、直接写 storage）。不归一的实际后果：

   - `digits=999` → `10 ** 999` 为 `Infinity` → `%` 不生效 → 渲染出 **999 个字符**的「码」，布局直接崩掉。
   - `digits=0` → `10 ** 0` 为 1 → 只得到一个字符。
   - `period=-5` → counter 变负数 → `(-353687042).toString(16)` 带 `-` → hex 解析出 NaN → 垃圾码。

   `resolveOtpStep` 导出给渲染层算 `progress` 的 `max` 用，保证 max 与 value
   用同一个归一结果。

3. **明确划出本次不支持的边界**（写进 `utils/totp.ts` 头注释，而不是让它悄悄走错）：
   - `type=hotp`：otplib 的 `authenticator` 与我们的实现都按时间生成，不支持计数器 UI。
     这是既有行为，需要独立的特性设计（计数器何时递增？UI 在哪？）。
   - `algorithm=MD5`：OTPAuth 规范里有，但 otplib v12 也不支持，回退为 sha1。

## 验证

先写验收网、**先在修复前跑一次**（预期失败），再改代码：

| 阶段 | 结果 |
|---|---|
| 修复前 | 新增 3 条用例**全部失败**；`digits=8` 期望 `01644494` 实得 `644494`；`algorithm=SHA256` 期望 `375610` 实得 `644494`；`period=60` 期望 `508038` 实得 `644494` |
| 修复后 | 同一份 spec **一行未改**，8/8 通过（含原有 4 条默认路径用例） |

新增 4 条（都在 `e2e/specs/05-otp.spec.ts`，用独立 otplib 算期望值 + 固定时钟精确断言）：

- `digits=8`：8 位码与 otplib 一致
- `algorithm=SHA256`：与 otplib 的 sha256 一致（并断言 sha256 ≠ sha1，保证断言有区分力）
- `period=60`：码、下一周期码、`progress max=60`、`progress value` 全按 60 秒
- 脏数据兜底：`digits=999` / `period=-5` 回退默认（码长度必须是 6、`max` 必须是 30）

## 后果

- `digits=8` / `algorithm=SHA256` / `period=60` 三类账户从「永远验证不过」变为**可用**。
- 默认配置（SHA1/6/30）路径**逐字节未变** —— 原有 4 条用例原样通过。
- 顺带修掉 `progress max` 的硬编码 30。
- 脏数据不再能把 UI 渲染成 999 个字符。

## 代价与残留

- **content 侧自动填充没有 E2E 覆盖**（F8/F9 未写），本次只做到类型检查 + 构建通过。
  `startOtpMessageUpdater` 的签名变更由 `tsc` 保证两处调用点都传了完整条目。
  待 F8/F9 落地后应补一条「8 位码账户的自动填充值正确」。
- **位数分组是写死的 3+3**：`OtpText` 用 `otp.slice(0, 3)` + `otp.slice(3)`，
  所以 8 位码显示成 3+5 而不是 4+4。属视觉细节，未在本次改动
  （不在 bug 范围内，且没有任何视觉测试兜底）。
- `type=hotp` 与 `algorithm=MD5` 仍不支持，已在代码注释与 ADR 里显式声明。

## 备选方案（已否决）

- **落库时把参数固化成默认值**（写入前统一成 SHA1/6/30）：能"修好"显示，但会**丢信息** ——
  用户导入的二维码参数被抹掉，且一旦以后支持 SHA256 就再也回不来。存储应忠实于二维码内容。
- **`digits` / `period` / `algorithm` 三个裸 prop 分别传**：调用点要传 3 个 prop，
  漏一个就静默出错 —— 而本次事故的根因恰恰就是"漏传且静默"。传一个 `config` 对象
  让"传错"变成类型错误。
