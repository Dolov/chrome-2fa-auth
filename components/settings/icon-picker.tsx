import React from "react"

import OptionCard from "./option-card"

import Favicon from "~/components/favicons"
import { useSettings } from "~/features/ui-state/use-settings"
import { FaviconType } from "~/utils/types"

interface IconOption {
  hint: string
  label: string
  value: FaviconType
}

const OPTIONS: IconOption[] = [
  { hint: "品牌图标放大做装饰", label: "大图标", value: FaviconType.ELEGANT },
  { hint: "统一尺寸，列表更紧凑", label: "小图标", value: FaviconType.MINIMAL }
]

const IconPicker: React.FC = () => {
  const [settings, patchSettings] = useSettings()
  const { faviconType } = settings

  return (
    <div className="flex flex-wrap gap-3">
      {OPTIONS.map(({ hint, label, value }) => (
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
