# ADR-0004: 按执行环境分层（utils 收敛 + content bundle 预算）

> 状态：已采纳（feat/migrate-wxt-clean，2026 目录重组）

## 上下文

迁移到 WXT 后 `utils/` 是一个平铺 grab-bag：20 个文件里混着

- 双端纯原语（`cn`、`otpauth` URL 解析、`qr` 解码）
- popup-only React hooks（`storage-hook`、`hooks`、`use-modal-stack`）
- content-only 页面注入 UI（`css-portal`、`message`(toast)、`gradient-text`、`selection-overlay`、`otp-autofill`、`recovery-prompt`、`dom-highlight`）
- OTP 领域逻辑（`storage`、`otp-crud`）

「哪些能进 content script」只存在于开发者记忆里，没有任何结构性约束。后果是三个方向的实际泄漏，全部用 `pnpm build` 产物实测过：

| 泄漏 | 机制 | 实测 |
|---|---|---|
| Node 垫片 | `intake.ts` 只解析 otpauth URL，却 import `auth.ts`（内含 otplib）→ `vite-plugin-node-polyfills` 把 crypto/buffer/stream/util 打进 content | `global.content` 608.3 KB → 拆出 `otpauth.ts` 后 **155.9 KB** |
| React | `~/features/otp-intake` barrel 同时 re-export `adapters/popup.tsx`；项目未声明 `sideEffects: false`，Rollup 无法丢弃该模块副作用 | 每 content entry **+6.4 KB** |
| 反向依赖 | popup 的 `otp-remaining.tsx` 为拿 `getProgressColor` import content-only 的 `css-portal.ts` | popup 产物含 `g2fa-portal` 样式基础设施 |

`global.content` 的 `matches` 是 `<all_urls>` —— 上述体积要乘以「用户访问的每个网页」。

## 决策

1. **按执行环境分层**，`utils/` 收敛为双端纯原语（最终 7 个文件）：
   `clipboard` `cn` `constants` `otpauth` `qr-decode` `totp` `types`。
   禁止：import React、注入持久 DOM 节点、调用扩展 API、持有业务状态。

2. **其余按层下沉**：
   - `features/page-ui/` —— 宿主页面 DOM/CSS 注入（React-free，popup 与 content 都可用）
   - `features/ui-state/` —— React hooks（theme / storage / modal）
   - `features/runtime/` —— 扩展 API 探测
   - `features/site-content/dom/` —— content-only 的 SPA 等待与路由匹配
   - `features/otp-store/` —— `store.ts`（存储层，无 React）+ `otp-crud.ts`（纯合并）
     + `context.tsx`（唯一 React 入口）

3. **barrel 不变式**：content script 会 import 的 barrel 必须 React-free。
   `features/otp-intake/index.ts` 只导出 `intakeOtp` / `createContentIntake` / 类型；
   popup 适配器走深路径 `features/otp-intake/adapters/popup`。

4. **content bundle 预算**（写进 `CONTEXT.md`，改动 content 依赖后必须复核）：
   `global.js` < 200 KB；`github.js` / `npm.js` < 620 KB。

5. **`utils/totp.ts` 是 otplib 的唯一落点**。只做 URL 解析的路径 import `utils/otpauth.ts`。

## 后果

- ✅ 环境边界变成结构性的：`import "~/utils/*"` 永不引入 React / 扩展 API / 业务状态。
- ✅ 实测总产物 3.44 MB → 2.96 MB；`global.content` -74%；三个 content bundle 中
  `SECRET_INTERNALS` / `useCallback` 均为 0，React 只留在 popup/settings 的 modulepreload chunk。
- ✅ `message.ts` → `toast.ts` 消掉了与 `features/messaging` 的重名（CONTEXT.md 命名冲突表补登记）。
- ✅ 删掉 5 处零消费者死代码 + 1 个零调用 barrel；`e2e/fixtures/mock-data.ts` 从
  「注释说黑盒、代码却 import 项目内类型」改为真正的黑盒。
- ❌ 移动约 20 个文件、改写 60+ 处 import，diff 较大；靠 `tsc --noEmit` + E2E 8/8 兜底。
- ❌ 增加目录数（`features/` 下从 4 个变 8 个），新增文件的落点需要判断而非直觉。

## 反向引用

- 词汇与分层表：`CONTEXT.md` 的 `## 分层不变式（执行环境）`
- 实现 commit：`d97653a`（page-ui）、`2b37621`（utils 拆分更名）、`9fd411a`（hooks/领域逻辑下沉）、`e47914a`（barrel React-free）
- 前序：ADR-0001（单一 OTP Store）、ADR-0002（otp-intake）

## 备选方案（已否决）

- **方案 B：只删死代码 + 改 3 个名字，不动目录**。零风险，但 12/20 文件放错位置的问题原样保留，
  「哪些能进 content」继续靠记忆，同类泄漏会再次发生。
- **方案 C：保留 `utils/` 平铺，改用 ESLint `no-restricted-imports` 兜边界**。
  能拦住新建泄漏，但拦不住既有结构混乱；且 lint 规则表达力不如目录本身清晰。

## 待办（未包含在本 ADR 的决定内）

### 1. otplib 仍是最大的一块 —— 已完成，见 ADR-0006

~~`github.js` / `npm.js` 仍为 ~606 KB，主因是 `utils/totp.ts` → otplib → 4 个 Node 垫片（约 440 KB）。~~
**已完成**：内联 HMAC 取代 otplib，`github.js` / `npm.js` 降至 ~159 KB。
完整的方案对比、otplib 兼容语义清单与 18 万项对拍数据见 ADR-0006。

保留以下两个当时评估过、最终被否决的选项作为记录：

- 选项 1：用 Web Crypto `crypto.subtle` 重写 TOTP（约 60 行），移除 `otplib` 与
  `vite-plugin-node-polyfills`。实测可省 442.5 KB × 3（ADR-0005 的 E1/E2 实验：
  github.js 605.5 → 163.0）。
  ~~**风险**：`crypto.subtle` 仅存在于 secure context，`http://` 页面为 `undefined`，
  需要纯 JS HMAC-SHA1 兜底~~
  **更正（2026）**：该风险按当前架构不成立。调用 OTP 生成的全部路径都在
  secure context —— popup 是 `chrome-extension://`，github / npm content 的
  `matches` 均为 `https://`；唯一匹配 `<all_urls>`（含 http）的 `global.content`
  不碰 OTP 生成。
  **真正否决它的理由**：`crypto.subtle` 只有 Promise 接口，会把 `generateOtp`
  变异步，牵动 `components/otp-text.tsx`（React 渲染路径）与
  `features/page-ui/otp-autofill.ts`（content 注入）。详见 ADR-0006。
- 选项 2：把 OTP 生成移到 background service worker，content 侧走消息。
  **风险**：`otp-autofill` 每秒刷新一次，会产生每秒一条消息。
- 无论选哪个都需要单独立 ADR；验收网是 E2E 里用独立 `otplib` 算期望值的黑盒断言。
