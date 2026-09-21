# ADR-0005: 不引入位图品牌素材

> 状态：已采纳（v2.0.0 迁移期）

## 上下文

一次完整产物审计（`/tmp` 沙箱内 4 组受控构建，工作区零污染）得到基线：

**原始 2.96 MB / gzip 1.11 MB**（gzip 列 ≈ Chrome Web Store 下载量）

| 文件 | 原始 | gzip | 占下载 |
|---|---|---|---|
| `assets/github.png` | 397.8 KB | 301.4 KB | 27% |
| `chunks/style-*.js`（popup + settings） | 809.7 KB | 256.0 KB | 23% |
| `content-scripts/npm.js` | 605.7 KB | 186.4 KB | 17% |
| `content-scripts/github.js` | 605.5 KB | 186.3 KB | 17% |
| `assets/cloudflare.png` | 107.9 KB | 103.4 KB | 9% |
| `content-scripts/global.js` | 149.5 KB | 54.0 KB | 5% |
| `assets/style-*.css` | 150.5 KB | 23.5 KB | 2% |
| `assets/no-data.svg` | 40.0 KB | 9.8 KB | 1% |

归因实验（E1 只是体积探针——去掉垫片后 otplib 拿不到 `crypto`，能构建但运行时炸）：

| 实验 | github.js | npm.js | global.js | popup chunk | 原始总计 |
|---|---|---|---|---|---|
| E0 基线 | 605.5 | 605.7 | 149.5 | 809.7 | 2.96 MB |
| E1 去 `nodePolyfills`（otplib 保留） | 163.0 | 163.2 | 149.5 | 367.1 | 1.60 MB |
| E2 去 otplib | 152.7 | 152.8 | 149.5 | 356.7 | 1.57 MB |
| E3 E2 + 去 jsQR | 34.6 | 34.8 | 21.1 | 239.8 | 1.08 MB |

推出各项成本：

| 项 | 每份 | 份数 | 总计 | 占比 |
|---|---|---|---|---|
| Node 垫片（crypto/buffer/stream/util） | 442.5 KB | 3 | 1327 KB | **45%** |
| jsQR | 118.1 KB | 3 | 471 KB | 16% |
| 位图素材 | — | — | 545.7 KB | 18% |
| otplib 本体 | 10.3 KB | 3 | 31 KB | 1% |
| 业务代码地板 | 34.6 KB | — | — | — |

关键事实：`github.js` / `npm.js` 中 **94% 是第三方依赖**（73% 是 Node 垫片）；
`global.js` 中 **86% 是 jsQR**，而 jsQR 只在用户主动触发选区扫描时才用得上。

其中 `assets/github.png` 是 **3840×2160** 的装饰贴纸，在 `components/home/list.tsx`
里渲染宽度是 **120px**——用了 16 倍于所需的像素密度，且 PNG 几乎不压缩
（397.8 → gzip 301.4 KB），是当时下载量的第一大单项。

## 决策

1. **不引入位图品牌素材。** 品牌标识一律使用 `components/ui/icon.tsx` 里已有的
   矢量图标集（Simple Icons / Devicon / Logos / Skill Icons / VSCode Icons，均为
   CC0 或 MIT）。需要新品牌标识时先查该文件；没有再考虑新增 SVG，**不新增 PNG**。

2. **elegant / minimal 的区分靠尺寸，不靠素材类型。**
   - minimal → `text-xl`（20px）行内图标
   - elegant + 有装饰图标的 issuer → `w-[72px] h-[72px] absolute right-0 -top-4`
   - elegant + 其它 issuer → `text-2xl`（24px）

   72px 是换算出的等价尺寸：旧图 `w-[120px]` × 16:9 ≈ 67.5px 高。

3. **零引用素材直接删，不留在仓库里当「以后可能用得上」。**

## 后果

- 删除 6 个文件共 738 KB（其中 505.7 KB 原本进产物）：
  `github.png`(397.8) `cloudflare.png`(107.9) `icon-close.png`(107.2)
  `icon-open.png`(103.1) `icon.png`(22) `process.svg`(65 B)。
  后 4 个是零引用死资源，从不进产物，只占仓库。
- `components/favicons.tsx` 删掉 `elegantImageMap`（位图路径），改为
  `elegantIconMap`（SVG 组件），并清掉死 import `Issuers`。
