# E2E Specs — 黑盒测试清单

> 本文件是 `feat/test-e2e` 分支下所有 E2E spec 的索引与执行顺序。
> 测试原则：**黑盒**——不 import 项目代码，仅通过加载 unpacked 扩展、模拟用户操作、读取 DOM / clipboard / `chrome.storage` 来验证。

## 1. 目录结构

```
e2e/
├── SPECS.md                  # 本文件
├── playwright.config.ts      # Playwright 配置（root level 或 e2e/）
├── fixtures/
│   ├── extension.ts          # 加载 unpacked 扩展的 fixture
│   ├── mock-pages.ts         # mock 第三方页面（GitHub / NPM / 普通）
│   ├── test-secret.ts        # 测试用 secret + 已知 OTP 向量
│   └── qr-fixtures.ts        # 二维码 PNG fixture（base64）
├── specs/
│   ├── 01-popup.spec.ts      # F1 主界面
│   ├── 02-header.spec.ts     # F2 Header
│   ├── 03-list.spec.ts       # F3 List
│   ├── 04-account-crud.spec.ts   # F4 CRUD
│   ├── 05-otp.spec.ts        # F5 OTP
│   ├── 06-recovery-codes.spec.ts # F6 恢复码
│   ├── 07-qr-scan.spec.ts    # F7 二维码扫描 4 条路径
│   ├── 08-github.spec.ts     # F8 GitHub 集成
│   ├── 09-npm.spec.ts        # F9 NPM 集成
│   ├── 10-settings.spec.ts   # F10 设置页
│   ├── 11-toast.spec.ts      # F11 Toast — 删（F11 不实现）
│   ├── 12-background.spec.ts # F12 Background & 迁移
│   └── 13-entry-actions.spec.ts # F13 FAB 入口操作（空态自动展开 / 点击空白收起）
└── artifacts/                # 测试产物（gitignore）
    └── .gitkeep
```

## 2. 全局约定

### 真实 / Mock 边界

- ✅ **真实**：浏览器（Playwright bundled chromium）、扩展加载、MV3 SW、`chrome.*` API、DOM 交互、chrome.storage 持久化、Content Script 注入、OTP 计算
- ✅ **真实第三方**：GitHub / NPM 用**专用 test 账号 + TOTP secret** 走真 enable/disable 2FA 流程（凭证在 `e2e/.env.e2e`，已 gitignore）
- 🔶 **Mock**：仅 F7 QR 扫描（用 `qrcode` 库生成 PNG，不接真手机摄像头）

### 技术约定

- **加载方式**：`pnpm build` 产物路径 `.output/chrome-mv3`
- **userDataDir**：每个 spec 用独立 `userDataDir`（隔离 storage）；持久化相关 case 用固定 dir
- **OTP 断言**：用 `otplib` 独立库计算期望值（不 import 项目 `utils/libs/totp.ts`）。
  数值正确性类断言用 `page.clock.setFixedTime()` 固定时钟做**精确相等**，不用容差；
  只有无法固定时钟的场景才容忍 ±1s。参考 `05-otp.spec.ts`
- **OTP 参数覆盖**：新增跟 OTP 显示相关的 case 时，至少覆盖一个**非默认配置**
  （`digits=8` / `algorithm=SHA256` / `period=60`）—— 这三个参数曾经在组件层被
  静默丢弃，而默认配置的用例完全测不出来（ADR-0008）
- **第三方测试前重置**：`e2e/setup/reset-2fa.ts` 读 env → 自动 disable GitHub / NPM 现有 2FA → 保证 idempotent
- **时间控制**：用 `page.clock.install()` 控制 fake 时钟；或容忍 ±1s
- **摄像头 / 选区**：用 `fakeMediaStream` 注入视频流；手动截图选区用 `page.mouse.down/move/up`

### 断言策略（核心原则：只关注功能）

> E2E 只验证**功能行为**——文案 / 颜色 / 动效是样式层，进 e2e 是过度测试。
> 这条原则与「i18n 上线」「主题切换」无关——文案和颜色无论如何都会被调整。

- **✅ 测**（功能层）
  - 列表项数变化（filter / 搜索 / 增删改后）
  - OTP 数值（otplib 期望值对比）
  - progress.value / remaining 秒数 / max
  - 剪贴板内容（OTP / otpauth URL / 恢复码 value）
  - 下载事件触发 + `suggestedFilename`
  - dropdown / modal 打开状态
  - 表单提交后 list 数据更新 / 持久化层 storage
  - `chrome.storage.sync` 持久化

