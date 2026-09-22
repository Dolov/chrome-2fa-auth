import React from "react"

import OptionCard from "./option-card"

import Favicon from "~/components/favicons"
import { useSettings } from "~/features/ui-state/use-settings"
import { i18n } from "~/utils/i18n"
import { FaviconType } from "~/utils/types"

interface IconOption {
  hint: string
  label: string
  value: FaviconType
}

const IconPicker: React.FC = () => {
  const [settings, patchSettings] = useSettings()
  const { faviconType } = settings

  // label / hint 走 i18n；Card 预览里的 "GitHub" / "rachel.lumina" 是
  // 视觉样板数据（与语言无关），保持原样。
  const options: IconOption[] = [
    {
      hint: i18n("settings_icon_elegant_hint"),
      label: i18n("settings_icon_elegant_label"),
      value: FaviconType.ELEGANT
    },
    {
      hint: i18n("settings_icon_minimal_hint"),
      label: i18n("settings_icon_minimal_label"),
      value: FaviconType.MINIMAL
    }
  ]

  return (
    <div className="flex flex-wrap gap-3">
      {options.map(({ hint, label, value }) => (
        <OptionCard
          key={value}
          name="favicon-type"
          value={value}
          className="flex flex-col gap-3"
          isSelected={value === faviconType}
          onChange={(next) => void patchSettings({ faviconType: next })}>
          {/* 复刻列表项结构：pt-4 抵消 Favicon 大图标的 -top-4 */}
          <span className="relative block h-[92px] w-[176px] overflow-hidden rounded-box bg-base-200 px-3 pt-4">
            <span className="relative block">
              <span className="flex items-center justify-between">
                <span className="text-[12px] font-medium">GitHub</span>
                <Favicon issuer="github" variant={value} />
              </span>
              <span className="mt-0.5 block text-[11px] text-base-content/55">
                rachel.lumina
              </span>
            </span>
          </span>
          <span className="flex flex-col gap-0.5 px-0.5">
            <span className="text-[15px] font-medium">{label}</span>
            <span className="text-[11px] text-base-content/55">{hint}</span>
          </span>
        </OptionCard>
      ))}
    </div>
  )
}

export default IconPicker
