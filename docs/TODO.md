# TODO

> 工作状态清单。AGENTS.md 不收录此处的条目；agent 被指派开发任务时再读。

## E2E

- [ ] F7 42-44 / 50-55 自动扫描与手动截图（ADR-0007 content 侧改造的前置）
- [ ] F8 / F9 GitHub / NPM 真实集成（需专用 test 账号）
- [ ] F1-F6 + F10-F12 主体 spec 全绿
- [ ] F5 剩余 case：32（每秒刷新）/ 33（点击复制）/ 35（进度条颜色）
- [ ] F8 / F9 落地后补一条「8 位码账户的自动填充值正确」
- [ ] Favicon 渲染断言（`e2e/SPECS.md` Case 13 尚未写成 spec）

## 重构

- [ ] 收敛 `saveOTP` 与 `addOtp`（前置：F5 recovery code 保存路径的 E2E）
- [ ] content 侧 jsQR 仍占 382 KB（ADR-0007 方案 B 优先，A 退路）
- [ ] popup / settings 共享 chunk 236 KB 优化（react-dom + qrcode.react + lucide）
- [ ] 移除 `web_accessible_resources: assets/*`（content 侧对 `assets/` 零引用、注入 CSS 无 `url()`、自有页面加载不依赖 WAR）

## 不支持但已显式声明

- [ ] `type=hotp` / `algorithm=MD5`（独立特性）
- [ ] `OtpText` 位数分组写死 3+3，8 位码显示成 3+5（视觉细节，无测试兜底）

## CI

- [ ] GitHub Actions + secrets 注入 test 账号