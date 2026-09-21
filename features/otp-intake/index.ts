/**
 * Public surface of features/otp-intake
 *
 * 该模块把"QR → OtpItem"的业务路径收口，详见 docs/adr/0002。
 */
export { intakeOtp } from "./intake"
export { usePopupIntake, createPopupIntake } from "./adapters/popup"
export { createContentIntake } from "./adapters/content"
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