- **❌ 不测**（样式 / 文案层）
  - **UI 文案**：placeholder / 按钮文字 / 弹层标题 / 表单 label / toast 文本
  - **具体色值**：`rgb(...)` / `getComputedStyle().backgroundColor` 验具体色值
  - **动效**：`opacity-0 → opacity-100` 的过渡、toast 3s 自动消失、堆叠动画

- **✅ 保留**（daisyUI 语义 className）
  - `bg-base-300` / `shadow-lg` / `progress-primary|warning|error` /
    `badge-accent|ghost|secondary` / `animate-pulse` / `line-through`
  - 理由：这些是**状态分类 token**（主题色切换只改 CSS 变量，不改类名），
    与具体颜色解耦。

- **定位稳定性**：核心交互元素（菜单 / FAB / 弹层 / ItemActionSheet 各按钮 / 进度条 / OTP）
  统一用 `data-testid` 定位。`data-tip` 是文案属性，仅为兼容 `07-qr-scan.spec.ts` 保留。

- **假设契约**（被打破时同步更新）：
  - popup 文案当前未接 i18n 框架（`chrome.i18n` 仅用于扩展元数据 `appName` / `appDescription`）；
    未来 i18n 重构时组件加 `data-i18n-key`，spec 不需要大改。
  - 默认 `data-theme="light"`；切主题不影响 className，spec 无需调整。

- **不属于 popup e2e 范围**：
  - **F11 toast（Case 77-80）不实现**——颜色 / 消失 / 堆叠全是样式层。
  - toast 节点的 `data-testid="toast"` + `data-testid-toast-kind` 保留，供其他 case 定位 toast 出现。

## 3. Spec 清单（92 条，F11 4 条删除）

> 格式：`<file> > <describe> > <it>`。优先级 P0 = 必须 / P1 = 重要 / P2 = 边界

### F1. Popup 主界面加载与渲染 → `01-popup.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 1 | P0 | `popup > 首次安装无数据` | `显示 no-data.svg，无报错` |
| 2 | P0 | `popup > 已有账户` | `渲染 List 显示全部账户` |
| 3 | P0 | `popup > 加载性能` | `<2s 内出列表` |
| 4 | P1 | `popup > dark 主题` | `背景为暗色` |
| 5 | P1 | `popup > PHONE 布局` | `mockup-phone 容器` |

### F2. Header → `02-header.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 6 | P0 | `header > 菜单展开` | `Dropdown 弹出全部/已删除/设置` |
| 7 | P0 | `header > 搜索过滤` | `输入 issuer 子串 → List 实时过滤` |
| 8 | P0 | `header > 清空搜索` | `List 恢复全部` |
| 9 | P1 | `header > 菜单→设置` | `新 tab 打开 tabs/settings.html` |
| 10 | P1 | `header > 过滤→已删除` | `List 只显示 deleted=true + badge 显示数量` |
| 11 | P1 | `header > 过滤→全部` | `切回 normal 过滤` |

### F3. List → `03-list.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 12 | P0 | `list > 空列表` | `显示 no-data.svg 脉冲动画` |
| 13 | P0 | `list > 列表项` | `显示 issuer/account/当前 OTP/下一 OTP/Favicon` |
| 14 | P0 | `list > hover 项` | `显示 FileCog 操作按钮` |
| 15 | P1 | `list > pinned 项` | `左侧 accent 条 + shadow` |
| 16 | P1 | `list > deleted 项` | `灰色样式 + 禁用 OTP` |
| 17 | P1 | `list > 已删除过滤` | `不显示 normal 项` |
| 18 | P2 | `list > Dropdown 条件显示` | `normal 显示"已删除(N)"，N>0 才显示` |
| 19 | P2 | `list > Dropdown 条件显示` | `deleted 显示"全部(N)"` |

