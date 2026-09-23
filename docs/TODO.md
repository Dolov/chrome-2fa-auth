# TODO

> 工作状态清单。AGENTS.md 不收录此处的条目；agent 被指派开发任务时再读。

## E2E

- [ ] F7 42-44 / 50-53 自动扫描与手动截图（ADR-0007 content 侧改造的前置；
      54a/54b 可注入性门控已落地）
- [ ] F8 / F9 GitHub / NPM 真实集成（需专用 test 账号）
- [ ] F1-F6 + F10-F13 主体 spec 全绿
- [ ] F5 剩余 case：32（每秒刷新）/ 33（点击复制）/ 35（进度条颜色）
- [ ] F8 / F9 落地后补一条「8 位码账户的自动填充值正确」
- [ ] Favicon 渲染断言（`e2e/SPECS.md` Case 13 尚未写成 spec）
- [ ] 8 位码 4+4 视觉分组断言（`05-otp.spec.ts` digits=8 已验数值，未验分组视觉）

## 重构

- [ ] 收敛 `saveOTP` 与 `addOtp`（前置：F5 recovery code 保存路径的 E2E）
- [ ] content 侧 jsQR 仍内联 ~127 KB（global.js 150 KB 中 jsQR 占大头；ADR-0007 方案 B 优先，A 退路）
- [x] popup / settings 共享 chunk jsQR 拆包 → 236 KB（ADR-0007 已落地；react-dom / qrcode.react / lucide 仍在共享 chunk，未进一步拆）
- [ ] 移除 `web_accessible_resources: assets/*`（前置：content 零引用 ✅ / `style.css` 无 `url()` ✅ / 待确认 content CSS 注入路径不依赖 WAR；`manifest.json` 当前 content_scripts 未声明 css，但需排除 runtime `<style>` 注入读 assets 的可能）

## 不支持但已显式声明

- [ ] `type=hotp` / `algorithm=MD5`（独立特性）

## CI

- [ ] GitHub Actions + secrets 注入 test 账号