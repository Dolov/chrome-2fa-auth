import { cn } from "~/utils/cn"
import { i18n } from "#i18n"
import { setDocumentLang } from "~/utils/document-lang"
import React from "react"
import ReactDOM from "react-dom/client"

import Setting from "./app"

import "~/style.css"

setDocumentLang()
document.title = `${i18n.t("settings_header_brand")} - ${i18n.t("settings_header_label")}`

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div
      className={cn(
        "flex flex-col w-full h-screen overflow-hidden bg-base-100"
      )}>
      <Setting />
    </div>
  </React.StrictMode>
)