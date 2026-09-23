/**
 * Public surface of features/otp-intake
 *
 * 该模块把「QR → OtpItem」的业务路径收口，详见 docs/adr/0001（写入）
 * 与 docs/adr/0002（intake 编排）。
 *
 * **不变式：本 barrel 必须保持 React-free。**
 * content script 会 import 它，一旦这里 re-export 了带 React 的模块
 * （如 adapters/popup.tsx），react + react-dom 就会被拖进每个 content
 * bundle —— bundle 体积上升，且没有 tree-shaking 兜底（项目未声明
 * package.json `sideEffects: false`，Rollup 必须保守保留模块副作用）。
 *
 * 因此 popup 侧适配器走深路径：`~/features/otp-intake/adapters/popup.tsx`
 */
export { intakeOtp } from "./intake"
export { createContentIntake } from "./adapters/content"
export { createToastNotifier, createWindowPrompt } from "./factory"
export type {
  IntakeSource,
  IntakeOutcome,
  IntakeInvalidReason,
  IntakePersistResult,
  IntakeDeps,
  IntakeAccountResolver,
  IntakeWriter,
  IntakeNotifier
} from "./intake.types"
