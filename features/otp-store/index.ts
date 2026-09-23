/**
 * Public surface of features/otp-store
 *
 * 单一 OTP 数据源（ADR-0001）：OtpProvider 挂在 popup / settings root，
 * 9 个 mutators 是唯一写入入口，订阅者经 useOtpList / useOtpMutators 读取。
 *
 * **只导出 React 侧**。content script / background 没有 React 树，走深路径：
 * - `~/features/otp-store/store`（dataStore / saveOTP / getOTPList）
 * - `~/features/otp-store/otp-crud`（addOtp 纯函数）
 *
 * 刻意不在此 re-export，避免 popup 代码绕过 mutators 直接改 dataStore。
 */
export { OtpProvider, useOtpList, useOtpListLoaded, useOtpMutators } from "./context"
export { useUpdateCopiedCodeStatus } from "./hooks"
export type { OtpMutators, OtpContextValue } from "./context"
