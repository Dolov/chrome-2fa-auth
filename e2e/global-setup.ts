/**
 * Global setup — 在所有 test 跑之前执行一次
 * 1. build WXT 扩展产物（.output/chrome-mv3）
 * 2. 安装 playwright bundled chromium（官方要求，系统 Chrome 不支持 --load-extension）
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const EXT_PATH = path.resolve(process.env.EXT_PATH ?? ".output/chrome-mv3")

function log(msg: string): void {
  console.log(`[global-setup] ${msg}`)
}

function run(cmd: string): void {
  log(`$ ${cmd}`)
  execSync(cmd, { stdio: "inherit" })
}

export default async function globalSetup(): Promise<void> {
  // 1. build 扩展产物
  if (
    !fs.existsSync(EXT_PATH) ||
    !fs.existsSync(path.join(EXT_PATH, "manifest.json"))
  ) {
    log(`build产物不存在 (${EXT_PATH})，开始 build`)
    run("pnpm exec wxt build")
  } else {
    log(`build产物已存在: ${EXT_PATH}`)
  }

  // 2. 装 playwright bundled chromium
  log("装 playwright chromium（官方要求）")
  run("pnpm exec playwright install chromium")
}