### F4. 账户 CRUD → `04-account-crud.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 20 | P0 | `crud > 手动输入` | `填齐 issuer/secret/account → List 多一项` |
| 20b | P0 | `crud > 同账号多密钥` | `同 issuer/account 不同 secret → 两条并存（旧条目不软删）；身份全等 → warn 不新增` |
| 20c | P0 | `crud > 同 secret 不同 digits` | `8 位种子 + 缺省 6 位新增 → 两条；参数缺省归一化后再判已存在` |
| 21 | P0 | `crud > 必填校验` | `issuer/secret/account 缺一 → OK 按钮 disabled` |
| 22 | P0 | `crud > 编辑` | `改字段 → 保存 → List 内容更新` |
| 23 | P0 | `crud > 软删` | `deleted=true → 切到"已删除"能看到` |
| 24 | P0 | `crud > 恢复` | `从已删除列表恢复 → 切回 normal 能看到` |
| 25 | P0 | `crud > 硬删` | `已删除项再次删 → 数据消失` |
| 26 | P1 | `crud > 置顶` | `排在最前 + accent 条 + shadow` |
| 27 | P1 | `crud > 取消置顶` | `恢复普通顺序` |
| 28 | P1 | `crud > 二维码弹层` | `显示账户的 QRCodeCanvas` |
| 29 | P1 | `crud > 二维码复制` | `剪贴板含完整 otpauth URL` |
| 30 | P1 | `crud > 二维码下载` | `触发 PNG 下载（文件名含 issuer-account-时间）` |

### F5. OTP 显示与复制 → `05-otp.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 31 | P0 | `otp > 显示格式` | `6 位数字，分两段（3+3）` |
| 32 | P0 | `otp > 实时刷新` | `每秒 DOM 内容变化` |
| 33 | P0 | `otp > 点击复制` | `剪贴板含 OTP + toast 复制成功` |
| 34 | P0 | `otp > 进度条` | `显示剩余时间 30→0` |
| 35 | P1 | `otp > 进度条颜色` | `>10s 蓝，>3s 黄，≤3s 红` |
| 36 | P1 | `otp > 下一周期` | `数字与 otplib 算的一致` |

> **当前进度**：31 / 34 / 36 / digits=8 / algorithm=SHA256 / algorithm=SHA512 /
> period=60 / 脏数据兜底 已实现于 `05-otp.spec.ts`（共 9 条），均用固定时钟做精确断言，
> 并已用变异测试验证断言有区分力。
> 32（每秒刷新）/ 33（点击复制）/ 35（进度条颜色）待补。
>
> 后 4 条是 ADR-0008 的回归网：它们盯的是「存储条目里的
> `digits` / `period` / `algorithm` 是否被一路传到生成函数」。
> **修复前这 3 条全部失败**（都显示同一个 SHA1/6/30 值），可作为“验收网确实生效”的证据。

### F6. 恢复码 → `06-recovery-codes.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 37 | P0 | `recovery > 弹层显示` | `ItemActionSheet 点恢复码 → 弹层显示所有 codes` |
| 38 | P0 | `recovery > 复制恢复码` | `剪贴板含该码 → 1s 后图标变 ✓ → 文字划掉` |
| 39 | P0 | `recovery > 状态持久化` | `刷新 popup → 已复制状态保留` |
| 40 | P1 | `recovery > 无 codes 时按钮隐藏` | `无 recoveryCodes 不显示按钮` |
| 41 | P1 | `recovery > 全部 copied 样式` | `图标都是 CopyCheck` |

### F7. 二维码扫描 → `07-qr-scan.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 42 | P0 | `qr > 自动扫描 img` | `mock 页含有效 otpauth img → 接收 data → 保存` |
| 43 | P0 | `qr > 自动扫描 canvas` | `mock 页含有效 canvas → 同上` |
| 44 | P0 | `qr > 自动扫描无 QR` | `toast + fallback 到手动截图` |
| 45 | P0 | `qr > 上传有效 QR` | `解析 → 预览 OTP → 保存` |
| 46 | P0 | `qr > 上传无效图片` | `提示"无效的 OTP Auth URL"` |
| 47 | P0 | `qr > 粘贴截图` | `clipboard image → 同上传流程` |
| 48 | P0 | `qr > 上传缺 account` | `要求输入 account 后保存` |
| 49 | P0 | `qr > 上传重名检测` | `提示"该账户已存在"` |
| 50 | P1 | `qr > 手动截图选区` | `拖拽 → 解析 → 保存` |
| 51 | P1 | `qr > 手动截图 ESC 退出` | `ESC 关闭选区` |
| 52 | P1 | `qr > 手动截图非 otpauth` | `toast 警告` |
| 53 | P1 | `qr > 手动截图无 account` | `prompt 输入后保存` |
| 54 | P2 | `qr > 自动扫描不可注入` | `受限页面 → 按钮 disabled` |
| 55 | P2 | `qr > 上传预览` | `secret 解析后显示 OTP + 进度条` |

