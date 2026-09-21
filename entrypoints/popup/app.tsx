import React from "react"

import Main from "~/components/home"
import { OtpProvider } from "~/features/otp-store"
import { useStorage } from "~/features/ui-state/use-storage"
import { useThemeChange } from "~/features/ui-state/use-theme-change"
import { DEFAULT_SETTINGS } from "~/utils/constants"
import { StorageKey } from "~/utils/types"

const Popup = () => {
  useThemeChange()
  const [settings] = useStorage(StorageKey.SETTINGS, DEFAULT_SETTINGS)

  return (
    <OtpProvider>
      <Main containerType={settings.containerType} />
    </OtpProvider>
  )
}

export default Popup
