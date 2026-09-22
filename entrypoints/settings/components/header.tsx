import React from "react"

import { i18n } from "#i18n"

/** 顶栏只放身份信息：扩展名、页面名、版本号。链接已由右键菜单覆盖，不在这里重复。 */
const Header: React.FC = () => {
  const { version } = browser.runtime.getManifest()

  return (
    <header className="shrink-0 border-b border-base-300 bg-base-100">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.22em]">
            {i18n.t("settings_header_brand")}
          </span>
          <span className="text-[13px] text-base-content/55">{i18n.t("settings_header_label")}</span>
        </div>
        <span className="font-mono text-[11px] text-base-content/45">
          v{version}
        </span>
      </div>
    </header>
  )
}

export default Header