> **当前进度**：45 / 46 已实现于 `07-qr-scan.spec.ts`（另有 1 条 jsQR 按需加载断言）。
> 54 拆成 54a（受限页面 → disabled）/ 54b（可注入页面 → enabled）两条，已实现：
> 受限页用 `chrome://version/`，可注入页用 mock `https://injectable.test/`；两条都先
> 让另一个 tab 成为 active tab，再 reload popup 触发 `canInjectContentScript()` 重新探测。
> 42-44（自动扫描）、47-49（粘贴 / 缺 account / 重名）、50-53（手动截图）待补，
> 且它们是 content 侧 jsQR 改造的前置条件（ADR-0007）。

### F8. GitHub 集成 → `08-github.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 56 | P0 | `github > confirm-access 注入` | `mock 含 input#app_totp + 1 个账户 → 插入 OTP 容器` |
| 57 | P0 | `github > confirm-access autoFill` | `input.value = OTP` |
| 58 | P0 | `github > confirm-access 0 账户` | `不注入` |
| 59 | P1 | `github > confirm-access 多账户` | `插入 2 个 OTP 容器 + autoFill=false` |
| 60 | P1 | `github > QR 设置页保存` | `mock 含 img.qr-code-img + saveButton → 解析 → 保存` |
| 61 | P1 | `github > QR 非 otpauth` | `不保存` |
| 62 | P0 | `github > recovery-codes 注入` | `mock 含 ul.two-factor-recovery-codes → 插入提示` |
| 63 | P0 | `github > recovery-codes 提示状态` | `已保存显示"已成功保存"，未保存点击后保存` |
| 64 | P1 | `github > QR 设置页 placeholder` | `mock 含 appOtpInput → 显示 OTP placeholder` |

### F9. NPM 集成 → `09-npm.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 65 | P0 | `npm > confirm-access 注入` | `mock 含 input#login_otp + URL 含 /settings/*/tfa + 有账户 → 插入 + autoFill` |
| 66 | P0 | `npm > confirm-access 0 账户` | `不注入` |
| 67 | P0 | `npm > confirm-access URL 不匹配` | `不注入` |
| 68 | P0 | `npm > recovery-codes 注入` | `mock 含 div[role=button] → 插入提示 → 点击保存` |
| 69 | P0 | `npm > settings-2fa 完整流程` | `mock 含 QR + input#enable_otp + submit → 高亮 + 插入 + 保存` |
| 70 | P1 | `npm > settings-2fa QR 无 secret` | `不保存` |

### F10. 设置页 → `10-settings.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 71 | P0 | `settings > 加载` | `显示"布局模式 / 主题"两栏` |
| 72 | P0 | `settings > 切换布局` | `DEFAULT ↔ PHONE 预览图实时变化` |
| 73 | P0 | `settings > 切换主题` | `实时应用到 html data-theme + popup 同步` |
| 74 | P0 | `settings > 32 个主题` | `默认 10 张 +「展示更多」→ 32 张全部可点 →「收起」回到 10 张` |
| 75 | P1 | `settings > 选择持久化` | `关再开 → 选择保留` |
| 76 | P1 | `settings > title` | `document.title 为 chrome.i18n.getMessage("extensionName")` |

### F11. Toast → **不实现**

> 按 §2 「断言策略」原则——toast 是样式层（颜色 / 消失 / 堆叠全是 UI 反馈层），
> 不进 popup e2e。F12 Case 93 的 `chrome.i18n` 验证仍保留在 Background 范畴。

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| ~~77~~ | ~~P0~~ | ~~`toast > 4 种类型`~~ | ~~`success/error/info/warning 颜色 + 文字`~~ |
| ~~78~~ | ~~P0~~ | ~~`toast > 自动消失`~~ | ~~`默认 3s 消失`~~ |
| ~~79~~ | ~~P1~~ | ~~`toast > 自定义 duration`~~ | ~~`10s 按设定消失`~~ |
| ~~80~~ | ~~P2~~ | ~~`toast > 多条堆叠`~~ | ~~`多条同时显示`~~ |

