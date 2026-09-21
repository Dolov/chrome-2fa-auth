import React from "react"

import { useStorage } from "~/features/ui-state/use-storage"

import Main from "~/components/home"
import { DEFAULT_SETTINGS } from "~/utils/constants"
import { SourceType, StorageKey } from "~/utils/types"
import { useThemeChange } from "~/features/ui-state/use-theme-change"
import { OtpProvider } from "~/features/otp-store"

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