# ADR-0002: 把 OTP 摄入拉成贯穿 popup ↔ content 的深模块（S9 决策）

> 状态：已采纳（feat/migrate-wxt-clean @ S9 — 候选 A）

## 上下文

"把一个 QR 转化为一条 OtpItem 并通知用户" 这条业务路径在 S8 之后依然散在三处：

1. `components/home/create.tsx` 的 `handleQRScanResult`：解析 → 去重 → prompt 账号 → add。
2. `entrypoints/global.content/manual-scan.ts` 的 `handleQRResult`：解析 → prompt 账号 → saveOTP（**无**去重）。
3. `features/site-content/actions/read-qr.ts` 的 `attachSaveHandler`：解析 → resolveAccount → saveOTP（**无** prompt、**无**去重）。

三处文案不一致：`create.tsx` 用 `success` 文案、`manual-scan.ts` 用 `添加成功`、`read-qr.ts` 仅 `添加成功`。改"已存在"提示必须改三处。

## 决策

新增 `features/otp-intake/` 目录，提供一个深模块函数：

```ts
intakeOtp(
  source: { kind: 'qr-data' | 'file' | 'parsed'; data?: string; file?: File; config?: OtpAuthConfig },
  deps: {
    account: { promptAccount(issuer): Promise<string|null>; hintAccount?: string }
    writer:  { persist(config): Promise<{ status: 'added'|'exists'; item: DataProps }> }
    notifier: { success(text); warn(text); error(text) }
  }
): Promise<IntakeOutcome>
```

四个调用方切换：

- `create.tsx` QR autoScan：传入 `popupWriter` + `message` notifier。
- `create.tsx` UploadModal：传入 `popupWriter` + 自有 error state。
- `manual-scan.ts`：传入 `contentWriter`（直接 `dataStore.setValue(addOtp(...))`）+ `message` notifier。
- `read-qr.ts` 的 `attachSaveHandler`：传入 `contentWriter` + `message` notifier；account 用 `resolveAccount()`。

**所有四条路径都获得去重 + 提示文案归一。**

## 后果

- ✅ 单点编辑业务规则（账号缺失、已存在、已添加三种 toast 文案收敛）。
- ✅ 接口短（`source` 3 选 1 + 3 个 deps），实现深（parse / dedupe / prompt / persist / notify 五步）。
- ✅ E2E 测一遍覆盖三种来源（popup / content screenshot / content station）。
- ✅ 新增"剪贴板 QR"、"拖拽 QR"接入零成本。
- ❌ popup 与 content 必须分别提供 `writer`（不能共享 mutator）；这是显式成本，但保证 content 不依赖 React。
- ❌ test 文件增加；本仓库无单元测试，但接口设计本身让黑盒 E2E 测更稳。

## 反向引用

- 实现 PR：S9 commit `TBD`
- 词汇：见 `CONTEXT.md` 第 6 节（Intake）。

## 备选方案（已否决）

- **方案 B：把 Intake 推到 chrome.runtime 远程调用**：本就是跨 context，重复利用现有 `sendMessage`，不需要在 SW 层再加一层。
- **方案 C：仅抽函数不抽 module**：三处调用方还得各自 import `intakeOtp`；不加深模块边界，只减少行数。
