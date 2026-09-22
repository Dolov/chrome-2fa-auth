import React from "react"

interface SectionHeaderProps {
  /** 一句话说明这组设置改变什么 */
  hint?: string
  title: string
  /** mono 眉标：只放结构信息（分组名 + 条目数），不放营销词 */
  eyebrow: string
}

/**
 * 分节标题：中文标题 + mono 眉标 + 全宽细线。
 *
 * 细线是结构装置：它把相邻两组设置分开，取代原先的 collapse 面板。
 * 折叠面板会把实时预览一起藏起来，而这一页的核心正是「选了立刻看见」。
 */
const SectionHeader: React.FC<SectionHeaderProps> = (props) => {
  const { hint, title, eyebrow } = props

  return (
    <div className="mb-5 border-t border-base-300 pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-base-content/45">
          {eyebrow}
        </span>
      </div>
      {hint != null && (
        <p className="mt-1 text-[13px] text-base-content/55">{hint}</p>
      )}
    </div>
  )
}

export default SectionHeader