### F12. Background & 迁移 → `12-background.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 81 | P0 | `background > 右键菜单 3 项` | `Issues & 需求 / 查看源码 / 设置` |
| 82 | P0 | `background > 右键→设置` | `新 tab 打开 settings.html` |
| 83 | P0 | `background > 右键→Issues` | `打开 github issues URL` |
| 84 | P0 | `background > 右键→源码` | `打开 github 仓库 URL` |
| ~~85~~ | ~~P0~~ | ~~`background > 旧数据迁移`~~ | ~~`预置 LEGACY_DATA → DATA 数组迁移`~~ |
| ~~86~~ | ~~P0~~ | ~~`background > 迁移字段处理`~~ | ~~`id 含时间戳；无 value 的 code 被过滤；secret 缺失的整个跳过`~~ |
| 87 | P0 | `background > 持久化关 popup` | `关 popup 重开 → 数据仍在` |
| 88 | P0 | `background > 持久化关浏览器` | `userDataDir 重启 context → 数据仍在` |
| 89 | P1 | `background > CAPTURE 成功` | `返回 {success:true, image:dataUrl}` |
| 90 | P1 | `background > CAPTURE 失败` | `受限页 → 返回 {success:false}` |
| 91 | P1 | `background > saveOTP 去重逻辑` | `身份全等（7 项）→ 合并同一条；同 issuer/account 不同 secret → 两条并存` |
| 92 | P2 | `background > saveOTP 字段校验` | `缺字段 → 抛错` |
| 93 | P2 | `background > i18n` | `zh → 中文；en → 英文；7 个 key 都能取到` |

> Case 85 / 86 已删除。核实后判定 v1.7（GitHub v2 分支，1.7.0）和 v3.0.0（当前）
> 的 `DataProps` 形态完全一致（`sync:data` / `recoveryCodes.copied` /
> 字段集对得上），v1.7 → v3.0.0 不需要保留 `adaptLegacyData` 迁移函数。
> `background.ts::adaptLegacyData` + `StorageKey.LEGACY_DATA` + `LEGACY_KEY`
> + fixture 相关 helper 已一并删除。
>
> Case 87 已实现于 `e2e/specs/12-background.spec.ts`（验证 chrome.storage.sync
> 在 popup 关闭重开后的持久性）。

### F13. FAB 入口操作 → `13-entry-actions.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 94 | P0 | `entry-actions > 空态自动展开` | `首次安装无数据 → 打开 popup 操作项自动展开` |
| 95 | P0 | `entry-actions > 收起` | `点击 FAB 外部空白 → 操作项收起` |
| 96 | P1 | `entry-actions > 有数据不展开` | `已有普通账户 → 不自动展开` |

> F13 覆盖 `EntryActions`（右下角 FAB）的状态机。展开 / 收起以操作项容器
> `[data-testid="fab-actions"]` 的**透明度**为信号（真实显示机制，不依赖色值 / 文案）。
>
> 落地时发现并修复两个问题：
> 1. `entry-actions.tsx` 原 `skipAutoExpandRef` 会连带跳过「首次安装空列表」的
>    自动展开，导致空态引导只在「删到最后一笔」时触发；改为等
>    `useOtpListLoaded()`（`features/otp-store` 新增）后再判空。
> 2. `fixtures/extension.ts::clearStorage` 原为 fire-and-forget（未 await），
>    下一条用例可能读到上一条的种子数据；改为 await + 非空才写（避开
>    `chrome.storage.sync` 的 MAX_WRITE_OPERATIONS_PER_MINUTE 配额）。

## 4. 执行顺序

| 阶段 | spec 文件 | 工时 | 通过门槛 |
|---|---|---|---|
| 基建 | `playwright.config.ts` + `fixtures/*` + hello-popup | 1 天 | hello-popup 跑通 |
| P0 第 1 批 | `01/02/03/04/05/06-popup, header, list, crud, otp, recovery` (Case 1-41) | 1.5 天 | 全绿 |
| P0 第 2 批 | `07-qr-scan` (Case 42-49) + `08-github` (56-63) + `09-npm` (65-69) | 2 天 | 全绿 |
| P0 第 3 批 | `10-settings` (71-74) + `12-background` (81-88) | 1 天 | 全绿 |
| P1 收尾 | P1 所有剩余 case (29 条) | 1.5 天 | 全绿 |
| P2 + CI | P2 (9 条) + `.github/workflows/ci.yml` + README | 1 天 | CI 跑通 |

## 5. Fixtures 设计

