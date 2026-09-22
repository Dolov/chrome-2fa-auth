import React from "react"

import Main from "~/components/home"
import { cn } from "~/utils/cn"
import { ContainerType } from "~/utils/types"

interface SpecimenProps {
  containerType: ContainerType
}

/**
 * 实时预览：把真正的 popup 放在台面上，1:1 渲染一次。
 *
 * 不带任何说明文字——预览本身就是说明书。`aria-label` 只为读屏保留 landmark 名字。
 *
 * 这是一栏**静态**内容：不吸顶、不跟随左侧滚动，滚轮在它上面也不会动。
 * 只在窗口太矮、600px 的预览确实放不下时，它才会自己滚一点，绝不裁掉预览。
 */
const Specimen: React.FC<SpecimenProps> = (props) => {
  const { containerType } = props
  const isPanel = containerType === ContainerType.DEFAULT

  return (
    <aside
      aria-label="实时预览"
      className="shrink-0 px-4 pb-16 sm:px-6 lg:w-[440px] lg:overflow-y-auto lg:border-l lg:border-base-300 lg:px-6 lg:py-6">
      <div
        className={cn("mx-auto w-fit overflow-hidden", {
          "rounded-box shadow-lg ring-1 ring-base-300": isPanel
        })}>
        <Main containerType={containerType} />
      </div>
    </aside>
  )
}

export default Specimen
