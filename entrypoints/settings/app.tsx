import React from "react"

import SettingsPage from "~/entrypoints/settings/components"
import { OtpProvider } from "~/features/otp-store"

/**
 * 设置页外壳：只挂 provider。
 *
 * 窗口框架（`flex flex-col h-screen overflow-hidden`）在 `main.tsx`，
 * 分栏与滚动权属在 `entrypoints/settings/components` —— 左侧内容区滚，右侧预览不滚。
 */
const Setting: React.FC = () => {
  return (
    <OtpProvider>
      <SettingsPage />
    </OtpProvider>
  )
}

export default Setting
