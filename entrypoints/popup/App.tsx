import React from "react"

import { useStorage } from "~/utils/storage-hook"

import Main from "~/components/home"
import { DEFAULT_SETTINGS, SourceType, StorageKey } from "~/utils/constant"
import { useThemeChange } from "~/utils/hooks"
import { OtpProvider } from "~/state/otp-store"

const Popup = () => {
  useThemeChange()
  const [settings] = useStorage(StorageKey.SETTINGS, DEFAULT_SETTINGS)

  return (
    <OtpProvider>
      <Main
        source={SourceType.POPUP}
        containerType={settings.containerType}
      />
    </OtpProvider>
  )
}

export default Popup