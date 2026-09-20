import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import { defineConfig } from "wxt"

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: ".",
  outDir: ".output",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "2FA Auth - 现代化双因素认证工具",
    description:
      "一款专为安全与效率打造的开源免费 2FA 扩展，支持二维码自动扫描、选区扫描、表单输入与上传二维码，轻松应对多平台账户管理，界面优雅、体验出色。",
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
    plugins: [
      // otplib 依赖 Node crypto（HMAC），浏览器需 polyfill
      nodePolyfills({ include: ["crypto", "buffer", "stream", "util"] }),
      tailwindcss()
    ],
    resolve: {
      alias: {
        "~": resolve(__dirname, ".")
      }
    }
  })
})