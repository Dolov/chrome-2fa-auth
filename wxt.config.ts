import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "wxt"

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: ".",
  outDir: ".output",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "__MSG_appName__",
    description: "__MSG_appDescription__",
    default_locale: "en",
    permissions: ["storage", "tabs", "scripting", "activeTab", "contextMenus"],
    host_permissions: ["https://*/*"],
    action: {
      default_title: "2FA Auth - 现代化双因素认证工具"
    },
    icons: {
      "16": "icon/16.png",
      "48": "icon/48.png",
      "128": "icon/128.png"
    },
    web_accessible_resources: [
      {
        resources: ["assets/*"],
        matches: ["<all_urls>"]
      }
    ]
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "~": resolve(__dirname, ".")
      }
    }
  })
})