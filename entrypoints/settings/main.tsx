import classnames from "clsx"
import React from "react"
import ReactDOM from "react-dom/client"

import Setting from "./App"

import "~/style.css"

document.title = `${chrome.i18n.getMessage("extensionName")}`

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div
      className={classnames(
        "w-screen h-screen overflow-hidden bg-base-100"
      )}>
      <Setting />
    </div>
  </React.StrictMode>
)