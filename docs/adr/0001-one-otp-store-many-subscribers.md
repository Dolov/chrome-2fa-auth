# ADR-0001: 单一 OTP Store，多订阅者

> 状态：已采纳

## 决策

- **唯一数据源**：`utils/storage.ts` 的 `dataStore`（`storage.defineItem<DataProps[]>(...)`）。
- **唯一变更入口**：`OtpProvider` 派发的 9 个 `OtpMutators`：`add / update / softDelete / restore / hardDelete / pin / exists / isRecoveryCodesSavedFor / markRecoveryCodeCopied`。
- **写入语义收敛**：所有 mutator 内部走纯函数 `addOtp`（`utils/otp-crud.ts`），处理三档合并：
  1. 完全匹配 (type+issuer+secret+account) → 字段合并到同一条。
  2. 同 (type+issuer+account) → 旧条目标记 deleted，新条目附加 recoveryCodes。
  3. 否则直接追加。
- **跨上下文同步**：provider 注册 `storage.watch`，所有 popup / settings 订阅者同时重渲染。

## 后果

- 数据写入只有一条路径；bug 修复只改一处。
- React 树外（content script）仍可读写 storage，但**不**使用 mutators（避免 React 依赖）——它们直接用 `dataStore.setValue` 配合 `addOtp` 纯函数。
- content script 必须自己 import `addOtp`，不能假设 mutator 已注入。

## 反向引用

- 词汇：见 `CONTEXT.md` 第 3–5 节（OtpStore / OtpProvider / OtpMutators）。