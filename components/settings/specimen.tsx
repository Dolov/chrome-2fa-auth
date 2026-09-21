import React from "react"

import Main from "~/components/home"
import { cn } from "~/utils/cn"
import { ContainerType, FaviconType } from "~/utils/types"

interface SpecimenProps {
  theme: string
  faviconType: FaviconType
  containerType: ContainerType
}

/** 与 `components/home/container/index.tsx` 的容器尺寸保持一致 */
const FRAME_SIZE: Record<ContainerType, string> = {
  [ContainerType.DEFAULT]: "350 × 600",
  [ContainerType.PHONE]: "378 × 600"
}

const Readout = ({ label, value }: { label: string; value: string }) => (
  <span className="flex gap-1.5">
    <span className="text-base-content/45">{label}</span>
    <span className="text-base-content/75">{value}</span>
  </span>
)

/**
 * 实时预览：把真正的 popup 放在台面上，1:1 渲染一次。
 *
 * 这是一栏**静态**内容——不吸顶、不跟随左侧滚动，滚轮在它上面也不会动。
 * 只在窗口太矮、600px 的预览确实放不下时，它才会自己滚一点，绝不裁掉内容。
 */
const Specimen: React.FC<SpecimenProps> = (props) => {
  const { theme, faviconType, containerType } = props
  const isPanel = containerType === ContainerType.DEFAULT

  return (
    <aside className="shrink-0 px-4 pb-16 sm:px-6 lg:w-[440px] lg:overflow-y-auto lg:border-l lg:border-base-300 lg:px-6 lg:py-6">
      <div className="mx-auto flex w-fit flex-col gap-3">
        <div className="flex items-baseline justify-between gap-6 border-t border-base-300 pt-4">
          <span className="text-[13px] font-medium">实时预览</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-base-content/45">
            live
          </span>
        </div>
        <div
          className={cn("overflow-hidden", {
            "rounded-box shadow-lg ring-1 ring-base-300": isPanel
          })}>
          <Main containerType={containerType} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
          <Readout label="theme" value={theme} />
          <Readout
            label="frame"
            value={`${containerType} · ${FRAME_SIZE[containerType]}`}
          />
          <Readout label="icon" value={faviconType} />
        </div>
      </div>
    </aside>
  )
}

export default Specimen
