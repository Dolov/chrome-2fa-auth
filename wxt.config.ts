import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import oxlintPlugin from "vite-plugin-oxlint"
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
    // 固定 Chrome 扩展 ID = CWS 上架 ID `iibjpaihhbdpicdgckhbikknalgeekph`。
    // Chrome 用该公钥的 base64(DER) SHA-256 前 16 字节派生 ID;load unpacked
    // 与 CWS 装出的扩展由此共用同一 ID,OAuth / web_accessible_resources / 用户
    // 存储全部沿用同一桶。换 key = 换 ID,务必不要改。
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs71xUGGOMHjEYQ32s4oTH687ri45yZceec/qdpRP3/lrEfhwN+7Kv2NSj1nQb1QsWVkccPDN4rGiB+x2GFJN1xq+dBJczDtYJfVQjcqycggj3IaB4mVcztWuIoKJYNRIvYf1p+9zhn1e+fTKJQm8orXBw1kDZ4tBkAgYvmBGBKwgkvJNVsTRAZpktd2gNucTQgZLCXMHhKtE0d6ZMkRWLi+4sNuBfpe6/rDL0TEelIIYpLtYj8OMDBH956nBbSNniUf+NEHLAZZMqQfK9QK00MoKgjjZ9nzpIGqk8qTm0c4EpBlbraJJj2PLfJPpJYD5eO3h/IKBi2DRUQsGLXLHbwIDAQAB",
    web_accessible_resources: [
      {
        resources: ["assets/*"],
        matches: ["<all_urls>"]
      }
    ]
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      // lint 工具不进产物（硬规则 #2 不受影响）；dev HMR 时增量检查
      oxlintPlugin({
        failOnError: false,
        failOnWarning: false,
        lintOnStart: true,
        lintOnHotUpdate: true
      })
    ],
    resolve: {
      alias: {
        "~": resolve(__dirname, ".")
      }
    }
  })
})