- **产物：原始 2.96 → 2.44 MB（−18%）；下载 1.11 → 0.71 MB（−36%）。**
- `assets/` 只剩 `no-data.svg`。
- 代价：github / cloudflare 在 elegant 模式下不再是插画贴纸，改为品牌图标。
- 附带发现：`web_accessible_resources: ["assets/*"] + <all_urls>` 已无必要
  （见待办 4）。

## 验证方式

1. 改前 / 改后各截 8 张图（elegant × minimal × light × dark × default/phone）
   人工比对：布局无重叠、elegant 与 minimal 仍可区分、暗色主题下 `MdiGithub`
   随 `currentColor` 转白、`DeviconCloudflare` 仍为橙色。
2. **`deleted` 视图的 className 透传**（本次唯一真正的行为风险点：原来是
   `<img className>`，现在是 `<svg className>`）。用临时 spec 驱动真实 UI
   （hover 哈姆菜单 → 点「已删除」）后断言：
   - `svg.grayscale` 数量 = 1（`cn({ grayscale: deleted })` 仍生效）
   - `img[src*="github"], img[src*="cloudflare"]` 数量 = **0**（DOM 里再无位图）

临时 spec 与截图均未入库（`test-results/` 已被 gitignore），截图输出到 `/tmp`。
`pnpm compile` + `pnpm build` + E2E 8/8 通过。

**已知缺口**：Favicon 渲染没有任何自动化断言（`e2e/SPECS.md` 第 81 行的
「显示 Favicon」尚未写成 spec）。本次改动属于**无测试覆盖的视觉改动**，
靠人工截图兜底——建议在写 F1-F6 主体 spec 时补上。

## 备选方案（已否决）

- **把 PNG 缩到 240px**（最初建议）：产物 −466 KB、下载 −367 KB，且保留贴纸美术。
  否决理由：(1) 仍引入二进制素材，需额外的资产审查；(2) 同一品牌存两套素材
  （`icon.tsx` 里本来就有 SVG）；(3) 贴纸在 120px 下渲染本来就是糊的。
- **把两张贴纸重绘成 SVG**：能 1:1 保留美术，但手写两张插画 SVG 的成本远超收益，
  且没有设计源文件。
- **保留位图但延迟加载**：下载量只由字节数决定，不随加载时机减少。

## 待办（未包含在本 ADR 的决定内）

1. **Node 垫片 1327 KB —— 已完成**，见 ADR-0006。
   `utils/totp.ts` 改为内联 HMAC + base32，移除 `otplib` 与
   `vite-plugin-node-polyfills`。实测 `github.js` 605.5 → 159.4 KB，
   总体积原始 2.96 → 1.07 MB、下载 1.11 → 0.34 MB。
   本 ADR 原文的 Web Crypto 方案被否决（异步接口会牵动 React 渲染路径）。
   **更正**：原文写「`crypto.subtle` 在 `http://` 页面为 `undefined`，需纯 JS
   HMAC-SHA1 兜底」—— 按当前架构不成立（调用 OTP 生成的路径全是 secure
   context），但内联实现仍不依赖 secure context。详见 ADR-0006。
2. **jsQR 471 KB**：`global.js` 里它占 86%，而只在用户主动扫描时用。
   可改按需加载（content script 动态 import web-accessible chunk），
   但仍需保留 Firefox 回退（`BarcodeDetector` 在 Firefox 桌面端默认不可用）。
3. **`no-data.svg` 40 KB**：含 `sillyvg` 生成器属性与 96 个元素，可用 SVGO 试压。
   属小项（gzip 9.8 KB），且优化 SVG 有视觉风险，优先级低。
4. **`web_accessible_resources: ["assets/*"] + <all_urls>` 已无必要**：
   content 侧对 `assets/` 零引用、无 `runtime.getURL` 动态拼路径、注入 CSS 无
   `url()`。extension 自有页面（popup/settings）不依赖 WAR 即可加载自身资源。
   移除可缩小指纹面（当前任意网页都能探测 `chrome-extension://<id>/assets/...`）。
   未在本 ADR 一并处理，因为它是 manifest 权限面改动而非体积改动，
   且 dev 模式下的 WXT 资源服务未验证。
