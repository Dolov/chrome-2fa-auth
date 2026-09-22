import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "wxt"

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: ".",
  outDir: ".output",
  modules: ["@wxt-dev/module-react", "@wxt-dev/i18n/module"],
  manifest: {
    name: "__MSG_appName__",
    description: "__MSG_appDescription__",
    default_locale: "en",
    permissions: ["storage", "tabs", "scripting", "activeTab", "contextMenus"],
    host_permissions: ["https://*/*"],
    // 故意不写 action.default_title：popup 入口的 <title> 会覆盖它。
    // 省掉两者 → 工具栏提示回退到本地化的 manifest.name。
    icons: {
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