# ADR-0001: 单一 OTP Store，多订阅者

> 状态：已采纳（v2 把 content-side 写入拉回 `mutateOtpList`）

## 决策

- **唯一数据源**：`utils/storage.ts` 的 `dataStore`（`storage.defineItem<DataProps[]>(...)`）。
- **唯一变更入口**：`features/otp-store/store.ts` 的 `mutateOtpList`，所有写入（`OtpMutators`、`features/otp-intake` 双端 writer、`recovery-prompt.ts` 调用的 `saveOTP`）都走它。**content script 不再是例外**。
- **写入语义收敛**：`mutateOtpList` 内部基于内存缓存做并发读保护（`ensureOtpListLoaded` + `commitOtpList`），并借助 `addOtp`（`features/otp-store/otp-crud.ts`）处理三档合并：
  1. 完全匹配 (type+issuer+secret+account) → 字段合并到同一条（`merged: true`，让 writer 区分「已存在」）。
  2. 同 (type+issuer+account) → 旧条目标记 deleted，新条目附加 recoveryCodes。
  3. 否则直接追加。
- **跨上下文同步**：provider 注册 `storage.watch`，所有 popup / settings 订阅者同时重渲染；content-side 写入同样经 `dataStore.setValue` 触发订阅。

## v2 变更（架构报告 friction #6 / 候选 4）

把「content script 可直调 `dataStore.setValue`」的例外删除：

- React Provider 的 mutators、content-side intake writer、`saveOTP` 的恢复码路径
  全部统一走 `mutateOtpList`。`addOtp` 也新增 `merged: boolean`，让双端
  writer 用同一份「是否存在」语义。
- 写作上的好处：CONTEXT.md 第 3 节不再需要「永不直调 `dataStore.setValue`」
  这条独立硬规则；唯一约束就是「走 `mutateOtpList`」。

## 后果

- 数据写入只有一条路径；bug 修复只改一处。
- content script 写保存路径仍独立于 React（不依赖 Provider 注入），但并发保护
  写路径与 popup 走的是同一份 —— 跨上下文丢失更新的可能性收敛为零。
- `addOtp.merged` 是公开返回值，新增调用方可自行判断「是否合并入现有条目」。

## 反向引用

- 词汇：见 `CONTEXT.md` 第 3–5 节（OtpStore / OtpProvider / OtpMutators）。