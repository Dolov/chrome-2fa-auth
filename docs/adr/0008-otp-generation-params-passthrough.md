# ADR-0008: OTP 生成参数透传（修 `digits`/`period`/`algorithm` 被丢弃）

> 状态：已采纳

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

2. **在 `utils/libs/totp.ts` 做一次防御性归一**（`resolveOtpDigits` / `resolveOtpStep`），
   而不是只在组件里判断。理由是存储里的条目可以绕开 `parseOtpAuthUrl` 的校验
   （导入设置、直接写 storage）。不归一的实际后果：

   - `digits=999` → `10 ** 999` 为 `Infinity` → `%` 不生效 → 渲染出 **999 个字符**的「码」，布局直接崩掉。
   - `digits=0` → `10 ** 0` 为 1 → 只得到一个字符。
   - `period=-5` → counter 变负数 → `(-353687042).toString(16)` 带 `-` → hex 解析出 NaN → 垃圾码。

   `resolveOtpStep` 导出给渲染层算 `progress` 的 `max` 用，保证 max 与 value
   用同一个归一结果。

3. **明确划出本次不支持的边界**（写进 `utils/libs/totp.ts` 头注释，而不是让它悄悄走错）：
   - `type=hotp`：otplib 的 `authenticator` 与我们的实现都按时间生成，不支持计数器 UI。
     这是既有行为，需要独立的特性设计（计数器何时递增？UI 在哪？）。
   - `algorithm=MD5`：OTPAuth 规范里有，但 otplib v12 也不支持，回退为 sha1。

## 后果

- `digits=8` / `algorithm=SHA256` / `period=60` 三类账户从"永远验证不过"变为**可用**。
- 默认配置（SHA1/6/30）路径**逐字节未变** —— 原有 4 条用例原样通过。
- 顺带修掉 `progress max` 的硬编码 30。
- 脏数据不再能把 UI 渲染成 999 个字符。

## 验证

新增 4 条（都在 `e2e/specs/05-otp.spec.ts`，用独立 otplib 算期望值 + 固定时钟精确断言）：

- `digits=8`：8 位码与 otplib 一致
- `algorithm=SHA256`：与 otplib 的 sha256 一致（并断言 sha256 ≠ sha1，保证断言有区分力）
- `period=60`：码、下一周期码、`progress max=60`、`progress value` 全按 60 秒
- 脏数据兜底：`digits=999` / `period=-5` 回退默认（码长度必须是 6、`max` 必须是 30）

**修复前 3 条全部失败**（都显示同一个 SHA1/6/30 值），可作为"验收网确实生效"的证据；
修复后同一份 spec 8/8 通过。

## 代价与残留

- **content 侧自动填充没有 E2E 覆盖**（F8/F9 未写），本次只做到类型检查 + 构建通过。
  `startOtpMessageUpdater` 的签名变更由 `tsc` 保证两处调用点都传了完整条目。
  待 F8/F9 落地后应补一条"8 位码账户的自动填充值正确"。
- **位数分组是写死的 3+3**：`OtpText` 用 `otp.slice(0, 3)` + `otp.slice(3)`，
  所以 8 位码显示成 3+5 而不是 4+4。属视觉细节，未在本次改动
  （不在 bug 范围内，且没有任何视觉测试兜底）。
- `type=hotp` 与 `algorithm=MD5` 仍不支持，已在代码注释与 ADR 里显式声明。