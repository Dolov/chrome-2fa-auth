// Auth related exports
export {
  generateOtp,
  isOtpAuthUrl,
  decodeQRCode,
  parseOtpAuthUrl,
  getRemainingTime,
  getProgressColor,
  generateOtpAuthUrl
} from "./auth"

// Storage related exports
export {
  saveOTP,
  getOTPList,
  isRecoveryCodesSaved,
  checkOtpAuthConfigExist
} from "./storage"

// UI related exports
export {
  highlightElement,
  createSelectionBox,
  startOtpMessageUpdater,
  createGradientTextContainer,
  displayRecoveryCodeSaveMessage
} from "./ui"

// Re-export constants and helpers (no React hooks here — hooks depend on @wxt-dev/storage/react
// which is not exported under content-script build conditions)
export * from "./constant"
export { default as message } from "./message"
export * from "./helpers"