### `fixtures/extension.ts`
```ts
export const test = baseTest.extend<{
  extension: { context, extensionId, popup }
}>({
  extension: async ({}, use) => {
    const EXT_PATH = '.output/chrome-mv3'
    const userDataDir = `.pw-userdata-${Date.now()}-${Math.random()}`
    const context = await chromium.launchPersistentContext(userDataDir, {
      args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`]
    })
    const [sw] = context.serviceWorkers()
    const extensionId = sw.url().split('/')[2]
    const popup = await context.newPage()
    await popup.goto(`chrome-extension://${extensionId}/popup.html`)
    await use({ context, extensionId, popup })
    await context.close()
  }
})
```

### `fixtures/test-secret.ts`

常量与期望值计算分开导出：常量是 RFC 6238 风格向量，`expectedOtp()` 用独立
`otplib` 算期望值。**注意 `epoch` 必须放进 `authenticator.options`** —— otplib 的
options 是浅合并，只有 `_options` 里的字段生效，直接挂 `_epoch` 是空操作。

```ts
export const TEST_SECRET = 'JBSWY3DPEHPK3PXP' // 标准测试密钥
export const TEST_ISSUER = 'TestApp'
export const TEST_ACCOUNT = 'testuser'
export const TEST_OTPAUTH_URL = `otpauth://totp/${TEST_ISSUER}:${TEST_ACCOUNT}?secret=${TEST_SECRET}&issuer=${TEST_ISSUER}`

type ExpectedOtpAlgorithm = 'sha1' | 'sha256' | 'sha512'
interface ExpectedOtpOptions {
  secret?: string
  algorithm?: ExpectedOtpAlgorithm
  digits?: number
  step?: number
  date?: Date        // 不传则用当前时间
}
export function expectedOtp(options?: ExpectedOtpOptions): string
export function expectedNextOtp(options?: ExpectedOtpOptions): string
export function expectedRemainingTime(date?: Date, step?: number): number
```

用法（固定时钟 + 精确断言）：

```ts
const FIXED_TIME = new Date('2026-01-15T00:00:07.000Z')
await popup.clock.setFixedTime(FIXED_TIME)
await popup.reload()
expect(shown).toBe(expectedOtp({ secret: TEST_SECRET, date: FIXED_TIME }))
```

### `fixtures/qr-fixtures.ts`

导出三个 PNG 的绝对路径（按仓库根解析，与 `EXT_PATH` 同一约定）：

| 文件 | 内容 | 用途 |
|---|---|---|
| `qr/otpauth-valid.png` | `TEST_OTPAUTH_URL`（含 account） | 走通解码 + 预览 |
| `qr/not-otpauth.png` | 普通 https URL | 能解码但不是 otpauth |
| `qr/no-qr.png` | 纯色，无二维码 | 解码失败分支 |

生成方式：前两个 `npx qrcode -o <f> -w 320 -e M "<text>"`；
`no-qr.png` 由脚本手写（zlib + CRC32 的最小 PNG）。
三者都用 jsQR 直接解码自检过内容。**加新 fixture 后请重复这个自检。**

> 注意 `qrcode` CLI 的 `-q` 是 quiet zone、`-e` 才是纠错级别；写成 `-q M` 会
> 静默得到 “No data provided” 而拿不到文件。

### `fixtures/mock-pages.ts`
- `mockGitHubConfirmAccessPage()` — 含 `input#app_totp` + meta username
- `mockGitHubQrSetupPage()` — 含 `img.qr-code-img` + `button[data-target='two-factor-configure-otp-factor.saveButton']`
- `mockGitHubRecoveryCodesPage()` — 含 `ul.two-factor-recovery-codes` + li
- `mockNpmLoginOtpPage()` — 含 `input#login_otp` + URL 模板
- `mockNpmRecoveryCodesPage()` — 含 `div[role=button]` + p
- `mockNpmSettings2faPage()` — 含 QR + `input#enable_otp` + submit
- `mockGenericPageWithQrImg()` — 普通页含 `<img>` QR
- `mockGenericPageWithQrCanvas()` — 普通页含 `<canvas>` QR

## 6. 不在范围内

- ❌ 单元测试（用户明确不要）
- ❌ 性能基准（除 #3 加载时间外）
- ❌ 真实 GitHub / NPM 页面（用 mock）
- ❌ React 组件内部 state 断言（只看渲染 DOM）

