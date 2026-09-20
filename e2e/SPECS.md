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
│   ├── 11-toast.spec.ts      # F11 Toast
│   └── 12-background.spec.ts # F12 Background & 迁移
└── artifacts/                # 测试产物（gitignore）
    └── .gitkeep
```

## 2. 全局约定

### 真实 / Mock 边界

- ✅ **真实**：浏览器（Playwright bundled chromium）、扩展加载、MV3 SW、`chrome.*` API、DOM 交互、chrome.storage 持久化、Content Script 注入、OTP 计算
- ✅ **真实第三方**：GitHub / NPM 用**专用 test 账号 + TOTP secret** 走真 enable/disable 2FA 流程（凭证在 `e2e/.env.e2e`，已 gitignore）
- 🔶 **Mock**：仅 F7 QR 扫描（用 `qrcode` 库生成 PNG，不接真手机摄像头）

### 技术约定

- **加载方式**：`pnpm build` 产物路径 `build/chrome-mv3-prod`（Plasmo）；迁移到 WXT 后改为 `.output/chrome-mv3`
- **userDataDir**：每个 spec 用独立 `userDataDir`（隔离 storage）；持久化相关 case 用固定 dir
- **OTP 断言**：用 `otplib` 独立库计算期望值，`±1s` 容差（不 import 项目 `utils/auth.ts`）
- **第三方测试前重置**：`e2e/setup/reset-2fa.ts` 读 env → 自动 disable GitHub / NPM 现有 2FA → 保证 idempotent
- **时间控制**：用 `page.clock.install()` 控制 fake 时钟；或容忍 ±1s
- **摄像头 / 选区**：用 `fakeMediaStream` 注入视频流；手动截图选区用 `page.mouse.down/move/up`

## 3. Spec 清单（93 条）

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

### F6. 恢复码 → `06-recovery-codes.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 37 | P0 | `recovery > 弹层显示` | `ItemActions 点恢复码 → 弹层显示所有 codes` |
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
| 74 | P0 | `settings > 32 个主题` | `全部可点` |
| 75 | P1 | `settings > 选择持久化` | `关再开 → 选择保留` |
| 76 | P1 | `settings > title` | `document.title 为 chrome.i18n.getMessage("extensionName")` |

### F11. Toast → `11-toast.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 77 | P0 | `toast > 4 种类型` | `success/error/info/warning 颜色 + 文字` |
| 78 | P0 | `toast > 自动消失` | `默认 3s 消失` |
| 79 | P1 | `toast > 自定义 duration` | `10s 按设定消失` |
| 80 | P2 | `toast > 多条堆叠` | `多条同时显示` |

### F12. Background & 迁移 → `12-background.spec.ts`

| # | 优先级 | describe/it | Case |
|---|---|---|---|
| 81 | P0 | `background > 右键菜单 3 项` | `Issues & 需求 / 查看源码 / 设置` |
| 82 | P0 | `background > 右键→设置` | `新 tab 打开 settings.html` |
| 83 | P0 | `background > 右键→Issues` | `打开 github issues URL` |
| 84 | P0 | `background > 右键→源码` | `打开 github 仓库 URL` |
| 85 | P0 | `background > 旧数据迁移` | `预置 LEGACY_DATA → DATA 数组迁移` |
| 86 | P0 | `background > 迁移字段处理` | `id 含时间戳；无 value 的 code 被过滤；secret 缺失的整个跳过` |
| 87 | P0 | `background > 持久化关 popup` | `关 popup 重开 → 数据仍在` |
| 88 | P0 | `background > 持久化关浏览器` | `userDataDir 重启 context → 数据仍在` |
| 89 | P1 | `background > CAPTURE 成功` | `返回 {success:true, image:dataUrl}` |
| 90 | P1 | `background > CAPTURE 失败` | `受限页 → 返回 {success:false}` |
| 91 | P1 | `background > saveOTP 三段逻辑` | `软删 + 同 issuer/account 新增 → 旧 deleted，新追加` |
| 92 | P2 | `background > saveOTP 字段校验` | `缺字段 → 抛错` |
| 93 | P2 | `background > i18n` | `zh → 中文；en → 英文；7 个 key 都能取到` |

## 4. 执行顺序

| 阶段 | spec 文件 | 工时 | 通过门槛 |
|---|---|---|---|
| 基建 | `playwright.config.ts` + `fixtures/*` + hello-popup | 1 天 | hello-popup 跑通 |
| P0 第 1 批 | `01/02/03/04/05/06-popup, header, list, crud, otp, recovery` (Case 1-41) | 1.5 天 | 全绿 |
| P0 第 2 批 | `07-qr-scan` (Case 42-49) + `08-github` (56-63) + `09-npm` (65-69) | 2 天 | 全绿 |
| P0 第 3 批 | `10-settings` (71-74) + `11-toast` (77-78) + `12-background` (81-88) | 1 天 | 全绿 |
| P1 收尾 | P1 所有剩余 case (29 条) | 1.5 天 | 全绿 |
| P2 + CI | P2 (9 条) + `.github/workflows/ci.yml` + README | 1 天 | CI 跑通 |

## 5. Fixtures 设计

### `fixtures/extension.ts`
```ts
export const test = baseTest.extend<{
  extension: { context, extensionId, popup }
}>({
  extension: async ({}, use) => {
    const EXT_PATH = 'build/chrome-mv3' // WXT 迁移后改为 '.output/chrome-mv3'
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
```ts
// RFC 6238 风格测试向量（与项目 otplib 默认 SHA1/6/30 对齐）
export const TEST_SECRET = 'JBSWY3DPEHPK3PXP' // 标准测试密钥
export const TEST_ISSUER = 'TestApp'
export const TEST_ACCOUNT = 'testuser'
export const TEST_OTPAUTH_URL = `otpauth://totp/${TEST_ISSUER}:${TEST_ACCOUNT}?secret=${TEST_SECRET}&issuer=${TEST_ISSUER}`
```

### `fixtures/qr-fixtures.ts`
- `valid-otpauth-qr.png` — 含 TEST_OTPAUTH_URL 的 PNG（base64 写入文件）
- `invalid-image.png` — 普通图片，无 QR
- 用 Python `qrcode` 库预生成，纳入 repo

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

## 7. 迁移到 WXT 后

迁移完成后只需改一处：

```diff
- const EXT_PATH = 'build/chrome-mv3'
+ const EXT_PATH = '.output/chrome-mv3'
```

其余 93 条 spec 一行不改，全部复用。