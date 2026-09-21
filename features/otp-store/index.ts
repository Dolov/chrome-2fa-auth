/**
 * Public surface of features/otp-store
 *
 * 单一 OTP 数据源（ADR-0001）：OtpProvider 挂在 popup / settings root，
 * 9 个 mutators 是唯一写入入口，订阅者经 useOtpList / useOtpMutators 读取。
 * content script 不在此模块内使用（没有 React 树），直接读 dataStore。
 */
export { OtpProvider, useOtpList, useOtpMutators } from "./otp-store"
export { useUpdateCopiedCodeStatus } from "./hooks"
export type { OtpMutators, OtpContextValue } from "./otp-store"
