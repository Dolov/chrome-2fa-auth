# `utils/libs/` — 核心算法内联实现

> 父指令：[`/AGENTS.md`](../../AGENTS.md) 硬规则 6 + [`/CONTEXT.md`](../../CONTEXT.md) 分层不变式「双端纯原语（核心算法内联）」。
> 上游决策：[`/docs/adr/0006-inline-hmac-replaces-otplib.md`](../../docs/adr/0006-inline-hmac-replaces-otplib.md)。

## 是什么

**替代第三方库的核心算法内联实现**。剥离 otplib 及其 Node 垫片（实测 442.5 KB × 3 个 bundle），保持 content bundle 纯净且零依赖。

## 成员清单

| 文件 | 职责 | 依赖 |
|---|---|---|
| `base32.ts` | base32 解码（移植 `thirty-two@1.0.2`，**逐字节对齐上游怪癖**） | 零 |
| `hmac.ts` | SHA-1 / SHA-256 / SHA-512 + HMAC（RFC 2104 / FIPS 180-4） | 零 |
| `otpauth.ts` | OTPAuth URL 校验 / 解析 / 反向生成（纯字符串，零运行时依赖） | `../types` |
| `totp.ts` | TOTP 组装（HMAC + 动态截断 + 左补 0），**公开 API 字符级不变** | `./base32` `./hmac` `./otpauth` `../types` |

依赖图（单向无环）：

```
totp ──► base32
  │ ──► hmac
  │ ──► otpauth
otpauth ──► ../types
base32 ──► (无)
hmac   ──► (无)
```

## 入迁规则

**只有「替代第三方库 + 字节级可验证」的内联实现才放这里**。普通 helper 留在 `utils/`。

具体标准：

1. 存在被替代的第三方库（npm 包），且**完全替代**（不是 partial / polyfill）。
2. 上游行为有外部规范或测试向量可对照（RFC / 官方测试套 / 独立库）。
3. **兜底网存在**：`e2e/specs/` 里能用独立库算期望值做黑盒断言。
4. 入迁前写一篇 ADR，说明「为什么不用 npm 包」（多半是 bundle / runtime / 同步性原因）。

不满足任意一条不进 `utils/libs/`——这是长期约束，不是临时代码仓库。

## 硬规则

1. **不要「顺手修好」上游怪癖**。`base32.ts` 的大小写兼容 / 遇 `=` 即停 / 错误字符产出错误数据、`totp.ts` 的 hex-char-vs-byte 阈值不一致（ADR-0006 §「必须逐条复刻的 otplib 语义」）都是上游语义。改了 = 与独立 otplib 期望值不一致 = 黑盒 e2e 红。
2. **保持上游字节级兼容**。`hmac.ts` 是 RFC 2104 / FIPS 180-4 标准实现，但 `totp.ts` 必须沿用 otplib 的边界（key 补足规则 / counter 格式 / 截断）。任何修改都要先在 `e2e/specs/05-otp.spec.ts` 验证。
3. **`otpauth.ts` 零运行时依赖**。它专门从 `totp.ts` 拆出来，给 content script 用——拖入 HMAC 就破坏了「content script 不带 OTP 计算」的边界。**禁止**在 `otpauth.ts` 加任何业务逻辑**（枚举 / 默认值常量允许）。
4. **任何 `from "~/utils/..."` 都不允许**——`utils/libs/` 内部只用相对路径，且 `./base32` `./hmac` `./otpauth` 互引固定，不能跨目录引 `utils/` 里的东西。
5. **公开 API 是 contract**。`totp.ts` 与 `otpauth.ts` 的导出符号一旦发布，被 popup / content / autofill 多处引用。重命名 / 改签名 = 跨层改动，先看 ADR 流程。

## 正确性兜底

- 开发期：`utils/libs/hmac.ts` 头注释承诺与 node `crypto` / otplib 随机对拍，RFC 4231 向量包含在内。
- 长期：`e2e/specs/05-otp.spec.ts` 用独立 otplib 算期望值做黑盒断言（digits=8 / algorithm=SHA256 / period=60 三个回归网盯的就是「字段是否一路传到生成函数」，与本目录行为同源）。
- 任何修改四个文件前先跑 `pnpm test:e2e -- 05-otp`，跑通才能合。