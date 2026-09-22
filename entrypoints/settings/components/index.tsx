import React from "react"

import FramePicker from "./frame-picker"
import Header from "./header"
import IconPicker from "./icon-picker"
import Preview from "./preview"
import SectionHeader from "./section-header"
import ThemeGrid from "./theme-grid"

import { useSettings } from "~/features/ui-state/use-settings"
import { i18n } from "#i18n"

/**
 * 设置页 = 一张校准台。
 *
 * 滚动权属是这个结构里唯一重要的规则：**只有左侧内容区滚动**，顶栏与右侧预览
 * 都是静态的。换主题时页面会整体换肤，如果预览跟着一起滚，「选了什么」和
 * 「变成了什么」就会错开，这一页也就失去了意义。
 *
 * 页面自身不引入任何固定配色：所有颜色都来自当前主题的 daisyUI token，
 * 因此 32 套主题（含 black 无圆角、wireframe 灰阶）都不会让这里变得不可读。
 */
const SettingsPage: React.FC = () => {
  const [settings] = useSettings()
  const { containerType } = settings

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-[1440px] min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* 唯一滚动区 */}
        <div className="flex flex-col gap-12 px-4 pt-8 pb-12 sm:px-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-10 lg:pb-16">
          <section>
            <SectionHeader
              hint={i18n.t("settings_theme_hint")}
              title={i18n.t("settings_theme_title")}
              eyebrow={i18n.t("settings_theme_eyebrow")}
            />
            <ThemeGrid />
          </section>
          <section>
            <SectionHeader
              hint={i18n.t("settings_frame_hint")}
              title={i18n.t("settings_frame_title")}
              eyebrow={i18n.t("settings_frame_eyebrow")}
            />
            <FramePicker />
          </section>
          <section>
            <SectionHeader
              hint={i18n.t("settings_icon_hint")}
              title={i18n.t("settings_icon_title")}
              eyebrow={i18n.t("settings_icon_eyebrow")}
            />
            <IconPicker />
          </section>
        </div>
        <Preview containerType={containerType} />
      </div>
    </div>
  )
}

export default SettingsPage
