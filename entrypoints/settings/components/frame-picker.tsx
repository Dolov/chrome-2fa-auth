import React from "react"

import OptionCard from "./option-card"

import { useSettings } from "~/features/ui-state/use-settings"
import { cn } from "~/utils/cn"
import { i18n } from "~/utils/i18n"
import { ContainerType } from "~/utils/types"

interface FrameOption {
  meta: string
  label: string
  value: ContainerType
}

/** 形态示意图：用结构线暗示「等宽面板」与「带机身的手机」，不用真实截图 */
const FrameSketch = ({ type }: { type: ContainerType }) => {
  const isPhone = type === ContainerType.PHONE

  return (
    <span
      className={cn(
        "relative flex h-[76px] w-[44px] shrink-0 flex-col gap-1 border-base-content/30 bg-base-100 p-1.5",
        {
          "rounded-field border-2": !isPhone,
          "rounded-xl border-[3px]": isPhone
        }
      )}>
      {isPhone && (
        <span className="absolute -top-[7px] left-1/2 h-1 w-4 -translate-x-1/2 rounded-b-sm bg-base-content/50" />
      )}
      <span className="h-[3px] w-3/4 rounded-full bg-base-content/25" />
      <span className="h-[3px] w-1/2 rounded-full bg-base-content/15" />
      <span className="mt-auto h-1.5 w-2/3 rounded-full bg-primary/70" />
    </span>
  )
}

const FramePicker: React.FC = () => {
  const [settings, patchSettings] = useSettings()
  const { containerType } = settings

  // 尺寸与 `entrypoints/popup/components/layout/index.tsx` 的壳保持一致
  // label 用 i18n — 在组件里调用（chrome.i18n 在 settings 页面打开时已可用）
  const options: FrameOption[] = [
    {
      meta: "350 × 600",
      label: i18n("settings_frame_standard"),
      value: ContainerType.DEFAULT
    },
    {
      meta: "378 × 600",
      label: i18n("settings_frame_phone"),
      value: ContainerType.PHONE
    }
  ]

  return (
    <div className="flex flex-wrap gap-3">
      {options.map(({ meta, label, value }) => (
        <OptionCard
          key={value}
          name="container-type"
          value={value}
          className="flex items-center gap-3"
          isSelected={value === containerType}
          onChange={(next) => void patchSettings({ containerType: next })}>
          <FrameSketch type={value} />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-medium">{label}</span>
            <span className="font-mono text-[11px] text-base-content/55">
              {meta}
            </span>
          </span>
        </OptionCard>
      ))}
    </div>
  )
}

export default FramePicker
